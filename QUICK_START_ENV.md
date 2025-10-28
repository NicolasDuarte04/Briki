# 🚀 Quick Start: Environment Setup

## Immediate Next Steps

### 1. Create `.env.local` File

Create a new file at the project root: `/Users/nicolasduarte/Briki 3.0/Briki/.env.local`

**Minimum required variables:**

```bash
# Supabase (get from https://supabase.com/dashboard/project/_/settings/api)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI (get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: Site URL (defaults to http://localhost:3000)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional: Database URL (if using Prisma directly)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

### 2. Test the Configuration

```bash
# Run the verification script
tsx scripts/verify-env.ts

# If successful, start the dev server
pnpm dev
```

### 3. Expected Behavior

**❌ Without proper .env.local:**
```
❌ Invalid server environment variables:
{
  "OPENAI_API_KEY": {
    "_errors": [
      "Required"
    ]
  }
}
Error: Invalid server environment variables. Check the logs above.
```

**✅ With proper .env.local:**
```
Ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

## Usage in Code

### Server-Only Code (API Routes, Server Actions)

```typescript
import { serverEnv } from '@/lib/env';

export async function POST(request: Request) {
  // ✅ Safe - validated on startup
  const apiKey = serverEnv.OPENAI_API_KEY;
  const model = serverEnv.OPENAI_MODEL; // defaults to 'gpt-4o-mini'
  
  // Use the validated values
  const openai = new OpenAI({ apiKey });
  // ...
}
```

### Public Variables (Client & Server)

```typescript
import { publicEnv } from '@/lib/env';

export function Component() {
  // ✅ Safe - works on client and server
  const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL;
  return <a href={siteUrl}>Home</a>;
}
```

### Combined Access

```typescript
import { env } from '@/lib/env';

// Public vars (safe everywhere)
const url = env.NEXT_PUBLIC_SUPABASE_URL;

// Server vars (server-only, protected by proxy)
const apiKey = env.server.OPENAI_API_KEY; // ⚠️ Server only!

// Computed values
if (env.IS_DEVELOPMENT) {
  console.log('Running in development mode');
}
```

## What Changed

### Before
```typescript
// ❌ Old way - no validation, runtime errors
const apiKey = process.env.OPENAI_API_KEY; // might be undefined!
if (!apiKey) throw new Error('Missing key'); // runtime check
```

### After
```typescript
// ✅ New way - validated on startup, type-safe
import { serverEnv } from '@/lib/env';
const apiKey = serverEnv.OPENAI_API_KEY; // guaranteed to exist
```

## Files Modified

- ✅ `src/lib/env.ts` - Centralized env with Zod validation
- ✅ `src/lib/openai.ts` - Uses `serverEnv.OPENAI_API_KEY`
- ✅ `src/app/actions/devActions.ts` - Uses `publicEnv` and `serverEnv`

## Verification Checklist

- [ ] Created `.env.local` with all required variables
- [ ] Ran `tsx scripts/verify-env.ts` successfully
- [ ] Started dev server without errors
- [ ] Tested chat API (no 500 errors)
- [ ] Committed changes (but NOT .env.local!)

## Troubleshooting

### "Missing required environment variable"
→ Add the missing variable to `.env.local` and restart server

### "Attempted to access server-only environment variable on the client"
→ Move the code to a Server Component, API route, or Server Action

### Changes not taking effect
→ Restart the dev server after modifying `.env.local`

---

**Ready to go!** 🎉

Once you create `.env.local` with the required values, the server will validate everything on startup and fail fast if anything is missing.

