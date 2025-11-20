#!/usr/bin/env tsx

/**
 * Metadata Validation Script
 * 
 * This script validates that all required SEO assets and metadata are in place.
 * Run with: tsx scripts/validate-metadata.ts
 */

import { existsSync } from 'fs';
import { join } from 'path';

const publicDir = join(process.cwd(), 'public');
const brandDir = join(publicDir, 'brand');

interface ValidationResult {
  name: string;
  path: string;
  exists: boolean;
  required: boolean;
  description: string;
}

const requiredAssets: Omit<ValidationResult, 'exists'>[] = [
  // Critical assets
  {
    name: 'OG Image',
    path: join(brandDir, 'briki-og-image.png'),
    required: true,
    description: '1200x630px preview image for social media',
  },
  {
    name: 'Favicon ICO',
    path: join(publicDir, 'favicon.ico'),
    required: true,
    description: 'Legacy favicon',
  },
  {
    name: 'Favicon 16x16',
    path: join(publicDir, 'favicon-16x16.png'),
    required: true,
    description: 'Small favicon for bookmarks',
  },
  {
    name: 'Favicon 32x32',
    path: join(publicDir, 'favicon-32x32.png'),
    required: true,
    description: 'Standard favicon',
  },
  {
    name: 'Apple Touch Icon',
    path: join(publicDir, 'apple-touch-icon.png'),
    required: true,
    description: '180x180px iOS home screen icon',
  },
  {
    name: 'Web Manifest',
    path: join(publicDir, 'site.webmanifest'),
    required: true,
    description: 'PWA manifest file',
  },
  {
    name: 'Robots.txt',
    path: join(publicDir, 'robots.txt'),
    required: true,
    description: 'Search engine crawler instructions',
  },
  
  // Optional but recommended
  {
    name: 'Android Chrome 192',
    path: join(publicDir, 'android-chrome-192x192.png'),
    required: false,
    description: '192x192px Android icon',
  },
  {
    name: 'Android Chrome 512',
    path: join(publicDir, 'android-chrome-512x512.png'),
    required: false,
    description: '512x512px Android icon',
  },
  {
    name: 'Safari Pinned Tab',
    path: join(publicDir, 'safari-pinned-tab.svg'),
    required: false,
    description: 'Monochrome SVG for Safari',
  },
];

const envVariables = [
  {
    name: 'NEXT_PUBLIC_SITE_URL',
    required: true,
    description: 'Production URL (e.g., https://briki.com)',
  },
  {
    name: 'NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION',
    required: false,
    description: 'Google Search Console verification code',
  },
];

function validateAssets(): ValidationResult[] {
  return requiredAssets.map((asset) => ({
    ...asset,
    exists: existsSync(asset.path),
  }));
}

function validateEnvironment() {
  return envVariables.map((envVar) => ({
    ...envVar,
    exists: !!process.env[envVar.name],
  }));
}

function printResults() {
  console.log('\n🔍 Briki SEO Metadata Validation\n');
  console.log('=' .repeat(80));
  
  // Assets validation
  console.log('\n📦 Asset Files:\n');
  const assetResults = validateAssets();
  const requiredAssets = assetResults.filter(r => r.required);
  const optionalAssets = assetResults.filter(r => !r.required);
  
  // Required assets
  console.log('Required Assets:');
  requiredAssets.forEach((result) => {
    const icon = result.exists ? '✅' : '❌';
    console.log(`${icon} ${result.name.padEnd(20)} - ${result.description}`);
    if (!result.exists) {
      console.log(`   Missing: ${result.path}`);
    }
  });
  
  // Optional assets
  console.log('\nOptional Assets:');
  optionalAssets.forEach((result) => {
    const icon = result.exists ? '✅' : '⚠️ ';
    console.log(`${icon} ${result.name.padEnd(20)} - ${result.description}`);
  });
  
  // Environment variables
  console.log('\n🔐 Environment Variables:\n');
  const envResults = validateEnvironment();
  envResults.forEach((result) => {
    const icon = result.exists ? '✅' : result.required ? '❌' : '⚠️ ';
    const status = result.exists ? 'Set' : 'Not set';
    console.log(`${icon} ${result.name.padEnd(40)} - ${status}`);
    console.log(`   ${result.description}`);
  });
  
  // Summary
  console.log('\n' + '=' .repeat(80));
  console.log('\n📊 Summary:\n');
  
  const missingRequired = assetResults.filter(r => r.required && !r.exists);
  const missingOptional = assetResults.filter(r => !r.required && !r.exists);
  const missingEnv = envResults.filter(r => r.required && !r.exists);
  
  const totalRequired = requiredAssets.length + envResults.filter(r => r.required).length;
  const totalPassing = totalRequired - (missingRequired.length + missingEnv.length);
  const percentage = Math.round((totalPassing / totalRequired) * 100);
  
  console.log(`Required items: ${totalPassing}/${totalRequired} (${percentage}%)`);
  console.log(`Missing required assets: ${missingRequired.length}`);
  console.log(`Missing required env vars: ${missingEnv.length}`);
  console.log(`Missing optional assets: ${missingOptional.length}`);
  
  if (missingRequired.length > 0 || missingEnv.length > 0) {
    console.log('\n❌ Validation FAILED - Missing required items');
    console.log('\n📚 See docs/SEO_ASSETS_GUIDE.md for instructions on creating missing assets.');
    process.exit(1);
  } else if (missingOptional.length > 0) {
    console.log('\n⚠️  Validation PASSED with warnings - Some optional items missing');
    console.log('\n📚 See docs/SEO_ASSETS_GUIDE.md for instructions on creating optional assets.');
  } else {
    console.log('\n✅ Validation PASSED - All items present!');
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('\n🧪 Next Steps:\n');
  console.log('1. Test social previews:');
  console.log('   - Facebook: https://developers.facebook.com/tools/debug/');
  console.log('   - Twitter: https://cards-dev.twitter.com/validator');
  console.log('   - LinkedIn: https://www.linkedin.com/post-inspector/');
  console.log('\n2. Validate structured data:');
  console.log('   - Google: https://search.google.com/test/rich-results');
  console.log('\n3. Run Lighthouse audit:');
  console.log('   - npx lighthouse https://your-site.com --view');
  console.log('   - Target SEO score: ≥95');
  console.log('\n');
}

// Run validation
printResults();
