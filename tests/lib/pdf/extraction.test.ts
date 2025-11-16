/**
 * Tests for PDF Extraction with Coordinates
 * 
 * FASE 2: Mejora de Extracción de PDFs
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 7.2 (Días 4-6)
 * 
 * These tests verify that extractWithCoordinates() correctly:
 * - Extracts text from PDF
 * - Captures coordinates for each text block
 * - Handles multiple pages
 * - Provides utility functions for coordinate manipulation
 * 
 * Note: These are programmatic tests since no test framework is installed.
 * Run with: node tests/lib/pdf/test-extraction-runner.js
 */

import {
  extractWithCoordinates,
  extractTextFromPDF,
  isValidExtractionResult,
  filterCoordinatesByPage,
  findTextCoordinates,
  calculateBoundingBox,
  type ExtractionResult,
  type TextCoordinate
} from '../../../src/lib/pdf/extraction';
import fs from 'fs';
import path from 'path';

/**
 * Test suite for PDF extraction functions
 */
export class ExtractionTests {
  private passed = 0;
  private failed = 0;
  private testPdfBuffer: Buffer | null = null;

  /**
   * Initialize test suite with a sample PDF
   */
  async initialize() {
    // Try to find a sample PDF in the project
    const possiblePaths = [
      './test-fixtures/sample-policy.pdf',
      './tests/fixtures/sample.pdf',
      '../test-data/sample.pdf'
    ];

    for (const testPath of possiblePaths) {
      try {
        const fullPath = path.resolve(testPath);
        if (fs.existsSync(fullPath)) {
          this.testPdfBuffer = fs.readFileSync(fullPath);
          console.log(`✅ Loaded test PDF from: ${testPath}`);
          return true;
        }
      } catch (e) {
        // Continue trying other paths
      }
    }

    console.warn('⚠️  No test PDF found. Some tests will be skipped.');
    console.warn('   To run full tests, place a PDF at: ./test-fixtures/sample-policy.pdf');
    return false;
  }

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
   * Test: extractWithCoordinates should return correct structure
   */
  async testExtractionStructure() {
    await this.test('extractWithCoordinates should return correct structure', async () => {
      if (!this.testPdfBuffer) {
        throw new Error('No test PDF available');
      }

      const result = await extractWithCoordinates(this.testPdfBuffer);

      // Verify structure
      if (!result.text || typeof result.text !== 'string') {
        throw new Error('Missing or invalid text property');
      }

      if (!result.pages || typeof result.pages !== 'number') {
        throw new Error('Missing or invalid pages property');
      }

      if (!Array.isArray(result.coordinates)) {
        throw new Error('Coordinates should be an array');
      }

      if (result.pages <= 0) {
        throw new Error('Pages should be > 0');
      }
    });
  }

  /**
   * Test: Coordinates should have required properties
   */
  async testCoordinateProperties() {
    await this.test('Coordinates should have required properties', async () => {
      if (!this.testPdfBuffer) {
        throw new Error('No test PDF available');
      }

      const result = await extractWithCoordinates(this.testPdfBuffer);

      if (result.coordinates.length === 0) {
        throw new Error('No coordinates extracted');
      }

      const firstCoord = result.coordinates[0];

      // Check all required properties
      const requiredProps = ['text', 'page', 'x', 'y', 'width', 'height'];
      for (const prop of requiredProps) {
        if (!(prop in firstCoord)) {
          throw new Error(`Missing property: ${prop}`);
        }
      }

      // Check types
      if (typeof firstCoord.text !== 'string') {
        throw new Error('text should be string');
      }
      if (typeof firstCoord.page !== 'number') {
        throw new Error('page should be number');
      }
      if (typeof firstCoord.x !== 'number') {
        throw new Error('x should be number');
      }
      if (typeof firstCoord.y !== 'number') {
        throw new Error('y should be number');
      }
      if (typeof firstCoord.width !== 'number') {
        throw new Error('width should be number');
      }
      if (typeof firstCoord.height !== 'number') {
        throw new Error('height should be number');
      }
    });
  }

  /**
   * Test: Pages should be 1-indexed
   */
  async testPagesIndexing() {
    await this.test('Pages should be 1-indexed', async () => {
      if (!this.testPdfBuffer) {
        throw new Error('No test PDF available');
      }

      const result = await extractWithCoordinates(this.testPdfBuffer);

      // Check that page numbers are >= 1
      const invalidPages = result.coordinates.filter(c => c.page < 1);
      if (invalidPages.length > 0) {
        throw new Error(`Found ${invalidPages.length} coordinates with page < 1`);
      }

      // Check that no page > total pages
      const outOfRangePages = result.coordinates.filter(c => c.page > result.pages);
      if (outOfRangePages.length > 0) {
        throw new Error(`Found ${outOfRangePages.length} coordinates with page > total pages`);
      }
    });
  }

  /**
   * Test: extractTextFromPDF should work (legacy function)
   */
  async testLegacyExtraction() {
    await this.test('extractTextFromPDF should work (legacy)', async () => {
      if (!this.testPdfBuffer) {
        throw new Error('No test PDF available');
      }

      const result = await extractTextFromPDF(this.testPdfBuffer);

      if (!result.text || typeof result.text !== 'string') {
        throw new Error('Missing or invalid text');
      }

      if (!result.pages || typeof result.pages !== 'number') {
        throw new Error('Missing or invalid pages');
      }

      // Should NOT have coordinates (legacy)
      if ('coordinates' in result) {
        throw new Error('Legacy function should not return coordinates');
      }
    });
  }

  /**
   * Test: isValidExtractionResult validator
   */
  async testResultValidator() {
    await this.test('isValidExtractionResult should validate correctly', async () => {
      // Valid result
      const valid: ExtractionResult = {
        text: 'Test text',
        pages: 1,
        coordinates: []
      };

      if (!isValidExtractionResult(valid)) {
        throw new Error('Should validate correct result');
      }

      // Invalid results
      const invalid1 = { text: 'Test', pages: 0, coordinates: [] };
      if (isValidExtractionResult(invalid1)) {
        throw new Error('Should reject result with 0 pages');
      }

      const invalid2 = { text: 'Test', pages: 1 }; // missing coordinates
      if (isValidExtractionResult(invalid2)) {
        throw new Error('Should reject result without coordinates');
      }

      const invalid3 = null;
      if (isValidExtractionResult(invalid3)) {
        throw new Error('Should reject null');
      }
    });
  }

  /**
   * Test: filterCoordinatesByPage utility
   */
  async testFilterByPage() {
    await this.test('filterCoordinatesByPage should filter correctly', async () => {
      const coords: TextCoordinate[] = [
        { text: 'Page 1 text', page: 1, x: 0, y: 0, width: 100, height: 20 },
        { text: 'Page 2 text', page: 2, x: 0, y: 0, width: 100, height: 20 },
        { text: 'More Page 1', page: 1, x: 0, y: 30, width: 100, height: 20 },
      ];

      const page1 = filterCoordinatesByPage(coords, 1);
      if (page1.length !== 2) {
        throw new Error(`Expected 2 coords for page 1, got ${page1.length}`);
      }

      const page2 = filterCoordinatesByPage(coords, 2);
      if (page2.length !== 1) {
        throw new Error(`Expected 1 coord for page 2, got ${page2.length}`);
      }

      const page3 = filterCoordinatesByPage(coords, 3);
      if (page3.length !== 0) {
        throw new Error(`Expected 0 coords for page 3, got ${page3.length}`);
      }
    });
  }

  /**
   * Test: findTextCoordinates utility
   */
  async testFindText() {
    await this.test('findTextCoordinates should find text', async () => {
      const coords: TextCoordinate[] = [
        { text: 'Hello World', page: 1, x: 0, y: 0, width: 100, height: 20 },
        { text: 'Goodbye Moon', page: 1, x: 0, y: 30, width: 100, height: 20 },
        { text: 'Hello Again', page: 2, x: 0, y: 0, width: 100, height: 20 },
      ];

      const helloCoords = findTextCoordinates(coords, 'hello');
      if (helloCoords.length !== 2) {
        throw new Error(`Expected 2 'hello' coords, got ${helloCoords.length}`);
      }

      const worldCoords = findTextCoordinates(coords, 'World');
      if (worldCoords.length !== 1) {
        throw new Error(`Expected 1 'world' coord, got ${worldCoords.length}`);
      }

      const noneCoords = findTextCoordinates(coords, 'notfound');
      if (noneCoords.length !== 0) {
        throw new Error(`Expected 0 'notfound' coords, got ${noneCoords.length}`);
      }
    });
  }

  /**
   * Test: calculateBoundingBox utility
   */
  async testBoundingBox() {
    await this.test('calculateBoundingBox should calculate correctly', async () => {
      const coords: TextCoordinate[] = [
        { text: 'Text 1', page: 1, x: 10, y: 20, width: 100, height: 20 },
        { text: 'Text 2', page: 1, x: 50, y: 60, width: 80, height: 15 },
      ];

      const bbox = calculateBoundingBox(coords);

      if (!bbox) {
        throw new Error('Should return bounding box');
      }

      // Min x should be 10
      if (bbox.x !== 10) {
        throw new Error(`Expected x=10, got ${bbox.x}`);
      }

      // Min y should be 20
      if (bbox.y !== 20) {
        throw new Error(`Expected y=20, got ${bbox.y}`);
      }

      // Width should be 50+80-10 = 120
      if (bbox.width !== 120) {
        throw new Error(`Expected width=120, got ${bbox.width}`);
      }

      // Height should be 60+15-20 = 55
      if (bbox.height !== 55) {
        throw new Error(`Expected height=55, got ${bbox.height}`);
      }
    });
  }

  /**
   * Test: Empty coordinates should return null for bounding box
   */
  async testEmptyBoundingBox() {
    await this.test('calculateBoundingBox should return null for empty array', async () => {
      const bbox = calculateBoundingBox([]);

      if (bbox !== null) {
        throw new Error('Should return null for empty coordinates');
      }
    });
  }

  /**
   * Test: Error handling for invalid PDF
   */
  async testErrorHandling() {
    await this.test('extractWithCoordinates should reject invalid PDF', async () => {
      const invalidBuffer = Buffer.from('This is not a PDF file');

      try {
        await extractWithCoordinates(invalidBuffer);
        throw new Error('Should have thrown error for invalid PDF');
      } catch (error: any) {
        // Expected to throw
        if (!error.message.includes('parse') && !error.message.includes('PDF')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    });
  }

  /**
   * Test: Coordinates count should be reasonable
   */
  async testCoordinatesCount() {
    await this.test('Extracted coordinates count should be reasonable', async () => {
      if (!this.testPdfBuffer) {
        throw new Error('No test PDF available');
      }

      const result = await extractWithCoordinates(this.testPdfBuffer);

      // Should have at least some coordinates
      if (result.coordinates.length === 0) {
        throw new Error('Should extract some coordinates');
      }

      // Coordinates count should be related to text length
      // (very rough heuristic: more text = more coordinates)
      if (result.text.length > 1000 && result.coordinates.length < 10) {
        throw new Error('Suspiciously few coordinates for text length');
      }

      console.log(`     Info: Extracted ${result.coordinates.length} coordinate blocks`);
    });
  }

  /**
   * Run all tests
   */
  async runAll() {
    console.log('\n🧪 EJECUTANDO TESTS DE EXTRACCIÓN PDF - FASE 2\n');
    console.log('='.repeat(70) + '\n');

    const hasPdf = await this.initialize();

    console.log('📦 Test Suite: PDF Extraction with Coordinates\n');

    // Tests that don't require PDF
    console.log('🔧 Utility Function Tests:');
    await this.testResultValidator();
    await this.testFilterByPage();
    await this.testFindText();
    await this.testBoundingBox();
    await this.testEmptyBoundingBox();
    await this.testErrorHandling();

    if (hasPdf) {
      console.log('\n📄 PDF Extraction Tests (with sample PDF):');
      await this.testExtractionStructure();
      await this.testCoordinateProperties();
      await this.testPagesIndexing();
      await this.testLegacyExtraction();
      await this.testCoordinatesCount();
    } else {
      console.log('\n⚠️  PDF Extraction Tests: SKIPPED (no sample PDF)');
      console.log('   To run full tests, place a PDF at: ./test-fixtures/sample-policy.pdf\n');
    }

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

// Export for use in test runner
export default ExtractionTests;

