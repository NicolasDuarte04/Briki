/**
 * POST /api/policies/analyze
 * 
 * Analyze a policy PDF and extract structured data using AI
 * 
 * FASE 3: API de Análisis de Pólizas
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 6.3.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';
import { downloadFromStorage } from '@/lib/storage/downloadFromStorage';
import { extractWithCoordinates } from '@/lib/pdf/extraction';
import { analyzeWithAI } from '@/lib/openai/policyAnalysis';
import { tryRecordAuditLog } from '@/lib/audit';

// Force Node.js runtime (required for Buffer and file operations)
export const runtime = 'nodejs';

/**
 * Request body interface
 */
interface AnalyzeRequest {
  artifactId: string;
  extractionMethod?: 'manual' | 'ocr' | 'hybrid';
  force?: boolean; // ✅ FASE 6 REFINAMIENTO: Permitir re-análisis forzado
}

/**
 * POST handler - Analyze a policy PDF
 * 
 * @param request - Next.js request object
 * @returns Policy analysis with structured data and page references
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📋 POST /api/policies/analyze: Iniciando...');

    // 1. Authentication and validation
    const { user, currentOrg } = await getCurrentOrg();

    console.log(`👤 Usuario: ${user.id}`);
    console.log(`🏢 Organización: ${currentOrg.id}`);

    // 2. Parse request body
    const body = await request.json() as AnalyzeRequest;
    const { artifactId, extractionMethod = 'hybrid', force = false } = body;

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

    // 3. Verify artifact exists and user has access (RLS)
    const artifact = await prisma.artifact.findFirst({
      where: {
        id: artifactId,
        case: {
          orgId: currentOrg.id // RLS: Only artifacts from user's org
        }
      },
      include: {
        case: true
      }
    });

    if (!artifact) {
      console.log('❌ Artifact no encontrado o sin acceso');
      return NextResponse.json(
        { error: 'Artifact not found or access denied' },
        { status: 404 }
      );
    }

    console.log(`✅ Artifact encontrado: ${artifact.fileName}`);
    console.log(`📁 Caso: ${artifact.caseId}`);

    // 4. Verify artifact is a PDF
    if (artifact.sourceType !== 'pdf' && artifact.contentType !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Artifact must be a PDF file' },
        { status: 400 }
      );
    }

    // ✅ CORRECCIÓN: Validar fileId antes de intentar descarga
    // artifact.fileId puede ser null según el schema Prisma
    if (!artifact.fileId || artifact.fileId.trim() === '') {
      return NextResponse.json(
        { error: 'Artifact fileId is missing. Cannot analyze PDF without file reference.' },
        { status: 400 }
      );
    }

    // 5. Check if already analyzed
    const existingAnalysis = await prisma.policyAnalysis.findFirst({
      where: {
        artifactId: artifact.id
      }
    });

    if (existingAnalysis && !force) {
      console.log(`⚠️  Ya existe un análisis para este artifact: ${existingAnalysis.id}`);
      console.log(`   Usa { "force": true } para re-analizar`);

      const analysisWithRefs = await prisma.policyAnalysis.findUnique({
        where: { id: existingAnalysis.id },
        include: { pageReferences: true }
      });

      return NextResponse.json({
        success: true,
        analysis: analysisWithRefs,
        note: 'Returning existing analysis. Use { "force": true } to re-analyze.'
      });
    }

    // ✅ FASE 6 REFINAMIENTO: Eliminar análisis existente si force=true
    if (existingAnalysis && force) {
      console.log(`🗑️  Eliminando análisis existente: ${existingAnalysis.id}`);

      // Delete cascade: también elimina pageReferences automáticamente
      await prisma.policyAnalysis.delete({
        where: { id: existingAnalysis.id }
      });

      console.log(`✅ Análisis anterior eliminado, procediendo con nuevo análisis...`);
    }

    // 6. Download PDF from Storage
    console.log('📥 Descargando PDF desde Storage...');
    const pdfBuffer = await downloadFromStorage(artifact.fileId);
    console.log(`✅ PDF descargado: ${pdfBuffer.length} bytes`);

    // 7. Extract text and coordinates
    console.log('📚 Extrayendo texto y coordenadas...');
    const extractionResult = await extractWithCoordinates(pdfBuffer);
    console.log(`✅ Extracción completada:`);
    console.log(`   Texto: ${extractionResult.text.length} caracteres`);
    console.log(`   Páginas: ${extractionResult.pages}`);
    console.log(`   Coordenadas: ${extractionResult.coordinates.length} bloques`);

    // 8. Analyze with AI (with timeout)
    console.log('🤖 Analizando con IA...');

    // Timeout de 50 segundos (Vercel Pro function limit es 60s usualmente)
    const TIMEOUT_MS = 50000;

    const analysisPromise = analyzeWithAI({
      text: extractionResult.text,
      coordinates: extractionResult.coordinates,
      extractionMethod
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI analysis timed out after 50s')), TIMEOUT_MS);
    });

    const analysisResult = await Promise.race([analysisPromise, timeoutPromise]);

    console.log(`✅ Análisis de IA completado:`);
    console.log(`   Confianza: ${analysisResult.confidence.toFixed(2)}`);
    console.log(`   Referencias: ${analysisResult.pageReferences.length}`);

    // 9. Save to database
    console.log('💾 Guardando análisis en base de datos...');
    const policyAnalysis = await prisma.policyAnalysis.create({
      data: {
        artifactId: artifact.id,
        caseId: artifact.caseId,
        orgId: currentOrg.id,
        extractedData: analysisResult.data as any, // Prisma Json type
        extractionMethod,
        overallConfidence: analysisResult.confidence,
        extractedAt: new Date(),
        pageReferences: {
          create: analysisResult.pageReferences.map(ref => ({
            fieldName: ref.field,
            fieldValue: ref.value,
            pageNumber: ref.page,
            boundingBox: ref.box as any, // Prisma Json type
            confidence: ref.confidence
          }))
        }
      },
      include: {
        pageReferences: true
      }
    });

    console.log(`✅ Análisis guardado: ${policyAnalysis.id}`);

    // 10. Record audit log
    await tryRecordAuditLog({
      caseId: artifact.caseId,
      actor: user.id,
      action: 'policy_analyzed',
      tool: 'analyze_api',
      payload: {
        policyAnalysisId: policyAnalysis.id,
        artifactId: artifact.id,
        fileName: artifact.fileName,
        confidence: policyAnalysis.overallConfidence,
        extractionMethod,
        fieldsExtracted: Object.keys(analysisResult.data).length,
        referencesCount: policyAnalysis.pageReferences.length
      }
    });

    // 11. Success response
    return NextResponse.json({
      success: true,
      analysis: policyAnalysis
    });

  } catch (error: any) {
    console.error('❌ Error en POST /api/policies/analyze:', error);

    // Handle specific errors
    if (error.message?.includes('timed out')) {
      return NextResponse.json(
        { error: 'Analysis timed out. The document might be too large or complex.' },
        { status: 504 } // Gateway Timeout
      );
    }

    if (error.message?.includes('OpenAI')) {
      return NextResponse.json(
        { error: 'AI analysis failed: ' + error.message },
        { status: 503 } // Service Unavailable
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

    // Generic error
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

