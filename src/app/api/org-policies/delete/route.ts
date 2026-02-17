// /src/app/api/org-policies/delete/route.ts
/**
 * API para eliminar pólizas organizacionales (standalone)
 * 
 * Flujo de eliminación:
 * 1. Autenticación + verificación de pertenencia
 * 2. GUARDIA: Bloquear si la póliza está vinculada a casos reales (HTTP 409)
 * 3. Transacción BD: pageRefs → policyAnalysis → artifact huérfano
 * 4. Post-transacción: Storage cleanup + pins cleanup + audit log
 * 
 * Limpieza integral:
 * - PolicyPageReference (refs de página)
 * - PolicyAnalysis (análisis de póliza)
 * - Artifact (si queda huérfano de otros análisis)
 * - Archivo PDF en Supabase Storage
 * - Pins del usuario que apunten a esta póliza
 * - Registro de auditoría
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { getOrgPoliciesContainerId } from '@/lib/helpers/getOrgPoliciesContainer';
import { tryRecordAuditLog } from '@/lib/audit';

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ [API/ORG-POLICIES/DELETE]: Petición de eliminación recibida.');
    
    // =========================================================================
    // 1. AUTENTICACIÓN Y ORGANIZACIÓN
    // =========================================================================
    const { user, currentOrg } = await getCurrentOrg();
    
    // =========================================================================
    // 2. VALIDAR BODY
    // =========================================================================
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

    // =========================================================================
    // 3. VERIFICAR CONTENEDOR DE PÓLIZAS
    // =========================================================================
    const containerId = await getOrgPoliciesContainerId(currentOrg.id);
    
    if (!containerId) {
      console.warn('🗑️ [API/ORG-POLICIES/DELETE]: No existe contenedor de pólizas para esta organización.');
      return NextResponse.json(
        { error: 'No policy container found for this organization' }, 
        { status: 404 }
      );
    }

    // =========================================================================
    // 4. VERIFICAR QUE LA PÓLIZA EXISTE Y PERTENECE A LA ORG
    // =========================================================================
    const policyToDelete = await prisma.policyAnalysis.findFirst({
      where: {
        id: policyId,
        caseId: containerId,
        orgId: currentOrg.id,
      },
      include: {
        artifact: {
          select: { id: true, fileId: true, fileName: true },
        },
        caseLinks: {
          select: { 
            id: true, 
            caseId: true,
            case: {
              select: { id: true, caseName: true, clientName: true },
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

    // =========================================================================
    // 5. GUARDIA: BLOQUEAR SI ESTÁ VINCULADA A CASOS REALES
    // =========================================================================
    if (policyToDelete.caseLinks.length > 0) {
      const linkedCases = policyToDelete.caseLinks.map(link => ({
        id: link.case?.id || link.caseId,
        name: link.case?.caseName || link.case?.clientName || 'Caso sin nombre',
      }));
      
      console.warn(
        `🗑️ [API/ORG-POLICIES/DELETE]: BLOQUEADO - Póliza ${policyId} vinculada a ${linkedCases.length} caso(s):`,
        linkedCases.map(c => c.name).join(', ')
      );
      
      return NextResponse.json(
        { 
          error: 'POLICY_LINKED_TO_CASES',
          linkedCases,
          message: `Esta póliza está vinculada a ${linkedCases.length} caso(s) y no puede ser eliminada.`,
        },
        { status: 409 }
      );
    }

    // =========================================================================
    // 6. TRANSACCIÓN BD: ELIMINAR REGISTROS RELACIONADOS
    // =========================================================================
    const artifactId = policyToDelete.artifact?.id;
    const fileId = policyToDelete.artifact?.fileId;
    const fileName = policyToDelete.artifact?.fileName;
    let artifactDeleted = false;
    
    await prisma.$transaction(async (tx) => {
      // 6.1 Eliminar referencias de página (PolicyPageReference)
      const deletedPageRefs = await tx.policyPageReference.deleteMany({
        where: { policyAnalysisId: policyId },
      });
      console.log(`🗑️ [API/ORG-POLICIES/DELETE]: Eliminadas ${deletedPageRefs.count} referencias de página.`);

      // 6.2 Eliminar el análisis de póliza
      await tx.policyAnalysis.delete({
        where: { id: policyId },
      });
      console.log(`🗑️ [API/ORG-POLICIES/DELETE]: PolicyAnalysis ${policyId} eliminado.`);

      // 6.3 Verificar si el artifact quedó huérfano y eliminarlo
      if (artifactId) {
        const otherAnalyses = await tx.policyAnalysis.count({
          where: { artifactId: artifactId },
        });
        
        if (otherAnalyses === 0) {
          await tx.artifact.delete({
            where: { id: artifactId },
          });
          artifactDeleted = true;
          console.log(`🗑️ [API/ORG-POLICIES/DELETE]: Artifact huérfano ${artifactId} eliminado.`);
        }
      }
    }, {
      timeout: 30000, // ✅ 30s para evitar timeout en conexiones remotas
      isolationLevel: 'ReadCommitted',
    });

    // =========================================================================
    // 7. POST-TRANSACCIÓN: LIMPIEZA DE STORAGE
    // =========================================================================
    if (artifactDeleted && fileId) {
      try {
        const supabase = await createServerSupabase();
        const { error: storageError } = await supabase.storage
          .from('artifacts')
          .remove([fileId]);
        
        if (storageError) {
          console.warn('🗑️ [API/ORG-POLICIES/DELETE]: Error eliminando de Storage (non-blocking):', storageError.message);
        } else {
          console.log(`🗑️ [API/ORG-POLICIES/DELETE]: Archivo eliminado de Storage: ${fileId}`);
        }
      } catch (storageErr) {
        console.warn('🗑️ [API/ORG-POLICIES/DELETE]: Error inesperado limpiando Storage:', storageErr);
      }
    }

    // =========================================================================
    // 8. POST-TRANSACCIÓN: LIMPIEZA DE PINS
    // =========================================================================
    try {
      const supabase = await createServerSupabase();
      
      // Leer pins actuales del usuario
      const { data: prefData } = await supabase
        .from('user_preferences')
        .select('ui_preferences')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const uiPrefs = prefData?.ui_preferences as Record<string, unknown> | null;
      const pins = uiPrefs?.pins as { policies?: string[] } | undefined;
      
      if (pins?.policies && Array.isArray(pins.policies) && pins.policies.includes(policyId)) {
        const updatedPolicies = pins.policies.filter((id: string) => id !== policyId);
        const updatedPins = { ...pins, policies: updatedPolicies };
        const updatedUiPrefs = { ...uiPrefs, pins: updatedPins };
        
        await supabase
          .from('user_preferences')
          .update({ ui_preferences: updatedUiPrefs })
          .eq('user_id', user.id);
        
        console.log(`🗑️ [API/ORG-POLICIES/DELETE]: Pin de póliza ${policyId} eliminado de preferencias del usuario.`);
      }
    } catch (pinErr) {
      console.warn('🗑️ [API/ORG-POLICIES/DELETE]: Error limpiando pins (non-blocking):', pinErr);
    }

    // =========================================================================
    // 9. AUDIT LOG
    // =========================================================================
    await tryRecordAuditLog({
      caseId: containerId,
      actor: user.email || user.id,
      action: 'policy.delete',
      payload: {
        policyId,
        fileName: fileName || null,
        artifactDeleted,
        orgId: currentOrg.id,
      },
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

