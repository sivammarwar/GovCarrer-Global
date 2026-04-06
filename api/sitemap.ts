import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const baseUrl = 'https://www.kvresults.com';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      error: 'Server configuration error: Missing Supabase credentials',
      details: { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey },
    });
  }

  try {
    console.log('🚀 Starting sitemap generation...');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const [sectionsData, itemsData, famousExamsData] = await Promise.all([
      supabase
        .from('dynamic_sections')
        .select('slug, updated_at, is_active, show_in_tabs')
        .eq('is_active', true),
      supabase
        .from('dynamic_section_items')
        .select('slug, updated_at, ai_content_generated, section_id, sections:section_id(slug)')
        .eq('is_active', true)
        .not('slug', 'is', null),
      supabase
        .from('footer_famous_exams')
        .select('slug, updated_at')
        .eq('is_active', true),
    ]);

    if (sectionsData.error) throw new Error(`Failed to fetch sections: ${sectionsData.error.message}`);
    if (itemsData.error) throw new Error(`Failed to fetch items: ${itemsData.error.message}`);
    if (famousExamsData.error) throw new Error(`Failed to fetch famous exams: ${famousExamsData.error.message}`);

    const sections = sectionsData.data || [];
    const items = itemsData.data || [];
    const famousExams = famousExamsData.data || [];

    console.log('✅ Data fetched:', {
      sections: sections.length,
      items: items.length,
      famousExams: famousExams.length,
    });

    const escapeXml = (str: string) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n';
    xml += '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n';
    xml += '        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n';

    let totalUrls = 0;
    let aiContentUrls = 0;

    const addUrl = (loc: string, lastmod: string | null, changefreq: string, priority: string) => {
      totalUrls++;
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(loc)}</loc>\n`;
      if (lastmod) xml += `    <lastmod>${lastmod.split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>${changefreq}</changefreq>\n`;
      xml += `    <priority>${priority}</priority>\n`;
      xml += `  </url>\n`;
    };

    // Static pages
    addUrl(`${baseUrl}/`, null, 'daily', '1.0');
    addUrl(`${baseUrl}/about`, null, 'monthly', '0.8');
    addUrl(`${baseUrl}/contact`, null, 'monthly', '0.8');
    addUrl(`${baseUrl}/privacy-policy`, null, 'monthly', '0.7');
    addUrl(`${baseUrl}/terms-of-service`, null, 'monthly', '0.7');

    // Dynamic section item URLs
    items?.forEach((item: any) => {
      if (item.slug && item.sections?.slug) {
        const priority = item.ai_content_generated ? '0.95' : '0.8';
        if (item.ai_content_generated) aiContentUrls++;
        addUrl(`${baseUrl}/section/${item.sections.slug}/${item.slug}`, item.updated_at, 'weekly', priority);
      }
    });

    // Section listing pages
    sections?.forEach((section: any) => {
      if (section.show_in_tabs && section.slug) {
        addUrl(`${baseUrl}/${section.slug}`, section.updated_at, 'daily', '0.9');
      }
    });

    // Famous exam detail pages
    famousExams?.forEach((exam: any) => {
      if (exam.slug) {
        addUrl(`${baseUrl}/famous-exams/${exam.slug}`, exam.updated_at, 'weekly', '0.80');
      }
    });

    xml += '</urlset>';

    console.log(`✅ Sitemap done — ${totalUrls} URLs (${aiContentUrls} with AI content, ${famousExams.length} famous exams)`);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(xml);

  } catch (error) {
    console.error('❌ Sitemap generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      error: errorMessage,
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
    });
  }
}

export const config = {
  maxDuration: 60,
};
