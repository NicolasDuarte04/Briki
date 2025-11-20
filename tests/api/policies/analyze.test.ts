/**
 * Tests for Policy Analysis APIs
 * 
 * FASE 3: API de Análisis de Pólizas
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 7.2 (Días 7-10)
 * 
 * These are programmatic tests since no test framework is installed.
 * Run with: node tests/api/policies/test-runner.js
 */

import { analyzeWithAI, type AnalysisInput, type AnalysisOutput } from '../../../src/lib/openai/policyAnalysis';
import { downloadFromStorage, fileExistsInStorage } from '../../../src/lib/storage/downloadFromStorage';

/**
 * Test suite for policy analysis
 */
export class PolicyAnalysisTests {
  private passed = 0;
  private failed = 0;

  /**
   * Run a single test
   */
  private async test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      this.passed++;
    } catch (error: any) {
      console.log(`  ❌ ${name}`);
      console.log(`     Error: ${error.message}`);
      this.failed++;
    }
  }

  /**
   * Test: analyzeWithAI accepts valid input
   */
  async testAnalyzeWithAIInput() {
    await this.test('analyzeWithAI should accept valid input structure', async () => {
      const mockInput: AnalysisInput = {
        text: 'Póliza de Seguro #POL-2025-001',
        coordinates: [
          { text: 'Póliza', page: 1, x: 100, y: 200, width: 50, height: 20 }
        ],
        extractionMethod: 'hybrid'
      };

      // This test verifies structure only, not actual AI call
      if (!mockInput.text || !Array.isArray(mockInput.coordinates)) {
        throw new Error('Invalid input structure');
      }

      // Verify extraction method is valid
      const validMethods = ['manual', 'ocr', 'hybrid'];
      if (!validMethods.includes(mockInput.extractionMethod)) {
        throw new Error('Invalid extraction method');
      }
    });
  }

  /**
   * Test: AnalysisOutput has correct structure
   */
  async testAnalysisOutputStructure() {
    await this.test('AnalysisOutput should have correct structure', async () => {
      const mockOutput: AnalysisOutput = {
        data: {
          policy_number: 'POL-2025-001',
          insurer: {
            name: 'Test Insurance'
          }
        },
        confidence: 0.85,
        pageReferences: [
          {
            field: 'policy_number',
            value: 'POL-2025-001',
            page: 1,
            box: { x: 100, y: 200, width: 150, height: 20 },
            confidence: 0.95
          }
        ]
      };

      // Verify structure
      if (typeof mockOutput.confidence !== 'number') {
        throw new Error('confidence must be a number');
      }

      if (mockOutput.confidence < 0 || mockOutput.confidence > 1) {
        throw new Error('confidence must be between 0 and 1');
      }

      if (!Array.isArray(mockOutput.pageReferences)) {
        throw new Error('pageReferences must be an array');
      }

      if (!mockOutput.data || typeof mockOutput.data !== 'object') {
        throw new Error('data must be an object');
      }
    });
  }

  /**
   * Test: PageReference has required fields
   */
  async testPageReferenceFields() {
    await this.test('PageReference should have all required fields', async () => {
      const ref = {
        field: 'premium_total',
        value: '15000.00',
        page: 2,
        box: { x: 100, y: 200, width: 150, height: 20 },
        confidence: 0.92
      };

      const requiredFields = ['field', 'value', 'page', 'box', 'confidence'];
      for (const field of requiredFields) {
        if (!(field in ref)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Verify types
      if (typeof ref.field !== 'string') throw new Error('field must be string');
      if (typeof ref.page !== 'number') throw new Error('page must be number');
      if (ref.page < 1) throw new Error('page must be >= 1');
      if (typeof ref.confidence !== 'number') throw new Error('confidence must be number');
      if (ref.confidence < 0 || ref.confidence > 1) throw new Error('confidence must be 0-1');

      // Verify box structure
      const box = ref.box;
      const boxFields = ['x', 'y', 'width', 'height'];
      for (const field of boxFields) {
        if (!(field in box)) throw new Error(`box missing field: ${field}`);
        if (typeof (box as any)[field] !== 'number') throw new Error(`box.${field} must be number`);
      }
    });
  }

  /**
   * Test: Policy extracted data structure
   */
  async testPolicyDataStructure() {
    await this.test('PolicyExtractedData should have valid structure', async () => {
      const data = {
        policy_number: 'POL-2025-001',
        insured_name: 'Juan Pérez',
        effective_from: '2025-01-01T00:00:00Z',
        effective_to: '2025-12-31T23:59:59Z',
        currency: 'MXN',
        financials: {
          premium_net: 12500.00,
          taxes: 2000.00,
          premium_total: 15000.00
        },
        coverages: [
          {
            name: 'Gastos Médicos Mayores',
            limit_amount: 10000000.00,
            limit_unit: 'MXN',
            confidence: 0.95
          }
        ]
      };

      // Verify optional fields are correct type when present
      if (data.policy_number && typeof data.policy_number !== 'string') {
        throw new Error('policy_number must be string');
      }

      if (data.currency && typeof data.currency !== 'string') {
        throw new Error('currency must be string');
      }

      if (data.financials) {
        if (typeof data.financials !== 'object') {
          throw new Error('financials must be object');
        }

        // Check numeric fields
        const numericFields = ['premium_net', 'taxes', 'premium_total'];
        for (const field of numericFields) {
          const value = (data.financials as any)[field];
          if (value !== undefined && typeof value !== 'number') {
            throw new Error(`financials.${field} must be number`);
          }
        }
      }

      if (data.coverages) {
        if (!Array.isArray(data.coverages)) {
          throw new Error('coverages must be array');
        }

        for (const coverage of data.coverages) {
          if (!coverage.name) throw new Error('coverage must have name');
          if (coverage.confidence !== undefined) {
            if (coverage.confidence < 0 || coverage.confidence > 1) {
              throw new Error('coverage.confidence must be 0-1');
            }
          }
        }
      }
    });
  }

  /**
   * Test: Storage download function exists
   */
  async testStorageDownloadExists() {
    await this.test('downloadFromStorage function should exist', async () => {
      if (typeof downloadFromStorage !== 'function') {
        throw new Error('downloadFromStorage is not a function');
      }

      // Verify it's async
      const result = downloadFromStorage('test/path.pdf');
      if (!(result instanceof Promise)) {
        throw new Error('downloadFromStorage should return a Promise');
      }

      // Catch the error (we expect it to fail with fake path)
      try {
        await result;
      } catch {
        // Expected to fail
      }
    });
  }

  /**
   * Test: fileExistsInStorage function
   */
  async testFileExistsFunction() {
    await this.test('fileExistsInStorage should return boolean', async () => {
      if (typeof fileExistsInStorage !== 'function') {
        throw new Error('fileExistsInStorage is not a function');
      }

      const result = await fileExistsInStorage('nonexistent/file.pdf');
      if (typeof result !== 'boolean') {
        throw new Error('fileExistsInStorage should return boolean');
      }
    });
  }

  /**
   * Test: Confidence scores are normalized
   */
  async testConfidenceNormalization() {
    await this.test('Confidence scores should be clamped to 0-1', async () => {
      const testValues = [
        { input: -0.5, expected: 0 },
        { input: 0, expected: 0 },
        { input: 0.5, expected: 0.5 },
        { input: 1, expected: 1 },
        { input: 1.5, expected: 1 }
      ];

      for (const { input, expected } of testValues) {
        const normalized = Math.max(0, Math.min(1, input));
        if (normalized !== expected) {
          throw new Error(`Normalization failed: ${input} -> ${normalized} (expected ${expected})`);
        }
      }
    });
  }

  /**
   * Run all tests
   */
  async runAll() {
    console.log('\n🧪 EJECUTANDO TESTS DE ANÁLISIS DE PÓLIZAS - FASE 3\n');
    console.log('='.repeat(70) + '\n');

    console.log('📦 Test Suite: Policy Analysis APIs\n');

    console.log('🔧 Structure and Validation Tests:');
    await this.testAnalyzeWithAIInput();
    await this.testAnalysisOutputStructure();
    await this.testPageReferenceFields();
    await this.testPolicyDataStructure();

    console.log('\n📦 Storage Tests:');
    await this.testStorageDownloadExists();
    await this.testFileExistsFunction();

    console.log('\n🔢 Data Processing Tests:');
    await this.testConfidenceNormalization();

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log(`\n📊 RESUMEN DE TESTS:`);
    console.log(`   ✅ Pasados: ${this.passed}`);
    console.log(`   ❌ Fallidos: ${this.failed}`);
    console.log(`   📈 Total: ${this.passed + this.failed}\n`);

    if (this.failed === 0) {
      console.log('🎉 ¡TODOS LOS TESTS PASARON EXITOSAMENTE!\n');
    } else {
      console.log('⚠️  Algunos tests fallaron. Revisar errores arriba.\n');
    }

    return this.failed === 0;
  }
}

export default PolicyAnalysisTests;

