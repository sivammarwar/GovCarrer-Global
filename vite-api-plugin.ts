import { Plugin } from 'vite';
import { generateSitemap } from './src/scripts/generate-sitemap';
import fs from 'fs';
import path from 'path';

// Helper to parse request body
async function parseBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

export function apiPlugin(): Plugin {
  return {
    name: 'api-routes',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Handle OPTIONS requests for CORS
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.statusCode = 200;
          res.end();
          return;
        }

        // Set CORS headers for all API requests
        if (req.url?.startsWith('/api/')) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }

        // Handle /sitemap.xml endpoint (local dev - mirrors Vercel API)
        if (req.url === '/sitemap.xml') {
          try {
            console.log('🚀 Starting sitemap generation from /sitemap.xml...');
            
            await generateSitemap();
            
            // Read the generated file
            const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
            
            if (!fs.existsSync(sitemapPath)) {
              throw new Error('Sitemap file was not created');
            }
            
            const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');

            res.setHeader('Content-Type', 'application/xml; charset=utf-8');
            res.statusCode = 200;
            res.end(sitemapContent);
            
            return;
          } catch (error) {
            console.error('❌ Sitemap generation error:', error);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }));
            
            return;
          }
        }

        // Handle /api/generate-sitemap endpoint
        if (req.url === '/api/generate-sitemap' && req.method === 'POST') {
          try {
            console.log('🚀 Starting sitemap generation from API...');
            
            await generateSitemap();
            
            // Read the generated file to get URL count and stats
            const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
            
            if (!fs.existsSync(sitemapPath)) {
              throw new Error('Sitemap file was not created');
            }
            
            const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
            const urlCount = (sitemapContent.match(/<url>/g) || []).length;
            const fileSize = Buffer.byteLength(sitemapContent, 'utf-8');

            // Parse AI content statistics from the sitemap
            const aiContentUrls = (sitemapContent.match(/<priority>0\.95<\/priority>/g) || []).length;
            const regularUrls = urlCount - aiContentUrls;

            console.log('✅ Sitemap generated successfully!');
            console.log(`   Total URLs: ${urlCount}`);
            console.log(`   - With AI content: ${aiContentUrls}`);
            console.log(`   - Regular content: ${regularUrls}`);

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({
              success: true,
              totalUrls: urlCount,
              aiContentUrls: aiContentUrls,
              regularUrls: regularUrls,
              fileSize: fileSize,
              timestamp: new Date().toISOString(),
              message: 'Sitemap generated successfully',
              stats: {
                aiContentPercentage: Math.round((aiContentUrls / urlCount) * 100),
                remainingToGenerate: regularUrls,
              }
            }));
            
            return;
          } catch (error) {
            console.error('❌ Sitemap generation error:', error);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            }));
            
            return;
          }
        }

        // Handle /api/generate-content/batch endpoint (development only - redirect to Vercel in production)
        if (req.url === '/api/generate-content/batch' && req.method === 'POST') {
          try {
            console.log('⚠️  AI Content Generation API called in development mode');
            console.log('   This endpoint should be deployed to Vercel for production use.');
            console.log('   Returning mock response for development...');

            const body = await parseBody(req);
            const { type, limit = 10 } = body;

            // Return a helpful development response
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({
              processed: 0,
              successful: 0,
              failed: 0,
              results: [],
              message: `[DEV MODE] AI content generation for "${type}" is not available in development. Deploy to Vercel to use this feature.`,
              devNote: 'This endpoint requires Claude AI API which only works in production/Vercel environment.',
            }));
            
            return;
          } catch (error) {
            console.error('❌ API error:', error);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }));
            
            return;
          }
        }

        // Handle /api/generate-content/exam endpoint (development only)
        if (req.url === '/api/generate-content/exam' && req.method === 'POST') {
          try {
            console.log('⚠️  Single exam generation called in development mode');
            
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({
              page_content: '<p>Development mode - AI content generation not available</p>',
              meta_title: 'Development Mode',
              meta_description: 'Deploy to Vercel to generate AI content',
              keywords: 'development',
              success: false,
              message: 'AI content generation only works in production (Vercel)',
            }));
            
            return;
          } catch (error) {
            console.error('❌ API error:', error);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }));
            
            return;
          }
        }

        // Handle /api/generate-content/job endpoint (development only)
        if (req.url === '/api/generate-content/job' && req.method === 'POST') {
          try {
            console.log('⚠️  Job content generation called in development mode');
            
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({
              page_content: '<p>Development mode - AI content generation not available</p>',
              meta_title: 'Development Mode',
              meta_description: 'Deploy to Vercel to generate AI content',
              keywords: 'development',
              success: false,
              message: 'AI content generation only works in production (Vercel)',
            }));
            
            return;
          } catch (error) {
            console.error('❌ API error:', error);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }));
            
            return;
          }
        }

        // Handle /api/generate-content/famous-exam endpoint (development only)
        if (req.url === '/api/generate-content/famous-exam' && req.method === 'POST') {
          try {
            console.log('⚠️  Famous exam content generation called in development mode');
            
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({
              page_content: '<p>Development mode - AI content generation not available</p>',
              meta_title: 'Development Mode',
              meta_description: 'Deploy to Vercel to generate AI content',
              keywords: 'development',
              success: false,
              message: 'AI content generation only works in production (Vercel)',
            }));
            
            return;
          } catch (error) {
            console.error('❌ API error:', error);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }));
            
            return;
          }
        }
        
        // Pass through to next middleware
        next();
      });
    },
  };
}