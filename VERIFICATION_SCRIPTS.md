# Verification Scripts

Quick, repeatable checks to prevent regressions and ensure system health.

## Available Scripts

### 1. `check:env` - Environment Variables Check

Fast-failing script that validates all required environment variables are set.

**Usage:**
```bash
pnpm run check:env
```

**What it checks:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Public Supabase URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public Supabase anon key  
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Server-side Supabase service role key
- ✅ `OPENAI_API_KEY` - OpenAI API key

**Exit codes:**
- `0` - All required environment variables are set
- `1` - One or more required variables are missing

**Example output (failure):**
```
❌ Environment check FAILED

❌ Missing OPENAI_API_KEY: Must be a valid OpenAI API key
❌ Missing SUPABASE_SERVICE_ROLE_KEY: Must be a valid Supabase service role key

Please set the missing environment variables in your .env.local file.
```

**Example output (success):**
```
✅ All required environment variables are set!
Environment check PASSED
```

---

### 2. `check:chat` - Chat API Health Check

Tests the `/api/chat/process-message` endpoint to verify it's working correctly.

**Prerequisites:**
- Dev server must be running at `http://localhost:3000`

**Usage:**
```bash
# Terminal 1: Start dev server
pnpm run dev

# Terminal 2: Run health check
pnpm run check:chat
```

**What it checks:**
- ✅ Endpoint is reachable
- ✅ Request validation works (rejects invalid payloads with 400)
- ✅ Returns appropriate status codes
- ✅ Authentication is enforced (401/403 when not authenticated)

**Exit codes:**
- `0` - Endpoint is healthy
- `1` - Endpoint is unreachable or not working correctly

**Example output:**
```
🔍 Chat API Health Check
==================================================
Target: http://localhost:3000/api/chat/process-message

Test 1: Checking if endpoint is reachable...
✅ Endpoint is reachable (Status: 401)

Test 2: Checking request validation...
✅ Correctly rejects invalid payload with 400 (Status: 400)
   Error message: "Bad request: caseId: Invalid input: expected string, received undefined"

==================================================
✅ Chat API health check PASSED

The endpoint is:
  ✅ Reachable
  ✅ Validating requests correctly
  ✅ Returning appropriate status codes
```

---

### 3. `test:validation` - Chat API Validation Tests

Unit tests for the chat endpoint request validation schema.

**Usage:**
```bash
pnpm run test:validation
```

**What it tests:**
- ✅ Accepts valid payloads with required fields
- ✅ Rejects invalid payloads (missing caseId, wrong types)
- ✅ Applies default values correctly
- ✅ Validates budget currency enum
- ✅ Handles edge cases (null values, empty arrays, long strings)
- ✅ Provides clear error messages

**Exit codes:**
- `0` - All tests passed
- `1` - One or more tests failed

**Example output:**
```
🧪 Chat API Validation Tests
==================================================

📋 Valid Requests
  ✅ accepts minimal valid payload with caseId
  ✅ accepts payload with caseId and message
  ✅ accepts full payload with brief

📋 Invalid Requests
  ✅ rejects payload without caseId
  ✅ rejects payload with empty caseId
  ✅ rejects invalid budget currency

... more tests ...

==================================================

📊 Test Results: 14/14 passed

✅ All validation tests passed!
```

---

## Integration with CI/CD

These scripts are designed to be used in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Check environment
        run: pnpm run check:env
      
      - name: Run validation tests
        run: pnpm run test:validation
      
      - name: Start dev server
        run: pnpm run dev &
        
      - name: Wait for server
        run: sleep 10
      
      - name: Check chat API
        run: pnpm run check:chat
```

---

## Verification Checklist

Run these in order before deploying:

1. ✅ **Environment variables** - `pnpm run check:env`
2. ✅ **Validation tests** - `pnpm run test:validation`  
3. ✅ **API health** - `pnpm run check:chat` (requires dev server)
4. ✅ **Type checking** - `pnpm run typecheck`
5. ✅ **Linting** - `pnpm run lint`

---

## Troubleshooting

### `check:env` fails
- Create a `.env.local` file in the project root
- Copy variables from `.env.example` if available
- Set all required environment variables
- See `QUICK_START_ENV.md` for detailed setup instructions

### `check:chat` fails with "Cannot connect to server"
- Ensure dev server is running: `pnpm run dev`
- Check that server is running on port 3000
- Wait a few seconds for server to fully start

### `test:validation` fails
- Check that Zod is installed: `pnpm install`
- Ensure you're using the correct Zod version (≥4.x)
- Review the test output for specific failures

---

## Implementation Details

### File Structure
```
scripts/
  ├── check-env.ts           # Environment variables check
  ├── check-chat.ts          # Chat API health check
  └── test-chat-validation.ts # Validation unit tests

src/app/api/chat/process-message/
  └── route.ts               # Chat API route with validation
```

### No Dependencies Required
These scripts use only tools already in the project:
- `tsx` - TypeScript execution
- `zod` - Schema validation (already used in the API)
- `node:fetch` - Built-in HTTP client

No test frameworks (Jest, Vitest) are required.

---

## Contributing

When adding new verification scripts:

1. **Keep it simple** - Scripts should be fast and focused
2. **Exit codes** - Use exit code 0 for success, 1 for failure
3. **Clear output** - Use ✅ and ❌ emojis for visual clarity
4. **No dependencies** - Use only existing dependencies
5. **Documentation** - Update this file with new scripts

---

## Related Documentation

- `ENV_CENTRALIZATION_SUMMARY.md` - Environment variable management
- `API_LOGGING_QUICK_REFERENCE.md` - API logging and error handling
- `MANUAL_TEST_CHECKLIST.md` - Manual testing procedures

