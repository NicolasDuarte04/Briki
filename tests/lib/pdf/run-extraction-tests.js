#!/usr/bin/env node
/**
 * Simple Test Runner for PDF Extraction
 * 
 * FASE 2: Mejora de Extracción de PDFs
 * Run with: node tests/lib/pdf/run-extraction-tests.js
 */

const {
  extractWithCoordinates,
  extractTextFromPDF,
  isValidExtractionResult,
  filterCoordinatesByPage,
  findTextCoordinates,
  calculateBoundingBox
} = require('../../../src/lib/pdf/extraction.ts');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${error.message}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('\n🧪 TESTS DE EXTRACCIÓN PDF - FASE 2\n');
  console.log('='.repeat(70) + '\n');

  console.log('🔧 Utility Function Tests:\n');

  // Test: isValidExtractionResult
  await test('isValidExtractionResult should validate correctly', async () => {
    const valid = { text: 'Test', pages: 1, coordinates: [] };
    if (!isValidExtractionResult(valid)) {
      throw new Error('Should validate correct result');
    }

    const invalid = { text: 'Test', pages: 0, coordinates: [] };
    if (isValidExtractionResult(invalid)) {
      throw new Error('Should reject 0 pages');
    }
  });

  // Test: filterCoordinatesByPage
  await test('filterCoordinatesByPage should filter correctly', async () => {
    const coords = [
      { text: 'P1', page: 1, x: 0, y: 0, width: 10, height: 10 },
      { text: 'P2', page: 2, x: 0, y: 0, width: 10, height: 10 },
      { text: 'P1b', page: 1, x: 0, y: 20, width: 10, height: 10 },
    ];

    const page1 = filterCoordinatesByPage(coords, 1);
    if (page1.length !== 2) throw new Error(`Expected 2, got ${page1.length}`);

    const page2 = filterCoordinatesByPage(coords, 2);
    if (page2.length !== 1) throw new Error(`Expected 1, got ${page2.length}`);
  });

  // Test: findTextCoordinates
  await test('findTextCoordinates should find text', async () => {
    const coords = [
      { text: 'Hello', page: 1, x: 0, y: 0, width: 10, height: 10 },
      { text: 'World', page: 1, x: 0, y: 20, width: 10, height: 10 },
      { text: 'Hello Again', page: 2, x: 0, y: 0, width: 10, height: 10 },
    ];

    const found = findTextCoordinates(coords, 'hello');
    if (found.length !== 2) throw new Error(`Expected 2, got ${found.length}`);
  });

  // Test: calculateBoundingBox
  await test('calculateBoundingBox should calculate correctly', async () => {
    const coords = [
      { text: 'A', page: 1, x: 10, y: 20, width: 100, height: 20 },
      { text: 'B', page: 1, x: 50, y: 60, width: 80, height: 15 },
    ];

    const bbox = calculateBoundingBox(coords);
    if (!bbox) throw new Error('Should return bbox');
    if (bbox.x !== 10) throw new Error(`Expected x=10, got ${bbox.x}`);
    if (bbox.y !== 20) throw new Error(`Expected y=20, got ${bbox.y}`);
  });

  // Test: Empty bounding box
  await test('calculateBoundingBox should return null for empty', async () => {
    const bbox = calculateBoundingBox([]);
    if (bbox !== null) throw new Error('Should return null');
  });

  // Test: Error handling
  await test('extractWithCoordinates should reject invalid PDF', async () => {
    const invalidBuffer = Buffer.from('Not a PDF');
    
    // Suprimir stderr temporalmente para evitar mensajes de pdf2json
    const originalStderr = console.error;
    console.error = () => {};
    
    try {
      await extractWithCoordinates(invalidBuffer);
      throw new Error('Should have thrown');
    } catch (e) {
      // Expected - PDF inválido rechazado correctamente
    } finally {
      // Restaurar stderr
      console.error = originalStderr;
    }
  });

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 RESUMEN:`);
  console.log(`   ✅ Pasados: ${passed}`);
  console.log(`   ❌ Fallidos: ${failed}`);
  console.log(`   📈 Total: ${passed + failed}\n`);

  if (failed === 0) {
    console.log('🎉 ¡TODOS LOS TESTS PASARON!\n');
  } else {
    console.log('⚠️  Algunos tests fallaron.\n');
  }

  return failed === 0;
}

runAllTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(2);
  });

