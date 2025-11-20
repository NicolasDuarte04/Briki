#!/usr/bin/env node
/**
 * Test Runner for Policy Analysis Tests
 * 
 * FASE 3: API de Análisis de Pólizas
 * 
 * Run with: node tests/api/policies/test-runner.js
 */

const { PolicyAnalysisTests } = require('./analyze.test.ts');

async function runTests() {
  try {
    const testSuite = new PolicyAnalysisTests();
    const success = await testSuite.runAll();
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error loading or running tests:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(2);
  }
}

runTests();

