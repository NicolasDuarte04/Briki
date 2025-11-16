#!/usr/bin/env node
/**
 * Test Runner for PDF Extraction Tests
 * 
 * FASE 2: Mejora de Extracción de PDFs
 * 
 * Run with: node tests/lib/pdf/test-extraction-runner.js
 */

// Import the test suite
async function runTests() {
  try {
    // Dynamic import to support TypeScript
    const { ExtractionTests } = await import('./extraction.test.ts');
    
    const testSuite = new ExtractionTests();
    const success = await testSuite.runAll();
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error loading or running tests:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(2);
  }
}

runTests();

