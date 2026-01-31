/**
 * @fileoverview API para obtener un análisis de póliza específico
 * 
 * GET /api/policies/analyses/[analysisId]
 * 
 * Response: { analysis: PolicyAnalysis }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
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
    
    // 2. Obtener analysisId
    const { analysisId } = await params;
    
    if (!analysisId) {
      return NextResponse.json(
        { error: 'analysisId es requerido' },
        { status: 400 }
      );
    }
    
    // 3. Buscar el análisis con sus referencias de página
    const analysis = await prisma.policyAnalysis.findUnique({
      where: { id: analysisId },
      include: {
        pageReferences: true,
        artifact: {
          select: {
            id: true,
            fileName: true,
            contentType: true,
            fileId: true,
          }
        }
      },
    });
    
    if (!analysis) {
      return NextResponse.json(
        { error: 'Análisis no encontrado' },
        { status: 404 }
      );
    }
    
    // TODO: Verificar que el usuario tiene acceso a este análisis (mismo org)
    
    return NextResponse.json({
      success: true,
      analysis,
    });
    
  } catch (error) {
    console.error('[Analyses/Get] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al obtener análisis',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
