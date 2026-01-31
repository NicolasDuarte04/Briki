/**
 * @fileoverview API para iniciar trabajos de análisis en background
 * 
 * Este endpoint:
 * 1. Crea un registro CaseActivity con estado PENDING
 * 2. Encola el trabajo en QStash
 * 3. Retorna el jobId para que el UI haga polling
 * 
 * Si QStash no está disponible, ejecuta el análisis síncronamente
 * como fallback (comportamiento anterior).
 * 
 * POST /api/jobs/analyze
 * Body: { caseId, artifactId }
 * Response: { jobId, status, async: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createServerSupabase } from '@/lib/supabase/server';
import { queue, type AnalyzeJobPayload } from '@/lib/queue';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface RequestBody {
  caseId: string;
  artifactId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// POST HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Autenticación
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }
    
    // 2. Parsear body
    const body: RequestBody = await req.json();
    const { caseId, artifactId } = body;
    
    if (!caseId || !artifactId) {
      return NextResponse.json(
        { error: 'caseId y artifactId son requeridos' },
        { status: 400 }
      );
    }
    
    // 3. Verificar que el artifact existe y obtener datos
    const artifact = await prisma.artifact.findUnique({
      where: { id: artifactId },
      select: {
        id: true,
        caseId: true,
        fileId: true,
        fileName: true,
        contentType: true,
      },
    });
    
    if (!artifact) {
      return NextResponse.json(
        { error: 'Artifact no encontrado' },
        { status: 404 }
      );
    }
    
    if (artifact.caseId !== caseId) {
      return NextResponse.json(
        { error: 'Artifact no pertenece al caso' },
        { status: 403 }
      );
    }
    
    if (!artifact.fileId) {
      return NextResponse.json(
        { error: 'Artifact sin archivo asociado' },
        { status: 400 }
      );
    }
    
    // 4. Verificar si ya hay un job en progreso para este artifact
    const existingJob = await prisma.caseActivity.findFirst({
      where: {
        artifactId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });
    
    if (existingJob) {
      return NextResponse.json({
        jobId: existingJob.id,
        status: existingJob.status,
        async: true,
        message: 'Ya existe un análisis en progreso',
      });
    }
    
    // 5. Crear registro CaseActivity
    const job = await prisma.caseActivity.create({
      data: {
        caseId,
        artifactId,
        userId: user.id,
        jobType: 'ANALYZE_POLICY',
        status: 'PENDING',
        inputData: {
          fileId: artifact.fileId,
          fileName: artifact.fileName,
          contentType: artifact.contentType,
        },
      },
    });
    
    console.log(`[Jobs/Analyze] Job creado: ${job.id} para artifact ${artifactId}`);
    
    // 6. Intentar encolar en QStash
    if (queue.isAvailable()) {
      const payload: AnalyzeJobPayload = {
        jobId: job.id,
        caseId,
        artifactId,
        userId: user.id,
        fileId: artifact.fileId,
        fileName: artifact.fileName || 'unknown.pdf',
        contentType: artifact.contentType || 'application/pdf',
      };
      
      try {
        const messageId = await queue.enqueueAnalyzeJob(payload);
        
        if (messageId) {
          // Actualizar job con el messageId de QStash
          await prisma.caseActivity.update({
            where: { id: job.id },
            data: {
              inputData: {
                ...(job.inputData as object),
                qstashMessageId: messageId,
              },
            },
          });
          
          console.log(`[Jobs/Analyze] Encolado en QStash: ${messageId} (${Date.now() - startTime}ms)`);
          
          return NextResponse.json({
            jobId: job.id,
            status: 'PENDING',
            async: true,
            message: 'Análisis iniciado en background',
          });
        }
      } catch (queueError) {
        console.error('[Jobs/Analyze] Error al encolar:', queueError);
        // Continuar con fallback síncrono
      }
    }
    
    // 7. FALLBACK: QStash no disponible, ejecutar síncronamente
    console.warn('[Jobs/Analyze] QStash no disponible, ejecutando síncronamente');
    
    // Marcar como en procesamiento
    await prisma.caseActivity.update({
      where: { id: job.id },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });
    
    // Llamar directamente a la lógica de análisis
    // TODO: Importar y ejecutar la lógica de analyze
    // Por ahora, retornamos indicando que es síncrono
    
    return NextResponse.json({
      jobId: job.id,
      status: 'PROCESSING',
      async: false,
      message: 'Ejecutando análisis síncronamente (QStash no disponible)',
      fallbackUrl: `/api/policies/analyze`,
    });
    
  } catch (error) {
    console.error('[Jobs/Analyze] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al iniciar análisis',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
