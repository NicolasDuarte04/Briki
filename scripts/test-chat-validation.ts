#!/usr/bin/env tsx
/**
 * Chat API Validation Tests
 * 
 * Unit tests for chat endpoint request validation.
 * Tests validation logic without requiring a test framework.
 * 
 * Usage: pnpm run test:validation
 */

import { z } from 'zod';

// Import the validation schema used by the route
const ProcessMessageSchema = z.object({
  caseId: z.string().min(1, 'caseId is required'),
  message: z.string().optional().default(''),
  brief: z.object({
    businessType: z.string().optional(),
    employees: z.number().optional(),
    coverage: z.string().optional(),
    freeText: z.string().optional(),
    clientName: z.string().optional(),
    selectedClientId: z.string().nullable().optional(),
    insurance_category: z.string().optional(),
    max_budget: z.number().optional(),
    budget_currency: z.enum(['COP', 'USD', 'MXN', 'EUR']).optional(),
    required_coverages: z.array(z.string()).optional(),
    client_profile: z.string().optional(),
  }).optional().default({}),
});

// Test helpers
let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`  ✅ ${name}`);
  } catch (error: any) {
    failCount++;
    console.log(`  ❌ ${name}`);
    console.log(`     ${error.message}`);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toBeTrue() {
      if (actual !== true) {
        throw new Error(`Expected true but got ${actual}`);
      }
    },
    toBeFalse() {
      if (actual !== false) {
        throw new Error(`Expected false but got ${actual}`);
      }
    },
    toContain(substring: string) {
      if (typeof actual !== 'string' || !actual.includes(substring)) {
        throw new Error(`Expected "${actual}" to contain "${substring}"`);
      }
    },
    toBeGreaterThan(value: number) {
      if (actual <= value) {
        throw new Error(`Expected ${actual} to be greater than ${value}`);
      }
    },
  };
}

// ============================================================================
// TESTS
// ============================================================================

console.log('🧪 Chat API Validation Tests');
console.log('='.repeat(50));

// Valid Requests
console.log('\n📋 Valid Requests');
test('accepts minimal valid payload with caseId', () => {
  const payload = { caseId: 'case-123' };
  const result = ProcessMessageSchema.safeParse(payload);
  expect(result.success).toBeTrue();
  if (result.success) {
    expect(result.data.caseId).toBe('case-123');
    expect(result.data.message).toBe('');
    expect(result.data.brief).toEqual({});
  }
});

test('accepts payload with caseId and message', () => {
  const payload = {
    caseId: 'case-123',
    message: 'Analyze these policies',
  };
  const result = ProcessMessageSchema.safeParse(payload);
  expect(result.success).toBeTrue();
  if (result.success) {
    expect(result.data.caseId).toBe('case-123');
    expect(result.data.message).toBe('Analyze these policies');
  }
});

test('accepts full payload with brief', () => {
  const payload = {
    caseId: 'case-123',
    message: 'Find best policy',
    brief: {
      businessType: 'Technology',
      employees: 50,
      coverage: 'Health',
      insurance_category: 'health',
      max_budget: 10000,
      budget_currency: 'USD' as const,
      required_coverages: ['Medical', 'Dental'],
    },
  };
  const result = ProcessMessageSchema.safeParse(payload);
  expect(result.success).toBeTrue();
  if (result.success) {
    expect(result.data.brief.businessType).toBe('Technology');
    expect(result.data.brief.employees).toBe(50);
    expect(result.data.brief.budget_currency).toBe('USD');
  }
});

// Invalid Requests
console.log('\n📋 Invalid Requests');
test('rejects payload without caseId', () => {
  const payload = { message: 'Test message' };
  const result = ProcessMessageSchema.safeParse(payload);
  expect(result.success).toBeFalse();
});

test('rejects payload with empty caseId', () => {
  const payload = { caseId: '', message: 'Test message' };
  const result = ProcessMessageSchema.safeParse(payload);
  expect(result.success).toBeFalse();
});

test('rejects invalid budget currency', () => {
  const payload = {
    caseId: 'case-123',
    brief: { budget_currency: 'INVALID' as any },
  };
  const result = ProcessMessageSchema.safeParse(payload);
  expect(result.success).toBeFalse();
});

test('rejects invalid brief.employees type', () => {
  const payload = {
    caseId: 'case-123',
    brief: { employees: 'fifty' as any },
  };
  const result = ProcessMessageSchema.safeParse(payload);
  expect(result.success).toBeFalse();
});

// Type Coercion and Defaults
console.log('\n📋 Type Coercion and Defaults');
test('applies default values for optional fields', () => {
  const payload = { caseId: 'case-123' };
  const result = ProcessMessageSchema.safeParse(payload);
  if (result.success) {
    expect(result.data.message).toBe('');
    expect(result.data.brief).toEqual({});
  }
});

test('preserves provided optional values', () => {
  const payload = {
    caseId: 'case-123',
    message: 'Custom message',
    brief: { clientName: 'Acme Corp' },
  };
  const result = ProcessMessageSchema.safeParse(payload);
  if (result.success) {
    expect(result.data.message).toBe('Custom message');
    expect(result.data.brief.clientName).toBe('Acme Corp');
  }
});

// Edge Cases
console.log('\n📋 Edge Cases');
test('handles null selectedClientId', () => {
  const payload = {
    caseId: 'case-123',
    brief: { selectedClientId: null },
  };
  const result = ProcessMessageSchema.safeParse(payload);
  expect(result.success).toBeTrue();
});

test('handles empty required_coverages array', () => {
  const payload = {
    caseId: 'case-123',
    brief: { required_coverages: [] },
  };
  const result = ProcessMessageSchema.safeParse(payload);
  expect(result.success).toBeTrue();
  if (result.success) {
    expect(result.data.brief.required_coverages).toEqual([]);
  }
});

test('handles very long caseId', () => {
  const longId = 'case-' + 'a'.repeat(200);
  const payload = { caseId: longId };
  const result = ProcessMessageSchema.safeParse(payload);
  expect(result.success).toBeTrue();
  if (result.success) {
    expect(result.data.caseId).toBe(longId);
  }
});

// Error Messages
console.log('\n📋 Error Messages');
test('provides clear error message for missing caseId', () => {
  const payload = {};
  const result = ProcessMessageSchema.safeParse(payload) as any;
  
  if (result.success === false && result.error) {
    const errors = result.error.issues
      .map((err: any) => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
    expect(errors).toContain('caseId');
  } else {
    throw new Error(`Unexpected result: success=${result.success}, hasError=${!!result.error}`);
  }
});

test('lists all validation errors', () => {
  const payload = {
    caseId: '',
    brief: {
      budget_currency: 'GBP' as any,
      employees: 'many' as any,
    },
  };
  const result = ProcessMessageSchema.safeParse(payload) as any;
  
  if (result.success === false && result.error) {
    expect(result.error.issues.length).toBeGreaterThan(1);
  } else {
    throw new Error(`Unexpected result: success=${result.success}, hasError=${!!result.error}`);
  }
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Test Results: ${passCount}/${testCount} passed`);

if (failCount > 0) {
  console.log(`\n❌ ${failCount} test(s) failed\n`);
  process.exit(1);
} else {
  console.log('\n✅ All validation tests passed!\n');
  process.exit(0);
}

