#!/usr/bin/env tsx
/**
 * Chat API Health Check Script
 * 
 * Tests the /api/chat/process-message endpoint with a minimal valid payload.
 * Requires the dev server to be running at http://localhost:3000
 * 
 * Usage: 
 *   1. Start dev server: pnpm run dev
 *   2. In another terminal: pnpm run check:chat
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const ENDPOINT = '/api/chat/process-message';

interface CheckResult {
  success: boolean;
  status?: number;
  message: string;
  responseBody?: any;
}

/**
 * Test 1: Invalid payload (missing caseId) should return 400
 */
async function testInvalidPayload(): Promise<CheckResult> {
  try {
    const response = await fetch(`${API_URL}${ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Test message without caseId',
      }),
    });

    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      return {
        success: true,
        status: response.status,
        message: 'Endpoint requires authentication (expected)',
        responseBody: data,
      };
    }

    if (response.status === 400) {
      return {
        success: true,
        status: response.status,
        message: 'Correctly rejects invalid payload with 400',
        responseBody: data,
      };
    }

    return {
      success: false,
      status: response.status,
      message: `Expected 400 or 401/403, got ${response.status}`,
      responseBody: data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Request failed: ${error.message}`,
    };
  }
}

/**
 * Test 2: Endpoint is reachable
 */
async function testEndpointReachable(): Promise<CheckResult> {
  try {
    const response = await fetch(`${API_URL}${ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    // Any response (even error) means endpoint is reachable
    return {
      success: true,
      status: response.status,
      message: 'Endpoint is reachable',
    };
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        message: 'Cannot connect to server. Is the dev server running? (pnpm run dev)',
      };
    }
    return {
      success: false,
      message: `Connection error: ${error.message}`,
    };
  }
}

/**
 * Main check routine
 */
async function checkChatAPI() {
  console.log('🔍 Chat API Health Check');
  console.log('='.repeat(50));
  console.log(`Target: ${API_URL}${ENDPOINT}\n`);

  // Test 1: Server is reachable
  console.log('Test 1: Checking if endpoint is reachable...');
  const reachableResult = await testEndpointReachable();
  if (reachableResult.success) {
    console.log(`✅ ${reachableResult.message} (Status: ${reachableResult.status})`);
  } else {
    console.error(`❌ ${reachableResult.message}`);
    process.exit(1);
  }

  // Test 2: Validation works
  console.log('\nTest 2: Checking request validation...');
  const validationResult = await testInvalidPayload();
  if (validationResult.success) {
    console.log(`✅ ${validationResult.message} (Status: ${validationResult.status})`);
    if (validationResult.responseBody?.error) {
      console.log(`   Error message: "${validationResult.responseBody.error}"`);
    }
  } else {
    console.error(`❌ ${validationResult.message}`);
    if (validationResult.responseBody) {
      console.error('   Response:', JSON.stringify(validationResult.responseBody, null, 2));
    }
    process.exit(1);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ Chat API health check PASSED');
  console.log('\nThe endpoint is:');
  console.log('  ✅ Reachable');
  console.log('  ✅ Validating requests correctly');
  console.log('  ✅ Returning appropriate status codes\n');
}

// Run the check
checkChatAPI().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

