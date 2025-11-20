# Onboarding Flow Update

## Overview
The onboarding flow has been updated to trigger **after login** rather than being shown as the first screen.

## User Flow

1. **Landing Page First** 
   - User visits `/` and sees the marketing landing page
   - Not authenticated yet

2. **User Logs In**
   - Clicks "Login" button in the navbar
   - Completes Google OAuth authentication
   - Redirected back to home page (`/`)

3. **Onboarding Check**
   - Home page checks if user has completed onboarding
   - If not completed → redirects to `/onboarding`
   - If completed → shows main app (conversation view)

4. **Onboarding Process**
   - User completes the multi-step onboarding form
   - Profile is created/updated with `onboardingCompleted: true`
   - User is redirected back to home

5. **Main App**
   - Home page checks onboarding status again
   - Onboarding completed → user sees the conversation view

## Technical Implementation

### Files Modified

1. **`src/middleware.ts`**
   - Added authentication checks for protected routes
   - Redirects unauthenticated users or users without completed onboarding
   - Public routes: `/`, `/api/auth/*`, `/onboarding`

2. **`auth.ts`**
   - Added `signIn` and `redirect` callbacks
   - Ensures proper redirect flow after authentication
   - JWT callback fetches profile data including onboarding status

3. **`src/app/(marketing)/page.tsx`**
   - Checks database directly to avoid JWT cache issues
   - Shows landing for unauthenticated users
   - Redirects to onboarding if not completed
   - Shows conversation view for completed users

4. **`src/app/(app)/onboarding/actions.ts`**
   - Added `revalidatePath("/")` after onboarding completion
   - Ensures fresh data fetch on redirect
   - Uses consistent `auth()` function

## Key Features

- **No Redirect Loops**: Database is checked directly instead of relying on cached JWT tokens
- **Protected Routes**: Middleware ensures authenticated and onboarded users for protected routes
- **Smooth UX**: Landing page always shown first, onboarding only after login
- **Session Management**: Proper session refresh after onboarding completion

## Testing the Flow

1. Clear cookies/logout
2. Visit the site → should see landing page
3. Click "Login" → complete OAuth
4. Should be redirected to `/onboarding`
5. Complete onboarding form
6. Should be redirected to main app (conversation view)
7. Refresh page → should stay in main app (no redirect to onboarding)

