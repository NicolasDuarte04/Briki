// src/app/api/org-quotes/delete/route.ts
/**
 * API para eliminar cotizaciones standalone.
 * 
 * DELETE: Elimina el artifact y su análisis asociado.
 * También elimina el archivo de Storage.
 * 
 * Body:
 * - artifactId: ID del artifact a eliminar
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { tryRecordAuditLog } from '@/lib/audit';
import { getOrgQuotesContainerId } from '@/lib/helpers/getOrgQuotesContainer';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';

export async function DELETE(request: NextRequest) {
  try {
    // =========================================================================
    // 1. AUTENTICACIÓN
    // =========================================================================
    
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Obtener organización actual
    const { currentOrg } = await getCurrentOrg();
    const orgId = currentOrg.id;

    // =========================================================================
    // 2. VALIDAR BODY
    // =========================================================================

    const body = await request.json();
    const { artifactId } = body;

    if (!artifactId) {
      return NextResponse.json(
        { error: 'artifactId is required' },
        { status: 400 }
      );
    }

    // =========================================================================
    // 3. VERIFICAR PERTENENCIA AL CONTENEDOR DE COTIZACIONES
    // =========================================================================

    const containerId = await getOrgQuotesContainerId(orgId);

    if (!containerId) {
      return NextResponse.json(
        { error: 'Quote container not found' },
        { status: 404 }
      );
    }

    // Buscar el artifact y verificar que pertenece al contenedor
    const artifact = await prisma.artifact.findUnique({
      where: { id: artifactId },
      include: {
        quoteAnalyses: true,
      },
    });

    if (!artifact) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    if (artifact.caseId !== containerId) {
      return NextResponse.json(
        { error: 'Quote does not belong to this organization' },
        { status: 403 }
      );
    }

    // =========================================================================
    // 4. ELIMINAR DE STORAGE
    // =========================================================================

    if (artifact.fileId) {
      console.log(`🗑️  Eliminando de Storage: ${artifact.fileId}`);
      const { error: storageError } = await supabase.storage
        .from('artifacts')
        .remove([artifact.fileId]);

      if (storageError) {
        console.warn('⚠️  Error eliminando de Storage:', storageError);
        // Continuamos aunque falle Storage
      }
    }

    // =========================================================================
    // 5. ELIMINAR EN BD (cascade deletes quote analyses)
    // =========================================================================

    // Primero eliminar análisis y referencias (si existen)
    if (artifact.quoteAnalyses.length > 0) {
      const analysisIds = artifact.quoteAnalyses.map(a => a.id);
      
      // Eliminar page references
      await prisma.quotePageReference.deleteMany({
        where: { quoteAnalysisId: { in: analysisIds } },
      });

      // Eliminar case quote links
      await prisma.caseQuoteLink.deleteMany({
        where: { quoteAnalysisId: { in: analysisIds } },
      });

      // Eliminar análisis
      await prisma.quoteAnalysis.deleteMany({
        where: { id: { in: analysisIds } },
      });
    }

    // Finalmente eliminar el artifact
    await prisma.artifact.delete({
      where: { id: artifactId },
    });

    console.log(`✅ Cotización eliminada: ${artifactId}`);

    // =========================================================================
    // 6. AUDIT LOG (usando la interfaz correcta)
    // =========================================================================

    await tryRecordAuditLog({
      caseId: containerId,
      actor: user.email || user.id,
      action: 'quote.delete',
      payload: {
        fileName: artifact.fileName,
        hadAnalysis: artifact.quoteAnalyses.length > 0,
        artifactId: artifactId,
        orgId: orgId,
      },
    });

    // =========================================================================
    // 7. RESPUESTA
    // =========================================================================

    return NextResponse.json({
      success: true,
      message: 'Cotización eliminada correctamente',
    });

  } catch (error) {
    console.error('❌ Error en org-quotes/delete:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
