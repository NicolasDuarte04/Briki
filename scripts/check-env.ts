#!/usr/bin/env tsx
/**
 * Quick Environment Check Script
 * 
 * Fast-failing script that validates all required environment variables.
 * Exits with code 1 if any required variable is missing.
 * 
 * Usage: pnpm run check:env
 */

import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env files (same order as Next.js)
config({ path: '.env.local' });
config({ path: '.env' });

// Define required environment variables
const requiredPublicVars = {
  NEXT_PUBLIC_SUPABASE_URL: 'Must be a valid Supabase URL',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'Must be a valid Supabase anon key',
} as const;

const requiredServerVars = {
  SUPABASE_SERVICE_ROLE_KEY: 'Must be a valid Supabase service role key',
  OPENAI_API_KEY: 'Must be a valid OpenAI API key',
} as const;

let hasErrors = false;
const errors: string[] = [];

// Check public environment variables
console.log('🔍 Checking public environment variables...');
for (const [key, description] of Object.entries(requiredPublicVars)) {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    hasErrors = true;
    errors.push(`❌ Missing ${key}: ${description}`);
  } else {
    console.log(`✅ ${key}: Set`);
  }
}

// Check server environment variables
console.log('\n🔍 Checking server environment variables...');
for (const [key, description] of Object.entries(requiredServerVars)) {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    hasErrors = true;
    errors.push(`❌ Missing ${key}: ${description}`);
  } else {
    console.log(`✅ ${key}: Set`);
  }
}

// Report results
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('\n❌ Environment check FAILED\n');
  errors.forEach(error => console.error(error));
  console.error('\nPlease set the missing environment variables in your .env.local file.');
  console.error('See .env.example for reference.\n');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are set!');
  console.log('Environment check PASSED\n');
  process.exit(0);
}

