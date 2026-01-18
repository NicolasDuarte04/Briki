// src/app/api/cases/[id]/link-policies/route.ts
/**
 * API para gestionar enlaces entre casos y pólizas de la organización.
 * 
 * POST: Vincular una o más pólizas a un caso
 * GET: Obtener las pólizas vinculadas a un caso
 * DELETE: Desvincular una póliza de un caso (por linkId en query param)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

/**
 * Helper para extraer un valor string de campos que pueden ser objetos.
 */
function safeString(value: any, fallback: string | null = null): string | null {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value || fallback;
  if (typeof value === 'object') {
    if (value.name) return String(value.name);
    if (value.value) return String(value.value);
    if (value.text) return String(value.text);
    return fallback;
  }
  return String(value);
}

// ============================================================================
// GET: Obtener pólizas vinculadas a un caso
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    console.log(`📋 [link-policies] GET: Obteniendo pólizas vinculadas al caso ${caseId}...`);

    const { user, currentOrg } = await getCurrentOrg();
    const orgId = currentOrg.id;

    // Verificar que el caso existe y pertenece a la organización
    const caseExists = await prisma.case.findFirst({
      where: { id: caseId, orgId },
      select: { id: true },
    });

    if (!caseExists) {
      return NextResponse.json(
        { error: 'Caso no encontrado' },
        { status: 404 }
      );
    }

    // Obtener enlaces con datos de la póliza
    const links = await prisma.casePolicyLink.findMany({
      where: { caseId, orgId },
      include: {
        policyAnalysis: {
          include: {
            artifact: {
              select: {
                id: true,
                fileName: true,
                fileId: true,
                contentType: true,
              },
            },
            pageReferences: {
              take: 5,
              orderBy: { pageNumber: 'asc' },
            },
          },
        },
      },
      orderBy: { linkedAt: 'desc' },
    });

    // Formatear respuesta
    const formattedLinks = links.map(link => {
      const extractedData = link.policyAnalysis.extractedData as any;
      return {
        linkId: link.id,
        linkedAt: link.linkedAt,
        linkedBy: link.linkedBy,
        notes: link.notes,
        policy: {
          id: link.policyAnalysis.id,
          artifactId: link.policyAnalysis.artifactId,
          fileName: link.policyAnalysis.artifact?.fileName || 'Sin nombre',
          fileId: link.policyAnalysis.artifact?.fileId,
          overallConfidence: Number(link.policyAnalysis.overallConfidence),
          policyNumber: safeString(extractedData?.policy_number, 'Sin número'),
          insurer: safeString(extractedData?.insurer, 'No identificada'),
          policyType: safeString(extractedData?.policy_type || extractedData?.insurance_type),
          sumInsured: safeString(extractedData?.sum_insured),
          startDate: safeString(extractedData?.start_date || extractedData?.effective_date),
          endDate: safeString(extractedData?.end_date || extractedData?.expiry_date),
          insuredName: safeString(extractedData?.insured_name || extractedData?.policy_holder_name),
          pageReferencesCount: link.policyAnalysis.pageReferences?.length || 0,
        },
      };
    });

    return NextResponse.json({
      success: true,
      linkedPolicies: formattedLinks,
      count: formattedLinks.length,
    });

  } catch (error: any) {
    console.error('❌ Error en GET /api/cases/[id]/link-policies:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: Vincular pólizas a un caso
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    console.log(`🔗 [link-policies] POST: Vinculando pólizas al caso ${caseId}...`);

    const { user, currentOrg } = await getCurrentOrg();
    const orgId = currentOrg.id;

    // Parsear body
    const body = await request.json();
    const { policyAnalysisIds, notes } = body as {
      policyAnalysisIds: string[];
      notes?: string;
    };

    if (!policyAnalysisIds || !Array.isArray(policyAnalysisIds) || policyAnalysisIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un policyAnalysisId' },
        { status: 400 }
      );
    }

    // Verificar que el caso existe y pertenece a la organización
    const caseExists = await prisma.case.findFirst({
      where: { id: caseId, orgId },
      select: { id: true, caseName: true },
    });

    if (!caseExists) {
      return NextResponse.json(
        { error: 'Caso no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que las pólizas existen y pertenecen a la organización
    const policies = await prisma.policyAnalysis.findMany({
      where: {
        id: { in: policyAnalysisIds },
        orgId,
      },
      select: { id: true },
    });

    const foundIds = policies.map(p => p.id);
    const notFoundIds = policyAnalysisIds.filter(id => !foundIds.includes(id));

    if (notFoundIds.length > 0) {
      return NextResponse.json(
        { error: `Pólizas no encontradas: ${notFoundIds.join(', ')}` },
        { status: 404 }
      );
    }

    // Crear enlaces (ignorar duplicados con upsert-like behavior)
    const createdLinks: any[] = [];
    const skippedIds: string[] = [];

    for (const policyAnalysisId of policyAnalysisIds) {
      try {
        const link = await prisma.casePolicyLink.create({
          data: {
            caseId,
            policyAnalysisId,
            orgId,
            linkedBy: user.id,
            notes: notes || null,
          },
        });
        createdLinks.push(link);
        console.log(`✅ Enlace creado: ${link.id}`);
      } catch (err: any) {
        // Si ya existe el enlace (unique constraint), simplemente lo saltamos
        if (err.code === 'P2002') {
          console.log(`⚠️ Enlace ya existe para póliza ${policyAnalysisId}, saltando...`);
          skippedIds.push(policyAnalysisId);
        } else {
          throw err;
        }
      }
    }

    // Auditoría
    await recordAuditLog({
      caseId,
      actor: user.id,
      action: 'policies_linked',
      tool: 'link_policies_api',
      payload: {
        orgId,
        linkedCount: createdLinks.length,
        skippedCount: skippedIds.length,
        policyAnalysisIds,
        notes,
      },
    });

    console.log(`✅ [link-policies] Vinculadas ${createdLinks.length} pólizas, ${skippedIds.length} ya existían`);

    return NextResponse.json({
      success: true,
      linkedCount: createdLinks.length,
      skippedCount: skippedIds.length,
      links: createdLinks.map(l => l.id),
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error en POST /api/cases/[id]/link-policies:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE: Desvincular una póliza de un caso
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('linkId');

    console.log(`🗑️ [link-policies] DELETE: Desvinculando póliza del caso ${caseId}...`);

    if (!linkId) {
      return NextResponse.json(
        { error: 'Se requiere linkId como query parameter' },
        { status: 400 }
      );
    }

    const { user, currentOrg } = await getCurrentOrg();
    const orgId = currentOrg.id;

    // Verificar que el enlace existe y pertenece a la organización
    const link = await prisma.casePolicyLink.findFirst({
      where: {
        id: linkId,
        caseId,
        orgId,
      },
      include: {
        policyAnalysis: {
          select: { id: true },
        },
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: 'Enlace no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar el enlace
    await prisma.casePolicyLink.delete({
      where: { id: linkId },
    });

    // Auditoría
    await recordAuditLog({
      caseId,
      actor: user.id,
      action: 'policy_unlinked',
      tool: 'link_policies_api',
      payload: {
        orgId,
        linkId,
        policyAnalysisId: link.policyAnalysisId,
      },
    });

    console.log(`✅ [link-policies] Enlace ${linkId} eliminado`);

    return NextResponse.json({
      success: true,
      deletedLinkId: linkId,
    });

  } catch (error: any) {
    console.error('❌ Error en DELETE /api/cases/[id]/link-policies:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
