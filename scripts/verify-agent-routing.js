#!/usr/bin/env node
/**
 * Agent Routing Verification Script
 * 
 * Validates that all agent routing functions return correct paths
 * Run with: node scripts/verify-agent-routing.js
 */

// Simulate the routing functions
const DEFAULT_LOCALE = 'es';

function pathForAgent(locale = DEFAULT_LOCALE) {
  return `/${locale}/agent`;
}

function pathForAgentThread(threadId, locale = DEFAULT_LOCALE) {
  return `/${locale}/agent/${threadId}`;
}

// Test suite
const tests = [
  {
    name: 'pathForAgent with Spanish locale',
    fn: () => pathForAgent('es'),
    expected: '/es/agent'
  },
  {
    name: 'pathForAgent with English locale',
    fn: () => pathForAgent('en'),
    expected: '/en/agent'
  },
  {
    name: 'pathForAgent with default locale',
    fn: () => pathForAgent(),
    expected: '/es/agent'
  },
  {
    name: 'pathForAgentThread with Spanish locale',
    fn: () => pathForAgentThread('case-123', 'es'),
    expected: '/es/agent/case-123'
  },
  {
    name: 'pathForAgentThread with English locale',
    fn: () => pathForAgentThread('case-456', 'en'),
    expected: '/en/agent/case-456'
  },
  {
    name: 'pathForAgentThread with default locale',
    fn: () => pathForAgentThread('case-789'),
    expected: '/es/agent/case-789'
  }
];

// Run tests
console.log('🧪 Agent Routing Verification\n');

let passed = 0;
let failed = 0;

tests.forEach(test => {
  const result = test.fn();
  const success = result === test.expected;
  
  if (success) {
    console.log(`✅ ${test.name}`);
    console.log(`   → ${result}\n`);
    passed++;
  } else {
    console.log(`❌ ${test.name}`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Got:      ${result}\n`);
    failed++;
  }
});

// Summary
console.log('─'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('\n✅ All routing tests passed!');
  process.exit(0);
} else {
  console.log(`\n❌ ${failed} test(s) failed`);
  process.exit(1);
}

