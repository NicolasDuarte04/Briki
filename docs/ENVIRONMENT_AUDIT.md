# Environment Variables Audit

## Summary

This document tracks the environment variables used in the Briki application and their resolution for deployment issues.

## Problem Addressed

1. **DEPLOYMENT_NOT_FOUND Error**: Missing or misconfigured environment variables in Vercel deployment
2. **Edge Runtime Warning**: `@supabase/ssr` using Node.js-specific APIs (`process.versions`) incompatible with Edge Runtime

## Solutions Implemented

### 1. Updated Supabase Dependencies
- Updated `@supabase/supabase-js` from 2.58.0 to 2.75.0
- This version includes better Edge Runtime compatibility

### 2. Created Centralized Environment Configuration
- Created `/src/lib/env.ts` for centralized environment variable management
- Provides runtime validation and helpful error messages
- Distinguishes between client-safe and server-only variables

### 3. Updated Imports
- Modified `middleware.ts` to use the new env module
- Updated `src/lib/supabase/server.ts` to use centralized env config

## Required Environment Variables

### Essential Variables (Required for deployment)
```
NEXT_PUBLIC_SUPABASE_URL        # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Your Supabase anonymous key
```

### Server-Only Variables
```
SUPABASE_SERVICE_ROLE_KEY       # Service role key (never expose to client)
DATABASE_URL                    # PostgreSQL connection string for Prisma
DIRECT_URL                      # Direct database URL for migrations
```

### Optional Variables
```
NEXT_PUBLIC_SITE_URL            # Site URL (defaults to http://localhost:3000)
GOOGLE_CLIENT_ID                # Google OAuth client ID
GOOGLE_CLIENT_SECRET            # Google OAuth client secret
```

## Vercel Deployment Checklist

1. **Environment Variables**: Ensure all required variables are set in Vercel project settings
2. **Build Command**: `pnpm build`
3. **Output Directory**: `.next`
4. **Node.js Version**: Use 20.x (as specified in package.json engines)

## Edge Runtime Compatibility

The middleware runs in Edge Runtime by default. If you encounter Node.js API issues:

1. **Current Solution**: Updated dependencies should resolve most issues
2. **Alternative**: Move auth checks to API routes (Node.js runtime) instead of middleware
3. **Last Resort**: Use Pages Router for auth-protected pages instead of middleware

## Testing Environment Variables

To test if environment variables are properly configured:

```bash
# Development
pnpm dev

# Production build
pnpm build
pnpm start
```

## Common Issues and Solutions

### Issue: DEPLOYMENT_NOT_FOUND
**Cause**: Missing environment variables in Vercel
**Solution**: Add all required variables in Vercel dashboard → Settings → Environment Variables

### Issue: Edge Runtime API Warning
**Cause**: Dependencies using Node.js-specific APIs
**Solution**: Keep dependencies updated or move logic to API routes

### Issue: Authentication not working
**Cause**: Incorrect Supabase configuration
**Solution**: Verify SUPABASE_URL and SUPABASE_ANON_KEY match your Supabase project

## Next Steps

1. Monitor deployment logs for any new warnings
2. Consider implementing request logging for debugging
3. Set up proper error boundaries for production
