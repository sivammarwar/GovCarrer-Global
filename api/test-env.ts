// api/test-env.ts
// Simple endpoint to test if environment variables are set
// DELETE THIS FILE after testing!

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Check environment variables
  const envCheck = {
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || 'unknown',
    checks: {
      ANTHROPIC_API_KEY: {
        exists: !!process.env.ANTHROPIC_API_KEY,
        prefix: process.env.ANTHROPIC_API_KEY 
          ? process.env.ANTHROPIC_API_KEY.substring(0, 10) + '...' 
          : 'NOT SET',
        length: process.env.ANTHROPIC_API_KEY?.length || 0
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        prefix: process.env.SUPABASE_SERVICE_ROLE_KEY 
          ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + '...' 
          : 'NOT SET',
        length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
      },
      NEXT_PUBLIC_SUPABASE_URL: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        value: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'
      },
      VITE_SUPABASE_URL: {
        exists: !!process.env.VITE_SUPABASE_URL,
        value: process.env.VITE_SUPABASE_URL || 'NOT SET'
      }
    },
    summary: {
      allSet: !!(
        process.env.ANTHROPIC_API_KEY &&
        process.env.SUPABASE_SERVICE_ROLE_KEY &&
        (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)
      ),
      missing: []
    }
  };

  // List missing variables
  if (!process.env.ANTHROPIC_API_KEY) {
    envCheck.summary.missing.push('ANTHROPIC_API_KEY');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    envCheck.summary.missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
    envCheck.summary.missing.push('NEXT_PUBLIC_SUPABASE_URL or VITE_SUPABASE_URL');
  }

  return res.status(200).json(envCheck);
}

export const config = {
  maxDuration: 10,
};