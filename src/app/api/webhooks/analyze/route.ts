/**
 * @fileoverview Webhook que QStash llama para ejecutar el análisis de póliza
 * 
 * Este endpoint:
 * 1. Verifica la firma de QStash (seguridad)
 * 2. Actualiza CaseActivity a PROCESSING
 * 3. Ejecuta la lógica de análisis (descarga PDF, extrae, analiza con IA)
 * 4. Guarda PolicyAnalysis en DB
 * 5. Actualiza CaseActivity a COMPLETED o FAILED
 * 
 * IMPORTANTE: Este endpoint tiene un tiempo de ejecución largo (hasta 5 min)
 * porque QStash no tiene el límite de 30s de Vercel.
 * 
 * POST /api/webhooks/analyze
 * Body: AnalyzeJobPayload (de QStash)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { queue, type AnalyzeJobPayload } from '@/lib/queue';
import { downloadFromStorage } from '@/lib/storage/downloadFromStorage';
import { extractWithCoordinates } from '@/lib/pdf/extraction';
import { analyzeWithAI } from '@/lib/openai/policyAnalysis';
import { tryRecordAuditLog } from '@/lib/audit';

// Node.js runtime para operaciones con Buffer
export const runtime = 'nodejs';

// Timeout más alto porque QStash espera hasta 5 minutos
export const maxDuration = 300; // 5 minutos (Vercel Pro)

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Actualizar progreso del job
// ═══════════════════════════════════════════════════════════════════════════

async function updateJobProgress(
  jobId: string, 
  progressPct: number, 
  progressMsg: string
) {
  await prisma.caseActivity.update({
    where: { id: jobId },
    data: { progressPct, progressMsg },
  });
}

async function completeJob(
  jobId: string, 
  result: { analysisId?: string; error?: string }
) {
  const success = !result.error;
  const errorMsg = result.error ?? null;
  
  await prisma.caseActivity.update({
    where: { id: jobId },
    data: {
      status: success ? 'COMPLETED' : 'FAILED',
      completedAt: new Date(),
      errorMessage: errorMsg,
      progressPct: success ? 100 : null,
      progressMsg: success ? 'Análisis completado' : errorMsg,
      ...(result.analysisId && { resultData: { analysisId: result.analysisId } }),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// POST HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let jobId: string | null = null;
  
  try {
    // 1. Leer body como texto para verificar firma
    const bodyText = await req.text();
    const signature = req.headers.get('upstash-signature');
    
    // 2. Verificar firma de QStash
    const isValid = await queue.verifySignature(signature, bodyText);
    
    if (!isValid) {
      console.error('[Webhook/Analyze] Firma inválida');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    // 3. Parsear payload
    const payload: AnalyzeJobPayload = JSON.parse(bodyText);
    jobId = payload.jobId;
    
    console.log(`[Webhook/Analyze] Iniciando job ${jobId} para artifact ${payload.artifactId}`);
    
    // 4. Marcar job como PROCESSING
    await prisma.caseActivity.update({
      where: { id: jobId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
        progressPct: 0,
        progressMsg: 'Iniciando análisis...',
      },
    });
    
    // 5. Verificar artifact existe
    const artifact = await prisma.artifact.findUnique({
      where: { id: payload.artifactId },
      include: { case: true },
    });
    
    if (!artifact) {
      throw new Error(`Artifact ${payload.artifactId} no encontrado`);
    }
    
    if (!artifact.case.orgId) {
      throw new Error('Caso sin organización asociada');
    }
    
    // 6. Verificar si ya hay análisis existente
    await updateJobProgress(jobId, 10, 'Verificando análisis previos...');
    
    const existingAnalysis = await prisma.policyAnalysis.findFirst({
      where: { artifactId: artifact.id },
    });
    
    if (existingAnalysis) {
      // Si ya existe, eliminar para re-analizar
      await prisma.policyAnalysis.delete({
        where: { id: existingAnalysis.id },
      });
      console.log(`[Webhook/Analyze] Análisis previo eliminado: ${existingAnalysis.id}`);
    }
    
    // 7. Descargar PDF
    await updateJobProgress(jobId, 20, 'Descargando documento PDF...');
    
    if (!artifact.fileId) {
      throw new Error('Artifact sin fileId');
    }
    
    const pdfBuffer = await downloadFromStorage(artifact.fileId);
    console.log(`[Webhook/Analyze] PDF descargado: ${pdfBuffer.length} bytes`);
    
    // 8. Extraer texto y coordenadas
    await updateJobProgress(jobId, 40, 'Extrayendo texto del documento...');
    
    const extractionResult = await extractWithCoordinates(pdfBuffer);
    console.log(`[Webhook/Analyze] Extracción: ${extractionResult.text.length} chars, ${extractionResult.pages} páginas`);
    
    // 9. Analizar con IA (la parte más larga)
    await updateJobProgress(jobId, 60, 'Analizando con inteligencia artificial...');
    
    const analysisResult = await analyzeWithAI({
      text: extractionResult.text,
      coordinates: extractionResult.coordinates,
      extractionMethod: 'hybrid',
    });
    
    console.log(`[Webhook/Analyze] IA completada, confianza: ${analysisResult.confidence}`);
    
    // 10. Guardar en base de datos
    await updateJobProgress(jobId, 90, 'Guardando resultados...');
    
    const policyAnalysis = await prisma.policyAnalysis.create({
      data: {
        artifactId: artifact.id,
        caseId: artifact.caseId,
        orgId: artifact.case.orgId,
        extractedData: analysisResult.data as any,
        extractionMethod: 'hybrid',
        overallConfidence: analysisResult.confidence,
        extractedAt: new Date(),
        pageReferences: {
          create: analysisResult.pageReferences.map(ref => ({
            fieldName: ref.field,
            fieldValue: ref.value,
            pageNumber: ref.page,
            boundingBox: ref.box as any,
            confidence: ref.confidence,
          })),
        },
      },
      include: { pageReferences: true },
    });
    
    console.log(`[Webhook/Analyze] Análisis guardado: ${policyAnalysis.id}`);
    
    // 11. Registrar en audit log
    await tryRecordAuditLog({
      caseId: artifact.caseId,
      actor: payload.userId,
      action: 'policy_analyzed',
      tool: 'qstash_webhook',
      payload: {
        policyAnalysisId: policyAnalysis.id,
        artifactId: artifact.id,
        fileName: artifact.fileName,
        confidence: policyAnalysis.overallConfidence,
        fieldsExtracted: Object.keys(analysisResult.data).length,
        referencesCount: policyAnalysis.pageReferences.length,
        processingTime: Date.now() - startTime,
      },
    });
    
    // 12. Marcar job como completado
    await completeJob(jobId, { analysisId: policyAnalysis.id });
    
    const duration = Date.now() - startTime;
    console.log(`[Webhook/Analyze] ✅ Job ${jobId} completado en ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      jobId,
      analysisId: policyAnalysis.id,
      duration,
    });
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`[Webhook/Analyze] ❌ Error:`, error);
    
    // Marcar job como fallido
    if (jobId) {
      await completeJob(jobId, { error: errorMsg });
    }
    
    // QStash reintentará si retornamos 5xx
    // Retornamos 200 para evitar reintentos en errores lógicos
    return NextResponse.json({
      success: false,
      jobId,
      error: errorMsg,
    });
  }
}
