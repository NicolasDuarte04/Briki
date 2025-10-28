/**
 * Central configuration for environment variables with runtime validation.
 * This ensures all required environment variables are present and valid.
 * Uses Zod for type-safe schema validation.
 */

import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Public environment variables schema (NEXT_PUBLIC_*)
 * These are safe to expose to the client bundle.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_SITE_URL: z.string().url('NEXT_PUBLIC_SITE_URL must be a valid URL').default('http://localhost:3000'),
  NEXT_PUBLIC_ENABLE_WORKSPACE_SHELL: z.enum(['true', 'false', '1', '0']).optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
});

/**
 * Server-only environment variables schema
 * These must NEVER be exposed to the client.
 */
const serverEnvSchema = z.object({
  // Supabase
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  
  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_MAX_TOKENS: z.string().regex(/^\d+$/).transform(Number).default('4000'),
  
  // OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Stripe (optional - only required if enabling payments)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_STARTER_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_STARTER_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_TEAM_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_TEAM_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_ENTERPRISE_YEARLY_PRICE_ID: z.string().optional(),
  
  // Runtime
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Vercel
  VERCEL_URL: z.string().optional(),
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
});

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates and parses public environment variables.
 * This runs on both client and server.
 */
function validatePublicEnv() {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    NEXT_PUBLIC_ENABLE_WORKSPACE_SHELL: process.env.NEXT_PUBLIC_ENABLE_WORKSPACE_SHELL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  });

  if (!parsed.success) {
    console.error('❌ Invalid public environment variables:');
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    throw new Error('Invalid public environment variables. Check the logs above.');
  }

  return parsed.data;
}

/**
 * Validates and parses server-only environment variables.
 * This runs ONLY on the server.
 */
function validateServerEnv() {
  // Ensure we're on the server
  if (typeof window !== 'undefined') {
    throw new Error('validateServerEnv() should only be called on the server');
  }

  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    OPENAI_MAX_TOKENS: process.env.OPENAI_MAX_TOKENS || '4000',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_STARTER_MONTHLY_PRICE_ID: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    STRIPE_STARTER_YEARLY_PRICE_ID: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
    STRIPE_PRO_MONTHLY_PRICE_ID: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    STRIPE_PRO_YEARLY_PRICE_ID: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    STRIPE_TEAM_MONTHLY_PRICE_ID: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
    STRIPE_TEAM_YEARLY_PRICE_ID: process.env.STRIPE_TEAM_YEARLY_PRICE_ID,
    STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    STRIPE_ENTERPRISE_YEARLY_PRICE_ID: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
    NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test' | undefined,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_ENV: process.env.VERCEL_ENV as 'production' | 'preview' | 'development' | undefined,
  });

  if (!parsed.success) {
    console.error('❌ Invalid server environment variables:');
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    throw new Error('Invalid server environment variables. Check the logs above.');
  }

  return parsed.data;
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Validated public environment variables.
 * Safe to use on both client and server.
 */
export const publicEnv = validatePublicEnv();

/**
 * Validated server-only environment variables.
 * MUST only be accessed on the server.
 * 
 * This uses a Proxy to ensure server-only vars are never accessed on the client.
 */
export const serverEnv = new Proxy(
  {} as z.infer<typeof serverEnvSchema>,
  {
    get(_target, prop) {
      if (typeof window !== 'undefined') {
        throw new Error(
          `Attempted to access server-only environment variable "${String(prop)}" on the client. ` +
          'Server environment variables must only be accessed in server-side code (API routes, getServerSideProps, etc.).'
        );
      }
      
      // Lazy validation - only validate when first accessed
      const validated = validateServerEnv();
      
      // Replace the proxy with the actual object after first access
      Object.assign(serverEnv, validated);
      
      return validated[prop as keyof typeof validated];
    },
  }
);

/**
 * Combined environment object for convenience.
 * Use this for most cases, but be careful not to access server vars on the client.
 */
export const env = {
  // Public vars (safe everywhere)
  ...publicEnv,
  
  // Server-only vars (protected by proxy)
  server: serverEnv,
  
  // Computed values
  get IS_PRODUCTION() {
    return typeof window === 'undefined' 
      ? serverEnv.NODE_ENV === 'production'
      : process.env.NODE_ENV === 'production';
  },
  
  get IS_DEVELOPMENT() {
    return typeof window === 'undefined'
      ? serverEnv.NODE_ENV === 'development'
      : process.env.NODE_ENV === 'development';
  },
  
  get ENABLE_WORKSPACE_SHELL() {
    const flagValue = publicEnv.NEXT_PUBLIC_ENABLE_WORKSPACE_SHELL;
    if (flagValue === undefined) {
      return true; // Default to enabled
    }
    return flagValue === 'true' || flagValue === '1';
  },
} as const;

// ============================================================================
// RUNTIME VALIDATION WARNINGS (Server-side only)
// ============================================================================

/**
 * Checks for common pricing configuration issues and emits warnings.
 * This runs server-side only and doesn't crash the app.
 */
if (typeof window === 'undefined') {
  // Define plans and intervals shown in the UI
  const UI_PLANS = [
    { id: 'starter', name: 'Starter', intervals: ['monthly', 'yearly'] },
    { id: 'pro', name: 'Pro', intervals: ['monthly', 'yearly'] },
    { id: 'team', name: 'Team', intervals: ['monthly', 'yearly'] },
    { id: 'enterprise', name: 'Enterprise', intervals: ['monthly', 'yearly'] }, // Optional
  ];

  const validated = validateServerEnv();
  
  // Check if any UI-visible plan/interval lacks a configured price ID
  const missingPrices: string[] = [];
  
  UI_PLANS.forEach(({ id, name, intervals }) => {
    intervals.forEach((interval) => {
      const envKey = `STRIPE_${id.toUpperCase()}_${interval.toUpperCase()}_PRICE_ID` as keyof typeof validated;
      const priceId = validated[envKey];
      
      // Skip enterprise checks (it's handled via contact flow)
      if (id === 'enterprise') return;
      
      if (!priceId) {
        missingPrices.push(`${name} (${interval})`);
      }
    });
  });

  if (missingPrices.length > 0) {
    console.warn('\n⚠️  Stripe Price Configuration Warning:');
    console.warn('The following plans/intervals displayed in the pricing UI lack configured price IDs:');
    missingPrices.forEach((missing) => console.warn(`  - ${missing}`));
    console.warn('Set the corresponding STRIPE_*_PRICE_ID environment variables.');
    console.warn('Users clicking these plans will receive an error.\n');
  }
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PublicEnv = typeof publicEnv;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type Env = typeof env;
