# Edge Runtime Crypto Module Fix

## Problem
The Next.js middleware was throwing a runtime error:
```
The edge runtime does not support Node.js 'crypto' module.
```

This occurred because the middleware was importing `auth` from `auth.ts`, which uses the `pg` (PostgreSQL) module. The `pg` module depends on Node.js-specific APIs like the crypto module, which are not available in the Edge Runtime environment where Next.js middleware runs.

## Solution

### 1. Created Edge-Compatible Auth Configuration
Created a new file `auth-edge.ts` that:
- Uses the same NextAuth configuration but without database dependencies
- Only includes JWT session strategy (Edge-compatible)
- Passes through token data without database lookups
- Maintains the same session structure for compatibility

### 2. Updated Middleware
Modified `src/middleware.ts` to:
- Import from `auth-edge.ts` instead of `auth.ts`
- Simplified auth checks to only verify session existence
- Removed database-dependent onboarding checks from middleware

### 3. Client-Side Onboarding Check
Created `src/components/OnboardingCheck.tsx` that:
- Runs on the client side where full NextAuth session data is available
- Checks if user needs onboarding based on profileId and onboardingCompleted flags
- Redirects to `/onboarding` when necessary
- Added to the root layout to ensure it runs on all pages

## Key Points

1. **Edge Runtime Limitations**: The Edge Runtime doesn't support Node.js modules, so database clients like `pg` or `prisma` cannot be used in middleware.

2. **JWT Strategy**: Using JWT session strategy is essential for Edge Runtime compatibility as it doesn't require database access.

3. **Separation of Concerns**: 
   - Middleware handles basic auth checks (is user logged in?)
   - Client components handle complex checks requiring database data

4. **Session Data Flow**:
   - Main `auth.ts` populates JWT with profile data from database
   - Edge-compatible `auth-edge.ts` passes through this data
   - Client components can access full session data including onboarding status

## Files Modified

1. **Created `auth-edge.ts`**: Edge-compatible auth configuration
2. **Modified `src/middleware.ts`**: Use edge-compatible auth
3. **Created `src/components/OnboardingCheck.tsx`**: Client-side onboarding redirect
4. **Modified `src/app/layout.tsx`**: Added OnboardingCheck component

This approach maintains security while working within Edge Runtime constraints.
