/**
 * PDF Coordinates Diagnostic Script - FASE 1
 * 
 * Analiza el sistema de coordenadas de pdf2json para entender
 * cómo mapear correctamente a píxeles en el visor.
 * 
 * Uso:
 *   npx tsx scripts/diagnose-pdf-coordinates.ts <path-to-pdf>
 * 
 * Ejemplo:
 *   npx tsx scripts/diagnose-pdf-coordinates.ts test-fixtures/sample-policy.pdf
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractWithCoordinates } from '../src/lib/pdf/extraction';

interface DiagnosticResult {
  fileName: string;
  pages: number;
  totalBlocks: number;
  coordinateRanges: {
    x: { min: number; max: number; avg: number };
    y: { min: number; max: number; avg: number };
    width: { min: number; max: number; avg: number };
    height: { min: number; max: number; avg: number };
  };
  sampleBlocks: Array<{
    text: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  pageDistribution: Record<number, number>;
}

async function diagnosePdf(pdfPath: string): Promise<DiagnosticResult> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📄 ANÁLISIS DE PDF: ${path.basename(pdfPath)}`);
  console.log(`${'='.repeat(70)}\n`);

  // Leer el archivo
  const buffer = fs.readFileSync(pdfPath);
  console.log(`✅ Archivo cargado: ${buffer.length} bytes\n`);

  // Extraer con coordenadas
  console.log('🔍 Extrayendo texto y coordenadas...');
  const result = await extractWithCoordinates(buffer);
  console.log(`✅ Extracción completada\n`);

  console.log('📊 INFORMACIÓN GENERAL:');
  console.log(`   Páginas: ${result.pages}`);
  console.log(`   Bloques de texto: ${result.coordinates.length}`);

  // Analizar rangos de coordenadas
  const xValues = result.coordinates.map(c => c.x);
  const yValues = result.coordinates.map(c => c.y);
  const widthValues = result.coordinates.map(c => c.width);
  const heightValues = result.coordinates.map(c => c.height);

  const coordinateRanges = {
    x: {
      min: Math.min(...xValues),
      max: Math.max(...xValues),
      avg: xValues.reduce((a, b) => a + b, 0) / xValues.length
    },
    y: {
      min: Math.min(...yValues),
      max: Math.max(...yValues),
      avg: yValues.reduce((a, b) => a + b, 0) / yValues.length
    },
    width: {
      min: Math.min(...widthValues),
      max: Math.max(...widthValues),
      avg: widthValues.reduce((a, b) => a + b, 0) / widthValues.length
    },
    height: {
      min: Math.min(...heightValues),
      max: Math.max(...heightValues),
      avg: heightValues.reduce((a, b) => a + b, 0) / heightValues.length
    }
  };

  console.log('\n📐 RANGOS DE COORDENADAS:');
  console.log(`   X:      min=${coordinateRanges.x.min.toFixed(2)}, max=${coordinateRanges.x.max.toFixed(2)}, avg=${coordinateRanges.x.avg.toFixed(2)}`);
  console.log(`   Y:      min=${coordinateRanges.y.min.toFixed(2)}, max=${coordinateRanges.y.max.toFixed(2)}, avg=${coordinateRanges.y.avg.toFixed(2)}`);
  console.log(`   Width:  min=${coordinateRanges.width.min.toFixed(2)}, max=${coordinateRanges.width.max.toFixed(2)}, avg=${coordinateRanges.width.avg.toFixed(2)}`);
  console.log(`   Height: min=${coordinateRanges.height.min.toFixed(2)}, max=${coordinateRanges.height.max.toFixed(2)}, avg=${coordinateRanges.height.avg.toFixed(2)}`);

  // Distribución por página
  const pageDistribution: Record<number, number> = {};
  result.coordinates.forEach(coord => {
    pageDistribution[coord.page] = (pageDistribution[coord.page] || 0) + 1;
  });

  console.log('\n📄 DISTRIBUCIÓN POR PÁGINA:');
  Object.entries(pageDistribution).forEach(([page, count]) => {
    const percentage = ((count / result.coordinates.length) * 100).toFixed(1);
    console.log(`   Página ${page}: ${count} bloques (${percentage}%)`);
  });

  // Muestrear bloques
  const sampleSize = Math.min(10, result.coordinates.length);
  const sampleBlocks = result.coordinates.slice(0, sampleSize).map(coord => ({
    text: coord.text.substring(0, 50),
    page: coord.page,
    x: Math.round(coord.x * 100) / 100,
    y: Math.round(coord.y * 100) / 100,
    width: Math.round(coord.width * 100) / 100,
    height: Math.round(coord.height * 100) / 100
  }));

  console.log(`\n📝 MUESTRA DE BLOQUES (primeros ${sampleSize}):`);
  sampleBlocks.forEach((block, i) => {
    console.log(`\n   [${i}] Página ${block.page}:`);
    console.log(`       Texto: "${block.text}${block.text.length === 50 ? '...' : ''}"`);
    console.log(`       Coordenadas: x=${block.x}, y=${block.y}, w=${block.width}, h=${block.height}`);
  });

  // Análisis de sistema de unidades
  console.log('\n🔬 ANÁLISIS DE SISTEMA DE UNIDADES:');
  
  // Hipótesis 1: Unidades relativas (0-100)
  const isRelativeSystem = coordinateRanges.x.max <= 100 && coordinateRanges.y.max <= 100;
  console.log(`   ¿Sistema relativo (0-100)? ${isRelativeSystem ? '❌ NO' : '✅ POSIBLE'}`);
  if (isRelativeSystem) {
    console.log(`      (max X: ${coordinateRanges.x.max}, max Y: ${coordinateRanges.y.max})`);
  }
  
  // Hipótesis 2: Puntos (1pt = 1/72 inch)
  // PDF estándar carta: 612pt × 792pt (8.5" × 11")
  const isProbablyPoints = coordinateRanges.x.max > 100 && coordinateRanges.x.max < 650;
  console.log(`   ¿Sistema de puntos (1pt=1/72")?  ${isProbablyPoints ? '✅ PROBABLE' : '❌ IMPROBABLE'}`);
  if (isProbablyPoints) {
    const estimatedWidthInches = coordinateRanges.x.max / 72;
    const estimatedHeightInches = coordinateRanges.y.max / 72;
    console.log(`      Estimado: ${estimatedWidthInches.toFixed(2)}" × ${estimatedHeightInches.toFixed(2)}"`);
    console.log(`      (Carta estándar: 8.5" × 11" = 612pt × 792pt)`);
  }

  // Análisis de dimensiones típicas de texto
  const avgTextHeight = coordinateRanges.height.avg;
  console.log(`\n   📏 Altura promedio de texto: ${avgTextHeight.toFixed(2)}`);
  if (avgTextHeight < 1) {
    console.log(`      → Muy pequeño para puntos (~12pt para texto normal)`);
    console.log(`      → Posiblemente sistema relativo o escalado`);
  } else if (avgTextHeight >= 8 && avgTextHeight <= 16) {
    console.log(`      → Compatible con puntos (texto normal: 10-12pt)`);
  }

  console.log(`\n${'='.repeat(70)}\n`);

  return {
    fileName: path.basename(pdfPath),
    pages: result.pages,
    totalBlocks: result.coordinates.length,
    coordinateRanges,
    sampleBlocks,
    pageDistribution
  };
}

async function analyzeMultiplePdfs(pdfPaths: string[]) {
  const results: DiagnosticResult[] = [];

  for (const pdfPath of pdfPaths) {
    try {
      const result = await diagnosePdf(pdfPath);
      results.push(result);
    } catch (error: any) {
      console.error(`❌ Error analizando ${pdfPath}:`, error.message);
    }
  }

  // Resumen comparativo
  if (results.length > 1) {
    console.log(`\n${'='.repeat(70)}`);
    console.log('📊 RESUMEN COMPARATIVO');
    console.log(`${'='.repeat(70)}\n`);

    console.log('Archivo                | Páginas | Bloques | X max  | Y max  | W max  | H avg');
    console.log('-'.repeat(85));
    results.forEach(r => {
      const fileName = r.fileName.padEnd(20);
      const pages = r.pages.toString().padStart(7);
      const blocks = r.totalBlocks.toString().padStart(7);
      const xMax = r.coordinateRanges.x.max.toFixed(1).padStart(6);
      const yMax = r.coordinateRanges.y.max.toFixed(1).padStart(6);
      const wMax = r.coordinateRanges.width.max.toFixed(1).padStart(6);
      const hAvg = r.coordinateRanges.height.avg.toFixed(2).padStart(5);
      console.log(`${fileName} | ${pages} | ${blocks} | ${xMax} | ${yMax} | ${wMax} | ${hAvg}`);
    });

    console.log('\n💡 CONCLUSIONES:');
    const allUsePoints = results.every(r => 
      r.coordinateRanges.x.max > 100 && r.coordinateRanges.x.max < 650
    );
    
    if (allUsePoints) {
      console.log('   ✅ TODOS los PDFs usan sistema de PUNTOS (1pt = 1/72")');
      console.log('   📌 Para convertir a píxeles:');
      console.log('      pixelX = (coordX / pdfWidthInPoints) * viewportWidthInPixels');
      console.log('      Ejemplo: si PDF es 612pt de ancho y viewport 800px:');
      console.log('      pixelX = (coordX / 612) * 800');
    } else {
      console.log('   ⚠️  Sistemas de coordenadas MIXTOS detectados');
      console.log('   📌 Necesario calibración por PDF individual');
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
📊 Diagnóstico de Coordenadas de PDF - FASE 1

Uso:
  npx tsx scripts/diagnose-pdf-coordinates.ts <pdf-file> [<pdf-file2> ...]

Ejemplos:
  npx tsx scripts/diagnose-pdf-coordinates.ts test-fixtures/sample-policy.pdf
  npx tsx scripts/diagnose-pdf-coordinates.ts *.pdf

Este script analiza el sistema de coordenadas usado por pdf2json
para determinar cómo mapear correctamente a píxeles en el visor.
`);
    process.exit(0);
  }

  // Validar que los archivos existen
  const validPaths = args.filter(p => {
    if (!fs.existsSync(p)) {
      console.error(`❌ Archivo no encontrado: ${p}`);
      return false;
    }
    return true;
  });

  if (validPaths.length === 0) {
    console.error('❌ No se encontraron archivos válidos');
    process.exit(1);
  }

  await analyzeMultiplePdfs(validPaths);
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

