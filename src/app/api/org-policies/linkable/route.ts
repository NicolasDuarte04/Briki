// src/app/api/org-policies/linkable/route.ts
/**
 * API para listar pólizas de la organización disponibles para vincular a un caso.
 * 
 * GET: Obtiene pólizas analizadas de la organización, excluyendo las ya vinculadas
 * a un caso específico si se proporciona excludeCaseId.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';
import { 
  getOrgPoliciesContainerId,
  ORG_POLICIES_CONTAINER 
} from '@/lib/helpers/getOrgPoliciesContainer';

export const runtime = 'nodejs';

/**
 * Helper para extraer un valor string de campos que pueden ser objetos.
 */
function safeString(value: any, fallback: string | null = null): string | null {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value || fallback;
  }
  if (typeof value === 'object') {
    if (value.name) return String(value.name);
    if (value.value) return String(value.value);
    if (value.text) return String(value.text);
    const firstValue = Object.values(value).find(v => typeof v === 'string' && v.length > 0);
    if (firstValue) return String(firstValue);
    return fallback;
  }
  return String(value);
}

export async function GET(request: NextRequest) {
  try {
    console.log('📋 [org-policies/linkable] GET: Listando pólizas disponibles para vincular...');

    // Autenticación y organización
    const { user, currentOrg } = await getCurrentOrg();
    const orgId = currentOrg.id;

    console.log(`👤 Usuario: ${user.id}`);
    console.log(`🏢 Organización: ${orgId}`);

    // Parámetros de query
    const { searchParams } = new URL(request.url);
    const excludeCaseId = searchParams.get('excludeCaseId');
    const search = searchParams.get('search')?.toLowerCase();

    // Obtener el contenedor de pólizas de la organización
    const containerId = await getOrgPoliciesContainerId(orgId);

    if (!containerId) {
      // No hay contenedor = no hay pólizas de organización
      return NextResponse.json({
        success: true,
        policies: [],
        message: 'No hay pólizas cargadas en la organización',
      });
    }

    // Construir la consulta base
    const whereClause: any = {
      caseId: containerId,
      orgId: orgId,
    };

    // Si se proporciona excludeCaseId, excluir pólizas ya vinculadas a ese caso
    let excludedPolicyIds: string[] = [];
    if (excludeCaseId) {
      const existingLinks = await prisma.casePolicyLink.findMany({
        where: {
          caseId: excludeCaseId,
          orgId: orgId,
        },
        select: {
          policyAnalysisId: true,
        },
      });
      excludedPolicyIds = existingLinks.map(link => link.policyAnalysisId);
      
      if (excludedPolicyIds.length > 0) {
        whereClause.id = {
          notIn: excludedPolicyIds,
        };
      }
    }

    // Obtener pólizas
    const policies = await prisma.policyAnalysis.findMany({
      where: whereClause,
      include: {
        artifact: {
          select: {
            id: true,
            fileName: true,
            contentType: true,
            fileId: true,
            createdAt: true,
          },
        },
      },
      orderBy: { extractedAt: 'desc' },
    });

    // Transformar y filtrar por búsqueda
    let formattedPolicies = policies.map((policy) => {
      const extractedData = policy.extractedData as any;
      return {
        id: policy.id,
        artifactId: policy.artifactId,
        fileName: policy.artifact?.fileName || 'Sin nombre',
        fileId: policy.artifact?.fileId,
        extractedAt: policy.extractedAt,
        overallConfidence: Number(policy.overallConfidence),
        // Datos extraídos principales - sanitizados con safeString
        policyNumber: safeString(extractedData?.policy_number, 'Sin número'),
        insurer: safeString(extractedData?.insurer, 'Aseguradora no identificada'),
        policyType: safeString(extractedData?.policy_type || extractedData?.insurance_type, 'Tipo no especificado'),
        sumInsured: safeString(extractedData?.sum_insured, 'No disponible'),
        startDate: safeString(extractedData?.start_date || extractedData?.effective_date),
        endDate: safeString(extractedData?.end_date || extractedData?.expiry_date),
        insuredName: safeString(extractedData?.insured_name || extractedData?.policy_holder_name),
      };
    });

    // Filtrar por término de búsqueda si se proporciona
    if (search) {
      formattedPolicies = formattedPolicies.filter(policy => 
        policy.fileName?.toLowerCase().includes(search) ||
        policy.insurer?.toLowerCase().includes(search) ||
        policy.policyNumber?.toLowerCase().includes(search) ||
        policy.policyType?.toLowerCase().includes(search) ||
        policy.insuredName?.toLowerCase().includes(search)
      );
    }

    console.log(`✅ [org-policies/linkable] Encontradas ${formattedPolicies.length} pólizas disponibles`);

    return NextResponse.json({
      success: true,
      policies: formattedPolicies,
      excludedCount: excludedPolicyIds.length,
    });

  } catch (error: any) {
    console.error('❌ Error en GET /api/org-policies/linkable:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
