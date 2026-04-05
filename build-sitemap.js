#!/usr/bin/env node

/**
 * This script runs during the build process to generate the sitemap
 * It's called from package.json's "postbuild" script
 */

import { generateSitemap } from './src/scripts/generate-sitemap.js';

console.log('🔨 Build Hook: Generating sitemap...');

generateSitemap()
  .then(() => {
    console.log('✅ Build Hook: Sitemap generation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Build Hook: Sitemap generation failed:', error);
    // Don't fail the build, just log the error
    process.exit(0);
  });