// /src/app/api/org-policies/delete/route.ts
/**
 * API para eliminar pólizas organizacionales (standalone)
 * 
 * Esta API elimina pólizas del contenedor virtual de la organización.
 * Incluye limpieza de:
 * - PolicyPageReference (referencias de página)
 * - CasePolicyLink (vínculos a casos reales)
 * - PolicyAnalysis (análisis de póliza)
 * - Artifact (opcional, si no tiene otras referencias)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';
import { getOrgPoliciesContainerId } from '@/lib/helpers/getOrgPoliciesContainer';

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ [API/ORG-POLICIES/DELETE]: Petición de eliminación recibida.');
    
    // 1. Autenticación y organización
    const { user, currentOrg } = await getCurrentOrg();
    
    // 2. Obtener policyId del body
    const body = await request.json();
    const { policyId } = body;

    if (!policyId) {
      console.error('🗑️ [API/ORG-POLICIES/DELETE]: Error - No se proporcionó policyId.');
      return NextResponse.json(
        { error: 'Policy ID is required' }, 
        { status: 400 }
      );
    }
    
    console.log(`🗑️ [API/ORG-POLICIES/DELETE]: Solicitud para eliminar póliza ID: ${policyId} por usuario ${user.id} en Org ${currentOrg.id}`);

    // 3. Obtener el contenedor de pólizas de la organización
    const containerId = await getOrgPoliciesContainerId(currentOrg.id);
    
    if (!containerId) {
      console.warn('🗑️ [API/ORG-POLICIES/DELETE]: No existe contenedor de pólizas para esta organización.');
      return NextResponse.json(
        { error: 'No policy container found for this organization' }, 
        { status: 404 }
      );
    }

    // 4. Verificar que la póliza existe y pertenece al contenedor de la org
    const policyToDelete = await prisma.policyAnalysis.findFirst({
      where: {
        id: policyId,
        caseId: containerId,
        orgId: currentOrg.id,
      },
      include: {
        artifact: {
          select: { id: true },
        },
        caseLinks: {
          select: { 
            id: true, 
            caseId: true,
            case: {
              select: { caseName: true, clientName: true },
            },
          },
        },
      },
    });

    if (!policyToDelete) {
      console.warn(`🗑️ [API/ORG-POLICIES/DELETE]: La póliza ${policyId} no existe o no pertenece al contenedor de esta organización.`);
      return NextResponse.json(
        { error: 'Policy not found or access denied' }, 
        { status: 404 }
      );
    }

    // 5. Verificar si tiene vínculos activos a casos reales
    if (policyToDelete.caseLinks.length > 0) {
      const linkedCaseNames = policyToDelete.caseLinks
        .map(link => link.case?.caseName || link.case?.clientName || 'Caso sin nombre')
        .join(', ');
      
      console.warn(`🗑️ [API/ORG-POLICIES/DELETE]: La póliza ${policyId} está vinculada a ${policyToDelete.caseLinks.length} caso(s): ${linkedCaseNames}`);
      
      // Permitir eliminación pero advertir (los vínculos se eliminarán también)
      console.log('🗑️ [API/ORG-POLICIES/DELETE]: Procediendo a eliminar vínculos y póliza...');
    }

    // 6. Eliminar en transacción para garantizar consistencia
    const artifactId = policyToDelete.artifact?.id;
    
    await prisma.$transaction(async (tx) => {
      // 6.1 Eliminar referencias de página (PolicyPageReference)
      const deletedPageRefs = await tx.policyPageReference.deleteMany({
        where: { policyAnalysisId: policyId },
      });
      console.log(`🗑️ [API/ORG-POLICIES/DELETE]: Eliminadas ${deletedPageRefs.count} referencias de página.`);

      // 6.2 Eliminar vínculos a casos (CasePolicyLink)
      const deletedLinks = await tx.casePolicyLink.deleteMany({
        where: { policyAnalysisId: policyId },
      });
      console.log(`🗑️ [API/ORG-POLICIES/DELETE]: Eliminados ${deletedLinks.count} vínculos a casos.`);

      // 6.3 Eliminar el análisis de póliza
      await tx.policyAnalysis.delete({
        where: { id: policyId },
      });
      console.log(`🗑️ [API/ORG-POLICIES/DELETE]: PolicyAnalysis ${policyId} eliminado.`);

      // 6.4 Verificar si el artifact quedó huérfano y eliminarlo
      if (artifactId) {
        const otherAnalyses = await tx.policyAnalysis.count({
          where: { artifactId: artifactId },
        });
        
        if (otherAnalyses === 0) {
          // Artifact huérfano, eliminar
          await tx.artifact.delete({
            where: { id: artifactId },
          });
          console.log(`🗑️ [API/ORG-POLICIES/DELETE]: Artifact huérfano ${artifactId} eliminado.`);
        }
      }
    });

    console.log('🗑️ [API/ORG-POLICIES/DELETE]: Póliza eliminada exitosamente.');
    
    return NextResponse.json(
      { 
        success: true,
        message: 'Policy deleted successfully',
        deletedId: policyId,
      }, 
      { status: 200 }
    );
    
  } catch (error: any) {
    console.error('🗑️ [API/ORG-POLICIES/DELETE]: Error inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' }, 
      { status: 500 }
    );
  }
}
