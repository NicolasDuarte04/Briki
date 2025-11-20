/**
 * POST /api/test/diagnose-coordinates
 * 
 * API endpoint para ejecutar diagnóstico de coordenadas de PDF
 * desde la aplicación web.
 * 
 * FASE 1: Integración de script de diagnóstico
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { extractWithCoordinates } from '@/lib/pdf/extraction';

// Force Node.js runtime (required for Buffer and file operations)
export const runtime = 'nodejs';

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
  systemAnalysis: {
    isRelativeSystem: boolean;
    isProbablyPoints: boolean;
    estimatedWidthInches?: number | undefined;
    estimatedHeightInches?: number | undefined;
    avgTextHeight: number;
    conclusion: string;
    warnings?: string[];
  };
}

/**
 * Analiza un PDF y retorna diagnóstico de coordenadas
 */
async function diagnosePdf(buffer: Buffer, fileName: string): Promise<DiagnosticResult> {
  const result = await extractWithCoordinates(buffer);

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

  // Distribución por página
  const pageDistribution: Record<number, number> = {};
  result.coordinates.forEach(coord => {
    pageDistribution[coord.page] = (pageDistribution[coord.page] || 0) + 1;
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

  // Análisis de sistema de unidades
  // ✅ CORRECCIÓN: Validar también width para detección correcta
  // Sistema relativo requiere: X, Y, Width, Height todos ≤ 100
  const isRelativeSystem = 
    coordinateRanges.x.max <= 100 && 
    coordinateRanges.y.max <= 100 &&
    coordinateRanges.width.max <= 100;
  
  // Sistema de puntos: X/Y entre 100-650 (típico para PDFs carta/A4)
  const isProbablyPoints = 
    coordinateRanges.x.max > 100 && 
    coordinateRanges.x.max < 650 &&
    coordinateRanges.y.max > 100 &&
    coordinateRanges.y.max < 850;
  
  let estimatedWidthInches: number | undefined;
  let estimatedHeightInches: number | undefined;
  
  if (isProbablyPoints) {
    estimatedWidthInches = coordinateRanges.x.max / 72;
    estimatedHeightInches = coordinateRanges.y.max / 72;
  }

  const avgTextHeight = coordinateRanges.height.avg;
  
  // ⚠️ ADVERTENCIAS
  const warnings: string[] = [];
  
  // Advertencia 1: Height siempre 0
  if (coordinateRanges.height.max === 0) {
    warnings.push('Height siempre es 0. pdf2json no proporciona altura en este PDF. Se requiere calcular altura estimada o usar valor por defecto para highlights.');
  }
  
  // Advertencia 2: Sistema inconsistente
  const hasWidthIssue = coordinateRanges.width.max > 100 && coordinateRanges.x.max <= 100;
  if (hasWidthIssue) {
    warnings.push(`Sistema inconsistente: X/Y relativos (0-100) pero Width excede 100 (max: ${coordinateRanges.width.max.toFixed(2)}). Posible sistema híbrido.`);
  }
  
  let conclusion = '';
  if (isRelativeSystem) {
    conclusion = 'Sistema relativo (0-100). Conversión: pixelX = (coordX / 100) * viewportWidth';
  } else if (isProbablyPoints) {
    conclusion = `Sistema de puntos (1pt = 1/72"). PDF estimado: ${estimatedWidthInches?.toFixed(2)}" × ${estimatedHeightInches?.toFixed(2)}". Conversión: pixelX = (coordX / pdfWidthPoints) * viewportWidth`;
  } else {
    // Sistema mixto o no identificado
    if (hasWidthIssue) {
      conclusion = `⚠️ Sistema inconsistente detectado: X/Y relativos (0-100) pero Width excede 100 (max: ${coordinateRanges.width.max.toFixed(2)}). Posible sistema híbrido o width calculado diferente. Requiere investigación adicional.`;
    } else {
      conclusion = 'Sistema de coordenadas no identificado claramente. Requiere calibración manual.';
    }
  }

  return {
    fileName,
    pages: result.pages,
    totalBlocks: result.coordinates.length,
    coordinateRanges,
    sampleBlocks,
    pageDistribution,
    systemAnalysis: {
      isRelativeSystem,
      isProbablyPoints,
      ...(estimatedWidthInches !== undefined && { estimatedWidthInches }),
      ...(estimatedHeightInches !== undefined && { estimatedHeightInches }),
      avgTextHeight,
      conclusion,
      ...(warnings.length > 0 && { warnings })
    }
  };
}

/**
 * POST handler - Diagnostica coordenadas de un PDF
 */
export async function POST(request: NextRequest) {
  try {
    // Autenticación
    const { user, currentOrg } = await getCurrentOrg();
    
    // Obtener archivo del FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo PDF' },
        { status: 400 }
      );
    }

    // Validar que es PDF
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'El archivo debe ser un PDF' },
        { status: 400 }
      );
    }

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ejecutar diagnóstico
    const diagnostic = await diagnosePdf(buffer, file.name);

    return NextResponse.json({
      success: true,
      diagnostic
    });

  } catch (error: any) {
    console.error('❌ Error en diagnóstico de coordenadas:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al analizar PDF: ' + error.message,
        details: error.message
      },
      { status: 500 }
    );
  }
}

