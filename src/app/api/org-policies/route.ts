// src/app/api/org-policies/route.ts
/**
 * API para listar pólizas standalone de la organización.
 * 
 * GET: Obtiene todas las pólizas analizadas de la organización
 * con soporte para paginación y filtros.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { 
  getOrgStandalonePolicies, 
  countOrgStandalonePolicies,
  getOrgPoliciesContainerId
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
    console.log('📋 [org-policies] GET: Listando pólizas...');

    // Autenticación y organización
    const { user, currentOrg } = await getCurrentOrg();
    const orgId = currentOrg.id;

    console.log(`👤 Usuario: ${user.id}`);
    console.log(`🏢 Organización: ${orgId}`);

    // Parámetros de query
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const take = parseInt(searchParams.get('take') || '20', 10);

    // Validar límites
    const validatedTake = Math.min(Math.max(take, 1), 100);
    const validatedSkip = Math.max(skip, 0);

    // Obtener datos
    const [total, policies] = await Promise.all([
      countOrgStandalonePolicies(orgId),
      getOrgStandalonePolicies(orgId, { 
        skip: validatedSkip, 
        take: validatedTake 
      }),
    ]);

    // Transformar para la respuesta - usar safeString para evitar objetos en el JSON
    const formattedPolicies = policies.map((policy) => {
      const extractedData = policy.extractedData as any;
      return {
        id: policy.id,
        artifactId: policy.artifactId,
        fileName: policy.artifact?.fileName || 'Sin nombre',
        fileId: policy.artifact?.fileId,
        extractedAt: policy.extractedAt,
        overallConfidence: Number(policy.overallConfidence),
        extractionMethod: policy.extractionMethod,
        // Datos extraídos principales - sanitizados con safeString
        policyNumber: safeString(extractedData?.policy_number),
        insurer: safeString(extractedData?.insurer),
        policyType: safeString(extractedData?.policy_type || extractedData?.insurance_type),
        sumInsured: safeString(extractedData?.sum_insured),
        startDate: safeString(extractedData?.start_date || extractedData?.effective_date),
        endDate: safeString(extractedData?.end_date || extractedData?.expiry_date),
        // Preview de referencias de página
        pageReferencesCount: policy.pageReferences?.length || 0,
      };
    });

    return NextResponse.json({
      success: true,
      policies: formattedPolicies,
      pagination: {
        total,
        skip: validatedSkip,
        take: validatedTake,
        hasMore: validatedSkip + validatedTake < total,
      },
    });

  } catch (error: any) {
    console.error('❌ Error en GET /api/org-policies:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
