/**
 * Central configuration for environment variables with runtime validation.
 * This ensures all required environment variables are present and valid.
 */

// Helper to safely get environment variables
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    // In production, throw an error. In development, warn but continue.
    const message = `Missing required environment variable: ${key}`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(message);
    } else {
      console.warn(`⚠️  ${message}`);
      return '';
    }
  }
  return value;
}

// Supabase Configuration
export const env = {
  // Public environment variables (safe to expose to client)
  NEXT_PUBLIC_SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  NEXT_PUBLIC_SITE_URL: getEnvVar('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000'),
  
  // Server-only environment variables
  get SUPABASE_SERVICE_ROLE_KEY() {
    // Only access on server side
    if (typeof window !== 'undefined') {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY should only be used on the server');
    }
    return getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
  },
  
  // OAuth providers (optional)
  get GOOGLE_CLIENT_ID() {
    return getEnvVar('GOOGLE_CLIENT_ID', '');
  },
  get GOOGLE_CLIENT_SECRET() {
    return getEnvVar('GOOGLE_CLIENT_SECRET', '');
  },
  
  // Runtime environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  
  // Vercel-specific
  VERCEL_URL: process.env.VERCEL_URL,
  VERCEL_ENV: process.env.VERCEL_ENV,
  
  // Feature Flags
  // Workspace shell flag - defaults to enabled in development
  get ENABLE_WORKSPACE_SHELL() {
    const flagValue = process.env.NEXT_PUBLIC_ENABLE_WORKSPACE_SHELL;
    // Default to true in development, respect explicit env var in other environments
    if (flagValue === undefined) {
      return process.env.NODE_ENV === 'development' ? true : true;
    }
    return flagValue === 'true' || flagValue === '1';
  },
} as const;

// Type-safe environment variable access
export type Env = typeof env;

// Validate critical environment variables at module load time
if (typeof window === 'undefined') {
  // Server-side validation
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please ensure all required environment variables are set in your deployment configuration.'
    );
  }
}
