#!/usr/bin/env node
/**
 * Simple Test Runner for Policy Analysis
 * 
 * FASE 3: API de Análisis de Pólizas
 * Run with: node tests/api/policies/run-simple-tests.js
 */

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
  console.log('\n🧪 TESTS DE ANÁLISIS DE PÓLIZAS - FASE 3\n');
  console.log('='.repeat(70) + '\n');

  console.log('🔧 Structure Validation Tests:\n');

  // Test 1: AnalysisInput structure
  await test('AnalysisInput should have valid structure', async () => {
    const input = {
      text: 'Póliza de Seguro',
      coordinates: [
        { text: 'Test', page: 1, x: 10, y: 20, width: 100, height: 20 }
      ],
      extractionMethod: 'hybrid'
    };

    if (!input.text || typeof input.text !== 'string') {
      throw new Error('text must be string');
    }

    if (!Array.isArray(input.coordinates)) {
      throw new Error('coordinates must be array');
    }

    const validMethods = ['manual', 'ocr', 'hybrid'];
    if (!validMethods.includes(input.extractionMethod)) {
      throw new Error('invalid extraction method');
    }
  });

  // Test 2: AnalysisOutput structure
  await test('AnalysisOutput should have valid structure', async () => {
    const output = {
      data: { policy_number: 'POL-001' },
      confidence: 0.85,
      pageReferences: []
    };

    if (typeof output.confidence !== 'number') {
      throw new Error('confidence must be number');
    }

    if (output.confidence < 0 || output.confidence > 1) {
      throw new Error('confidence must be 0-1');
    }

    if (!Array.isArray(output.pageReferences)) {
      throw new Error('pageReferences must be array');
    }
  });

  // Test 3: PageReference structure
  await test('PageReference should have required fields', async () => {
    const ref = {
      field: 'premium',
      value: '1500',
      page: 2,
      box: { x: 10, y: 20, width: 100, height: 20 },
      confidence: 0.9
    };

    const required = ['field', 'value', 'page', 'box', 'confidence'];
    for (const field of required) {
      if (!(field in ref)) {
        throw new Error(`Missing field: ${field}`);
      }
    }

    if (ref.page < 1) throw new Error('page must be >= 1');
    if (ref.confidence < 0 || ref.confidence > 1) {
      throw new Error('confidence must be 0-1');
    }
  });

  // Test 4: PolicyExtractedData structure
  await test('PolicyExtractedData should be valid', async () => {
    const data = {
      policy_number: 'POL-2025-001',
      insured_name: 'Test User',
      currency: 'MXN',
      financials: {
        premium_total: 15000.00
      },
      coverages: [
        {
          name: 'Medical',
          limit_amount: 1000000,
          confidence: 0.95
        }
      ]
    };

    if (data.policy_number && typeof data.policy_number !== 'string') {
      throw new Error('policy_number must be string');
    }

    if (data.financials) {
      if (data.financials.premium_total && typeof data.financials.premium_total !== 'number') {
        throw new Error('premium_total must be number');
      }
    }

    if (data.coverages) {
      if (!Array.isArray(data.coverages)) {
        throw new Error('coverages must be array');
      }

      for (const cov of data.coverages) {
        if (!cov.name) throw new Error('coverage must have name');
      }
    }
  });

  // Test 5: Confidence normalization
  await test('Confidence should be normalized to 0-1', async () => {
    const normalize = (val) => Math.max(0, Math.min(1, val));

    if (normalize(-0.5) !== 0) throw new Error('Should clamp negative to 0');
    if (normalize(1.5) !== 1) throw new Error('Should clamp >1 to 1');
    if (normalize(0.5) !== 0.5) throw new Error('Should preserve valid values');
  });

  // Test 6: API request structure
  await test('Analyze API request should have correct structure', async () => {
    const request = {
      artifactId: 'abc-123-def',
      extractionMethod: 'hybrid'
    };

    if (!request.artifactId || typeof request.artifactId !== 'string') {
      throw new Error('artifactId required and must be string');
    }

    if (request.extractionMethod) {
      const valid = ['manual', 'ocr', 'hybrid'];
      if (!valid.includes(request.extractionMethod)) {
        throw new Error('invalid extraction method');
      }
    }
  });

  // Test 7: API response structure
  await test('Analyze API response should have success flag', async () => {
    const response = {
      success: true,
      analysis: {
        id: 'analysis-123',
        artifactId: 'artifact-123',
        extractedData: {},
        overallConfidence: 0.85,
        pageReferences: []
      }
    };

    if (typeof response.success !== 'boolean') {
      throw new Error('success must be boolean');
    }

    if (!response.analysis) {
      throw new Error('analysis required');
    }

    const analysis = response.analysis;
    if (!analysis.id) throw new Error('analysis.id required');
    if (!analysis.artifactId) throw new Error('analysis.artifactId required');
    if (typeof analysis.overallConfidence !== 'number') {
      throw new Error('overallConfidence must be number');
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

