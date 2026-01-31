/**
 * @fileoverview API para consultar el estado de un job de análisis
 * 
 * GET /api/jobs/[jobId]/status
 * 
 * Response:
 * {
 *   jobId: string,
 *   status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
 *   progressPct: number | null,
 *   progressMsg: string | null,
 *   result?: { analysisId: string },
 *   error?: string,
 *   timing: { created, started, completed }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createServerSupabase } from '@/lib/supabase/server';

// ═══════════════════════════════════════════════════════════════════════════
// GET HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
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
    
    // 2. Obtener jobId
    const { jobId } = await params;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId es requerido' },
        { status: 400 }
      );
    }
    
    // 3. Buscar el job
    const job = await prisma.caseActivity.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        caseId: true,
        artifactId: true,
        userId: true,
        jobType: true,
        status: true,
        progressPct: true,
        progressMsg: true,
        resultData: true,
        errorMessage: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
      },
    });
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job no encontrado' },
        { status: 404 }
      );
    }
    
    // 4. Verificar que el usuario tiene acceso (mismo usuario o mismo org)
    // Por ahora, solo verificamos que existe el job
    // TODO: Agregar verificación de permisos por organización
    
    // 5. Formatear respuesta
    const response = {
      jobId: job.id,
      caseId: job.caseId,
      artifactId: job.artifactId,
      jobType: job.jobType,
      status: job.status,
      progressPct: job.progressPct,
      progressMsg: job.progressMsg,
      result: job.resultData as { analysisId?: string } | null,
      error: job.errorMessage,
      timing: {
        created: job.createdAt.toISOString(),
        started: job.startedAt?.toISOString() || null,
        completed: job.completedAt?.toISOString() || null,
      },
      // Información adicional útil para el UI
      isOwner: job.userId === user.id,
      isComplete: job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED',
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[Jobs/Status] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al obtener estado del job',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
