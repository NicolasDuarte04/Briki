/**
 * POST /api/quotes/analyze
 * 
 * Analyze a quote PDF and extract structured data using AI.
 * Analogous to /api/policies/analyze but for quotations.
 * 
 * Body:
 * - artifactId: ID of the PDF artifact to analyze
 * - extractionMethod: 'manual' | 'ocr' | 'hybrid' (default: 'hybrid')
 * - force: boolean - re-analyze even if analysis exists (default: false)
 * 
 * NOTA: Los datos extraídos se guardan en el campo JSON extractedData,
 * NO en columnas individuales, igual que PolicyAnalysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';
import { downloadFromStorage } from '@/lib/storage/downloadFromStorage';
import { extractWithCoordinates } from '@/lib/pdf/extraction';
import { analyzeQuoteWithAI } from '@/lib/openai/quoteAnalysis';
import { tryRecordAuditLog } from '@/lib/audit';
import { getOrgQuotesContainerId } from '@/lib/helpers/getOrgQuotesContainer';

// Force Node.js runtime (required for Buffer and file operations)
export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes for large PDF analysis

/**
 * Request body interface
 */
interface AnalyzeQuoteRequest {
  artifactId: string;
  extractionMethod?: 'manual' | 'ocr' | 'hybrid';
  force?: boolean;
  insuranceCategory?: string; // Category selected by user at upload
}

export async function POST(request: NextRequest) {
  try {
    console.log('📋 POST /api/quotes/analyze: Iniciando...');

    // =========================================================================
    // 1. AUTHENTICATION
    // =========================================================================
    
    const { user, currentOrg } = await getCurrentOrg();

    console.log(`👤 Usuario: ${user.id}`);
    console.log(`🏢 Organización: ${currentOrg.id}`);

    // =========================================================================
    // 2. PARSE REQUEST
    // =========================================================================

    const body = await request.json() as AnalyzeQuoteRequest;
    const { artifactId, extractionMethod = 'hybrid', force = false, insuranceCategory } = body;

    if (!artifactId) {
      return NextResponse.json(
        { error: 'artifactId is required' },
        { status: 400 }
      );
    }

    console.log(`📄 Artifact ID: ${artifactId}`);
    console.log(`🔧 Método de extracción: ${extractionMethod}`);
    if (force) {
      console.log(`🔄 Re-análisis forzado activado`);
    }

    // =========================================================================
    // 3. VERIFY ARTIFACT ACCESS
    // =========================================================================

    // Get quotes container for this org
    const containerId = await getOrgQuotesContainerId(currentOrg.id);

    if (!containerId) {
      return NextResponse.json(
        { error: 'Quote container not found. Upload a quote first.' },
        { status: 404 }
      );
    }

    // Verify artifact exists and belongs to quotes container
    const artifact = await prisma.artifact.findFirst({
      where: {
        id: artifactId,
        caseId: containerId, // Must be in quotes container
      },
      include: {
        case: true
      }
    });

    if (!artifact) {
      console.log('❌ Artifact no encontrado o sin acceso');
      return NextResponse.json(
        { error: 'Quote artifact not found or access denied' },
        { status: 404 }
      );
    }

    console.log(`✅ Artifact encontrado: ${artifact.fileName}`);

    // =========================================================================
    // 4. VALIDATE PDF
    // =========================================================================

    if (artifact.sourceType !== 'pdf' && artifact.contentType !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Artifact must be a PDF file' },
        { status: 400 }
      );
    }

    if (!artifact.fileId || artifact.fileId.trim() === '') {
      return NextResponse.json(
        { error: 'Artifact fileId is missing. Cannot analyze PDF without file reference.' },
        { status: 400 }
      );
    }

    // =========================================================================
    // 5. CHECK EXISTING ANALYSIS
    // =========================================================================

    const existingAnalysis = await prisma.quoteAnalysis.findFirst({
      where: {
        artifactId: artifact.id
      }
    });

    if (existingAnalysis && !force) {
      console.log(`⚠️  Ya existe un análisis para este artifact: ${existingAnalysis.id}`);

      const analysisWithRefs = await prisma.quoteAnalysis.findUnique({
        where: { id: existingAnalysis.id },
        include: { pageReferences: true }
      });

      return NextResponse.json({
        success: true,
        analysis: analysisWithRefs,
        note: 'Returning existing analysis. Use { "force": true } to re-analyze.'
      });
    }

    // Delete existing if force=true
    if (existingAnalysis && force) {
      console.log(`🗑️  Eliminando análisis existente: ${existingAnalysis.id}`);

      // Delete page references first
      await prisma.quotePageReference.deleteMany({
        where: { quoteAnalysisId: existingAnalysis.id }
      });

      // Delete case links
      await prisma.caseQuoteLink.deleteMany({
        where: { quoteAnalysisId: existingAnalysis.id }
      });

      // Delete analysis
      await prisma.quoteAnalysis.delete({
        where: { id: existingAnalysis.id }
      });

      console.log(`✅ Análisis anterior eliminado`);
    }

    // =========================================================================
    // 6. DOWNLOAD PDF
    // =========================================================================

    console.log('📥 Descargando PDF desde Storage...');
    const pdfBuffer = await downloadFromStorage(artifact.fileId);
    console.log(`✅ PDF descargado: ${pdfBuffer.length} bytes`);

    // =========================================================================
    // 7. EXTRACT TEXT AND COORDINATES
    // =========================================================================

    console.log('📚 Extrayendo texto y coordenadas...');
    const extractionResult = await extractWithCoordinates(pdfBuffer);
    console.log(`✅ Extracción completada:`);
    console.log(`   Texto: ${extractionResult.text.length} caracteres`);
    console.log(`   Páginas: ${extractionResult.pages}`);
    console.log(`   Coordenadas: ${extractionResult.coordinates.length} bloques`);

    // =========================================================================
    // 8. ANALYZE WITH AI
    // =========================================================================

    console.log('🤖 Analizando cotización con IA...');

    // Timeout of 110 seconds (maxDuration is 120s)
    const TIMEOUT_MS = 110000;

    const analysisPromise = analyzeQuoteWithAI({
      text: extractionResult.text,
      coordinates: extractionResult.coordinates,
      extractionMethod,
      ...(insuranceCategory !== undefined && { insuranceCategory }),
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI analysis timed out after 110s')), TIMEOUT_MS);
    });

    const analysisResult = await Promise.race([analysisPromise, timeoutPromise]);

    console.log(`✅ Análisis de IA completado:`);
    console.log(`   Confianza: ${analysisResult.confidence.toFixed(2)}`);
    console.log(`   Referencias: ${analysisResult.pageReferences.length}`);

    // =========================================================================
    // 9. SAVE TO DATABASE
    // =========================================================================

    console.log('💾 Guardando análisis en base de datos...');

    // Los datos se guardan en extractedData como JSON, NO en columnas individuales
    const quoteAnalysis = await prisma.quoteAnalysis.create({
      data: {
        artifactId: artifact.id,
        caseId: containerId,
        orgId: currentOrg.id,
        
        // Full extracted data as JSON (el patrón correcto)
        extractedData: analysisResult.data as any,
        
        // Analysis metadata
        extractionMethod,
        overallConfidence: analysisResult.confidence,
        extractedAt: new Date(),
        ...(insuranceCategory ? { insuranceCategory } : {}),
        
        // Page references
        pageReferences: {
          create: analysisResult.pageReferences.map(ref => ({
            fieldName: ref.field,
            fieldValue: ref.value,
            pageNumber: ref.page,
            boundingBox: ref.box as any,
            confidence: ref.confidence
          }))
        }
      },
      include: {
        pageReferences: true
      }
    });

    console.log(`✅ Análisis guardado: ${quoteAnalysis.id}`);

    // =========================================================================
    // 10. AUDIT LOG (usando la interfaz correcta)
    // =========================================================================

    await tryRecordAuditLog({
      caseId: containerId,
      actor: user.email || user.id,
      action: 'quote.analyzed',
      payload: {
        artifactId: artifact.id,
        analysisId: quoteAnalysis.id,
        fileName: artifact.fileName,
        confidence: Number(quoteAnalysis.overallConfidence),
        extractionMethod,
        fieldsExtracted: Object.keys(analysisResult.data).length,
        referencesCount: quoteAnalysis.pageReferences.length,
        orgId: currentOrg.id,
      }
    });

    // =========================================================================
    // 11. RESPONSE
    // =========================================================================

    return NextResponse.json({
      success: true,
      analysis: quoteAnalysis
    });

  } catch (error: any) {
    console.error('❌ Error en POST /api/quotes/analyze:', error);

    // Handle specific errors
    if (error.message?.includes('timed out')) {
      return NextResponse.json(
        { error: 'Analysis timed out. The document might be too large or complex.' },
        { status: 504 }
      );
    }

    if (error.message?.includes('OpenAI')) {
      return NextResponse.json(
        { error: 'AI analysis failed: ' + error.message },
        { status: 503 }
      );
    }

    if (error.message?.includes('Storage')) {
      return NextResponse.json(
        { error: 'Failed to retrieve PDF: ' + error.message },
        { status: 500 }
      );
    }

    if (error.message?.includes('parse PDF')) {
      return NextResponse.json(
        { error: 'Invalid PDF file: ' + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
