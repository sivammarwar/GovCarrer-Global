import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    })
  }

  try {
    const { type, country, examName } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Google API Key from environment
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY')
    if (!googleApiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is not set')
    }

    // Call Google Gemini API to scrape and structure data
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: type === 'exam' 
              ? `Search the web for information about "${examName}" government exam in ${country}. Find and return ONLY a JSON object with this exact structure:
{
  "exam_name": "exact exam name",
  "conducting_body": "organization conducting the exam",
  "exam_date": "exam date or date range",
  "notification_date": "YYYY-MM-DD",
  "official_website": "official website URL",
  "admit_card_link": "admit card download URL if available",
  "result_link": "result checking URL if available",
  "syllabus_link": "syllabus URL if available",
  "notices": [
    {"notice_text": "notice description", "notice_link": "URL"}
  ],
  "answer_key_link": "answer key URL if available",
  "result_details": {
    "result_link": "URL",
    "release_date": "YYYY-MM-DD"
  }
}

Return ONLY valid JSON, no other text. If you cannot find specific information, use null or empty string. Make sure the JSON is properly formatted.`
              : `Search the web for government jobs in ${country}. Find and return ONLY a JSON array of jobs with this structure:
[
  {
    "job_title": "job title",
    "department_name": "department",
    "application_deadline": "YYYY-MM-DD",
    "official_link": "application URL",
    "job_description": "brief description",
    "qualifications": "required qualifications",
    "category": "category like Technology, Healthcare, etc"
  }
]

Return ONLY valid JSON array, no other text. Find at least 5 current job openings. If you cannot find specific information, use null or empty string.`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 4000
        }
      })
    })

    const aiData = await geminiResponse.json()
    
    if (!aiData.candidates || aiData.candidates.length === 0) {
      throw new Error('No response from Gemini API: ' + JSON.stringify(aiData))
    }
    
    const responseText = aiData.candidates[0].content.parts[0].text
    
    // Clean the response text to get only JSON
    let jsonString = responseText.trim()
    
    // Remove markdown code blocks if present
    jsonString = jsonString.replace(/```json\n?|\n?```/g, '')
    jsonString = jsonString.replace(/```\n?|\n?```/g, '')
    
    // Parse JSON
    let scrapedData
    try {
      scrapedData = JSON.parse(jsonString)
    } catch (parseError) {
      // Try to extract JSON from text if it's wrapped in other text
      const jsonMatch = jsonString.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
      if (jsonMatch) {
        scrapedData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error(`Failed to parse JSON from Gemini response: ${jsonString}`)
      }
    }

    // Get country_id
    const { data: countryData, error: countryError } = await supabaseClient
      .from('countries')
      .select('id')
      .eq('country_name', country)
      .single()

    if (countryError || !countryData) {
      throw new Error(`Country "${country}" not found in database`)
    }

    // Insert data into database
    if (type === 'exam') {
      // Insert exam
      const { data: examData, error: examError } = await supabaseClient
        .from('exam_listings')
        .insert({
          country_id: countryData.id,
          exam_name: scrapedData.exam_name || examName,
          conducting_body: scrapedData.conducting_body || '',
          exam_date: scrapedData.exam_date || '',
          notification_date: scrapedData.notification_date || null,
          official_website: scrapedData.official_website || '',
          admit_card_link: scrapedData.admit_card_link || null,
          result_link: scrapedData.result_link || null,
          syllabus_link: scrapedData.syllabus_link || null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (examError) {
        console.error('Error inserting exam:', examError)
        throw examError
      }

      // Insert notices if available
      if (scrapedData.notices && Array.isArray(scrapedData.notices) && scrapedData.notices.length > 0) {
        const noticesToInsert = scrapedData.notices.map(notice => ({
          country_id: countryData.id,
          exam_id: examData.id,
          notice_text: notice.notice_text || '',
          notice_link: notice.notice_link || '',
          is_active: true,
          is_pinned: false,
          created_at: new Date().toISOString()
        }))

        await supabaseClient
          .from('notices')
          .insert(noticesToInsert)
      }

      // Insert answer key if available
      if (scrapedData.answer_key_link) {
        await supabaseClient
          .from('answer_keys')
          .insert({
            country_id: countryData.id,
            exam_id: examData.id,
            exam_name: scrapedData.exam_name || examName,
            answer_key_link: scrapedData.answer_key_link,
            is_active: true,
            created_at: new Date().toISOString()
          })
      }

      // Insert result if available
      if (scrapedData.result_details && scrapedData.result_details.result_link) {
        await supabaseClient
          .from('results')
          .insert({
            country_id: countryData.id,
            exam_id: examData.id,
            exam_name: scrapedData.exam_name || examName,
            conducting_body: scrapedData.conducting_body || '',
            result_link: scrapedData.result_details.result_link,
            release_date: scrapedData.result_details.release_date || null,
            is_active: true,
            created_at: new Date().toISOString()
          })
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Successfully scraped and added "${scrapedData.exam_name || examName}"`,
        data: examData 
      }), {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 200
      })
    } else {
      // Insert jobs
      if (!Array.isArray(scrapedData)) {
        scrapedData = [scrapedData]
      }

      const jobsToInsert = scrapedData.map(job => ({
        country_id: countryData.id,
        job_title: job.job_title || '',
        department_name: job.department_name || '',
        application_deadline: job.application_deadline || null,
        official_link: job.official_link || '',
        job_description: job.job_description || '',
        qualifications: job.qualifications || '',
        category: job.category || 'General',
        is_active: true,
        posted_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data, error } = await supabaseClient
        .from('job_listings')
        .insert(jobsToInsert)
        .select()

      if (error) {
        console.error('Error inserting jobs:', error)
        throw error
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Successfully scraped and added ${data.length} jobs for ${country}`,
        data 
      }), {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 200
      })
    }

  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})