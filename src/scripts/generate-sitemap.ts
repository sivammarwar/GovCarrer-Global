import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

// Use the correct environment variable names from your .env file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const siteUrl = process.env.VITE_SITE_URL || 'https://kvresults.com';

console.log('🔧 Environment check:');
console.log('   Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('   Supabase Key:', supabaseKey ? '✅ Set' : '❌ Missing');
console.log('   Site URL:', siteUrl);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials are missing. Please check your .env file.');
  console.error('   Make sure you have:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL or VITE_SUPABASE_URL');
  console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

interface Stats {
  totalUrls: number;
  aiContentUrls: number;
  regularUrls: number;
  aiContentPercentage: number;
  remainingToGenerate: number;
}

export async function generateSitemap(): Promise<Stats> {
  const urls: SitemapUrl[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Add static pages with high priority
  const staticPages = [
    { path: '', priority: '1.0', changefreq: 'daily' },
    { path: '/about', priority: '0.8', changefreq: 'monthly' },
    { path: '/contact', priority: '0.8', changefreq: 'monthly' },
    { path: '/privacy-policy', priority: '0.7', changefreq: 'monthly' },
    { path: '/terms-of-service', priority: '0.7', changefreq: 'monthly' },
  ];

  staticPages.forEach((page) => {
    urls.push({
      loc: `${siteUrl}${page.path}`,
      lastmod: today,
      changefreq: page.changefreq,
      priority: page.priority,
    });
  });

  let totalAIContent = 0;
  let totalRegular = 0;

  // ============================================
  // FETCH EXAM LISTINGS WITH AI CONTENT
  // ============================================
  console.log('\n📋 Fetching exam listings...');
  const { data: exams, error: examsError } = await supabase
    .from('exam_listings')
    .select('slug, updated_at, content_generated_at, ai_content_generated, exam_name, conducting_body')
    .eq('is_active', true)
    .not('slug', 'is', null)
    .order('created_at', { ascending: false });

  if (examsError) {
    console.error('❌ Error fetching exams:', examsError);
  } else if (exams) {
    exams.forEach((exam) => {
      const hasAIContent = exam.ai_content_generated && exam.content_generated_at;
      const lastModDate = exam.content_generated_at || exam.updated_at;
      
      if (exam.slug) {
        urls.push({
          loc: `${siteUrl}/exams/${exam.slug}`,
          lastmod: new Date(lastModDate).toISOString().split('T')[0],
          changefreq: hasAIContent ? 'monthly' : 'weekly',
          priority: hasAIContent ? '0.95' : '0.85',
        });

        if (hasAIContent) {
          totalAIContent++;
        } else {
          totalRegular++;
        }
      }
    });
    console.log(`   ✅ Found ${exams.length} active exam listings`);
    console.log(`   🤖 With AI content: ${exams.filter(e => e.ai_content_generated).length}`);
    console.log(`   📝 Without AI content: ${exams.filter(e => !e.ai_content_generated).length}`);
  }

  // ============================================
  // FETCH JOB LISTINGS WITH AI CONTENT
  // ============================================
  console.log('\n📋 Fetching job listings...');
  const { data: jobs, error: jobsError } = await supabase
    .from('job_listings')
    .select('slug, updated_at, content_generated_at, ai_content_generated, job_title, department_name')
    .eq('is_active', true)
    .not('slug', 'is', null)
    .order('created_at', { ascending: false });

  if (jobsError) {
    console.error('❌ Error fetching jobs:', jobsError);
  } else if (jobs) {
    jobs.forEach((job) => {
      const hasAIContent = job.ai_content_generated && job.content_generated_at;
      const lastModDate = job.content_generated_at || job.updated_at;
      
      if (job.slug) {
        urls.push({
          loc: `${siteUrl}/jobs/${job.slug}`,
          lastmod: new Date(lastModDate).toISOString().split('T')[0],
          changefreq: hasAIContent ? 'monthly' : 'weekly',
          priority: hasAIContent ? '0.95' : '0.85',
        });

        if (hasAIContent) {
          totalAIContent++;
        } else {
          totalRegular++;
        }
      }
    });
    console.log(`   ✅ Found ${jobs.length} active job listings`);
    console.log(`   🤖 With AI content: ${jobs.filter(j => j.ai_content_generated).length}`);
    console.log(`   📝 Without AI content: ${jobs.filter(j => !j.ai_content_generated).length}`);
  }

  // ============================================
  // FETCH RESULTS
  // ============================================
  console.log('\n📋 Fetching results...');
  const { data: results, error: resultsError } = await supabase
    .from('results')
    .select('slug, updated_at, content_generated_at, ai_content_generated, exam_name')
    .eq('is_active', true)
    .not('slug', 'is', null)
    .order('created_at', { ascending: false });

  if (resultsError) {
    console.error('❌ Error fetching results:', resultsError);
  } else if (results) {
    results.forEach((result) => {
      const hasAIContent = result.ai_content_generated && result.content_generated_at;
      const lastModDate = result.content_generated_at || result.updated_at;
      
      if (result.slug) {
        urls.push({
          loc: `${siteUrl}/results/${result.slug}`,
          lastmod: new Date(lastModDate).toISOString().split('T')[0],
          changefreq: hasAIContent ? 'monthly' : 'weekly',
          priority: hasAIContent ? '0.95' : '0.85',
        });

        if (hasAIContent) {
          totalAIContent++;
        } else {
          totalRegular++;
        }
      }
    });
    console.log(`   ✅ Found ${results.length} active results`);
    console.log(`   🤖 With AI content: ${results.filter(r => r.ai_content_generated).length}`);
    console.log(`   📝 Without AI content: ${results.filter(r => !r.ai_content_generated).length}`);
  }

  // ============================================
  // FETCH ANSWER KEYS
  // ============================================
  console.log('\n📋 Fetching answer keys...');
  const { data: answerKeys, error: answerKeysError } = await supabase
    .from('answer_keys')
    .select('slug, updated_at, content_generated_at, ai_content_generated, exam_name')
    .eq('is_active', true)
    .not('slug', 'is', null)
    .order('created_at', { ascending: false });

  if (answerKeysError) {
    console.error('❌ Error fetching answer keys:', answerKeysError);
  } else if (answerKeys) {
    answerKeys.forEach((key) => {
      const hasAIContent = key.ai_content_generated && key.content_generated_at;
      const lastModDate = key.content_generated_at || key.updated_at;
      
      if (key.slug) {
        urls.push({
          loc: `${siteUrl}/answer-keys/${key.slug}`,
          lastmod: new Date(lastModDate).toISOString().split('T')[0],
          changefreq: hasAIContent ? 'monthly' : 'weekly',
          priority: hasAIContent ? '0.95' : '0.85',
        });

        if (hasAIContent) {
          totalAIContent++;
        } else {
          totalRegular++;
        }
      }
    });
    console.log(`   ✅ Found ${answerKeys.length} active answer keys`);
    console.log(`   🤖 With AI content: ${answerKeys.filter(ak => ak.ai_content_generated).length}`);
    console.log(`   📝 Without AI content: ${answerKeys.filter(ak => !ak.ai_content_generated).length}`);
  }

  // ============================================
  // FETCH FAMOUS EXAMS
  // ============================================
  console.log('\n📋 Fetching famous exams...');
  const { data: famousExams, error: famousExamsError } = await supabase
    .from('footer_famous_exams')
    .select('slug, updated_at, content_generated_at, ai_content_generated, exam_name, exam_short_name')
    .eq('is_active', true)
    .not('slug', 'is', null)
    .order('display_order', { ascending: true });

  if (famousExamsError) {
    console.error('❌ Error fetching famous exams:', famousExamsError);
  } else if (famousExams) {
    famousExams.forEach((exam) => {
      const hasAIContent = exam.ai_content_generated && exam.content_generated_at;
      const lastModDate = exam.content_generated_at || exam.updated_at;
      
      if (exam.slug) {
        urls.push({
          loc: `${siteUrl}/famous-exams/${exam.slug}`,
          lastmod: new Date(lastModDate).toISOString().split('T')[0],
          changefreq: hasAIContent ? 'monthly' : 'weekly',
          priority: hasAIContent ? '0.90' : '0.80',
        });

        if (hasAIContent) {
          totalAIContent++;
        } else {
          totalRegular++;
        }
      }
    });
    console.log(`   ✅ Found ${famousExams.length} active famous exams`);
    console.log(`   🤖 With AI content: ${famousExams.filter(fe => fe.ai_content_generated).length}`);
    console.log(`   📝 Without AI content: ${famousExams.filter(fe => !fe.ai_content_generated).length}`);
  }

  // ============================================
  // GENERATE XML SITEMAP
  // ============================================
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  // Write to public folder
  const publicPath = join(process.cwd(), 'public', 'sitemap.xml');
  
  try {
    writeFileSync(publicPath, xml, 'utf-8');
    console.log('\n✅ Sitemap written successfully!');
  } catch (error) {
    console.error('❌ Error writing sitemap file:', error);
    throw error;
  }

  // Calculate statistics
  const totalDynamic = urls.length - staticPages.length;
  const aiContentPercentage = totalDynamic > 0 
    ? Math.round((totalAIContent / totalDynamic) * 100) 
    : 0;

  const stats: Stats = {
    totalUrls: urls.length,
    aiContentUrls: totalAIContent,
    regularUrls: totalRegular,
    aiContentPercentage,
    remainingToGenerate: totalRegular,
  };

  // ============================================
  // SUMMARY REPORT
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 SITEMAP GENERATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`\n📈 Statistics:`);
  console.log(`   Total URLs: ${urls.length}`);
  console.log(`   - Static pages: ${staticPages.length}`);
  console.log(`   - Dynamic pages: ${totalDynamic}`);
  console.log(`\n🤖 AI Content Status:`);
  console.log(`   - Pages with AI content: ${totalAIContent} (${aiContentPercentage}%)`);
  console.log(`   - Pages without AI content: ${totalRegular}`);
  console.log(`\n📁 File Location:`);
  console.log(`   ${publicPath}`);
  console.log(`\n🌐 Sitemap URL:`);
  console.log(`   ${siteUrl}/sitemap.xml`);
  console.log(`\n📤 Next Steps:`);
  console.log(`   1. Verify sitemap.xml in your /public folder`);
  console.log(`   2. Submit to Google Search Console:`);
  console.log(`      https://search.google.com/search-console`);
  console.log(`   3. Use this URL: ${siteUrl}/sitemap.xml`);
  console.log(`   4. Monitor indexing status in Search Console`);
  
  if (totalRegular > 0) {
    console.log(`\n⚠️  Recommendation:`);
    console.log(`   You have ${totalRegular} pages without AI content.`);
    console.log(`   Generate AI content for better SEO performance!`);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');

  return stats;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSitemap()
    .then((stats) => {
      console.log('✅ Sitemap generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error generating sitemap:', error);
      process.exit(1);
    });
}