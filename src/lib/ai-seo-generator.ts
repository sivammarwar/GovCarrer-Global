// ============================================
// AI-POWERED SEO CONTENT GENERATOR - SERVER-SIDE ONLY
// This should ONLY be used in API routes, never in browser
// ============================================

// This file exports types and helper functions that are safe for browser use
// The actual AI generation happens in API routes

export interface ExamData {
    exam_name: string;
    conducting_body: string;
    country_name: string;
    official_website: string;
    exam_date?: string | null;
    notification_date?: string | null;
  }
  
  export interface JobData {
    job_title: string;
    department_name: string;
    country_name: string;
    location?: string | null;
    vacancies?: number | null;
    salary_range?: string | null;
    qualification?: string | null;
    age_limit?: string | null;
    category?: string | null;
    application_deadline?: string | null;
  }
  
  export interface FamousExamData {
    exam_name: string;
    exam_short_name?: string | null;
    country_name: string;
    official_website: string;
  }
  
  export interface SEOContent {
    page_content: string;
    meta_title: string;
    meta_description: string;
    keywords: string;
  }
  
  // ============================================
  // CLIENT-SIDE API CALLS (SAFE FOR BROWSER)
  // ============================================
  
  export async function generateExamContentViaAPI(
    examId: string,
    examData: ExamData
  ): Promise<SEOContent> {
    const response = await fetch('/api/generate-content/exam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ examId, examData }),
    });
  
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate content');
    }
  
    return response.json();
  }
  
  export async function generateJobContentViaAPI(
    jobId: string,
    jobData: JobData
  ): Promise<SEOContent> {
    const response = await fetch('/api/generate-content/job', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobId, jobData }),
    });
  
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate content');
    }
  
    return response.json();
  }
  
  export async function generateFamousExamContentViaAPI(
    examId: string,
    examData: FamousExamData
  ): Promise<SEOContent> {
    const response = await fetch('/api/generate-content/famous-exam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ examId, examData }),
    });
  
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate content');
    }
  
    return response.json();
  }
  
  // ============================================
  // BATCH GENERATION (SAFE FOR BROWSER)
  // ============================================
  
  export async function generateBatchContent(
    type: 'exam' | 'job' | 'famous-exam',
    limit: number = 10
  ): Promise<{
    processed: number;
    successful: number;
    failed: number;
    results: Array<{ id: string; success: boolean; error?: string }>;
  }> {
    const response = await fetch('/api/generate-content/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, limit }),
    });
  
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Batch generation failed');
    }
  
    return response.json();
  }
  
  // ============================================
  // HELPER FUNCTIONS FOR KEYWORDS (BROWSER-SAFE)
  // ============================================
  
  export function generateKeywords(
    itemName: string,
    conductingBody?: string,
    country?: string
  ): string {
    const currentYear = new Date().getFullYear();
    const baseKeywords = [
      itemName,
      `${itemName} ${currentYear}`,
      `${itemName} eligibility`,
      `${itemName} syllabus`,
      `${itemName} exam pattern`,
      `${itemName} admit card`,
      `${itemName} result`,
      `${itemName} notification`,
      `${itemName} apply online`,
      `how to apply ${itemName}`,
    ];
  
    if (conductingBody) {
      baseKeywords.push(
        conductingBody,
        `${conductingBody} exam`,
        `${conductingBody} recruitment`
      );
    }
  
    if (country) {
      baseKeywords.push(
        `${country} government exam`,
        `${country} government job`,
        `${itemName} ${country}`
      );
    }
  
    return baseKeywords.filter(Boolean).join(", ");
  }
  
  export function generateMetaTitle(
    itemName: string,
    conductingBody?: string,
    country?: string
  ): string {
    const currentYear = new Date().getFullYear();
    
    if (conductingBody && country) {
      return `${itemName} ${currentYear} - Complete Guide | ${conductingBody} | ${country}`;
    } else if (conductingBody) {
      return `${itemName} ${currentYear} - Complete Guide | ${conductingBody}`;
    } else if (country) {
      return `${itemName} ${currentYear} - Complete Guide | ${country}`;
    }
    
    return `${itemName} ${currentYear} - Complete Information Guide`;
  }