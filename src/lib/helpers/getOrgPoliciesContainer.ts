// src/lib/helpers/getOrgPoliciesContainer.ts
/**
 * Helper para gestionar el "Case Contenedor" de pólizas standalone.
 * 
 * Este case especial:
 * - Tiene status = '__org_policies_container__'
 * - Tiene stage = '__system__'
 * - NUNCA aparece en listas de casos normales
 * - NUNCA aparece como chat histórico
 * - NO requiere validaciones de brief, cliente, etc.
 * - Solo sirve como contenedor para artifacts/PolicyAnalysis de pólizas standalone
 */

import { prisma } from '@/lib/prisma';

// ============================================================================
// CONSTANTES - Valores especiales que identifican el case contenedor
// ============================================================================

export const ORG_POLICIES_CONTAINER = {
  STATUS: '__org_policies_container__',
  STAGE: '__system__',
  CASE_NAME: '__ORG_POLICIES_CONTAINER__',
} as const;

// ============================================================================
// TIPOS
// ============================================================================

export interface OrgPoliciesContainer {
  id: string;
  orgId: string;
  createdAt: Date;
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Obtiene o crea el case contenedor de pólizas para una organización.
 * Este case es especial y está completamente aislado del flujo normal de cases.
 * 
 * @param orgId - ID de la organización
 * @returns El case contenedor de pólizas
 */
export async function getOrCreateOrgPoliciesContainer(
  orgId: string
): Promise<OrgPoliciesContainer> {
  // Primero intentar encontrar el contenedor existente
  let container = await prisma.case.findFirst({
    where: {
      orgId: orgId,
      status: ORG_POLICIES_CONTAINER.STATUS,
      stage: ORG_POLICIES_CONTAINER.STAGE,
    },
    select: {
      id: true,
      orgId: true,
      createdAt: true,
    },
  });

  // Si no existe, crearlo
  if (!container) {
    console.log(`📦 Creando contenedor de pólizas para org: ${orgId}`);
    
    container = await prisma.case.create({
      data: {
        orgId: orgId,
        caseName: ORG_POLICIES_CONTAINER.CASE_NAME,
        clientName: null,
        status: ORG_POLICIES_CONTAINER.STATUS,
        stage: ORG_POLICIES_CONTAINER.STAGE,
        priority: 'low',
        briefData: {
          isSystemContainer: true,
          purpose: 'org_policies',
          description: 'Contenedor automático para pólizas de la organización',
        },
      },
      select: {
        id: true,
        orgId: true,
        createdAt: true,
      },
    });

    console.log(`✅ Contenedor de pólizas creado: ${container.id}`);
  }

  return {
    id: container.id,
    orgId: container.orgId ?? orgId,
    createdAt: container.createdAt,
  };
}

/**
 * Verifica si un caseId corresponde al contenedor de pólizas.
 * Usar para filtrar en consultas o validaciones.
 * 
 * @param caseId - ID del case a verificar
 * @returns true si es el contenedor de pólizas
 */
export async function isOrgPoliciesContainer(caseId: string): Promise<boolean> {
  const result = await prisma.case.findFirst({
    where: {
      id: caseId,
      status: ORG_POLICIES_CONTAINER.STATUS,
      stage: ORG_POLICIES_CONTAINER.STAGE,
    },
    select: { id: true },
  });

  return result !== null;
}

/**
 * Obtiene el ID del contenedor de pólizas de una organización (si existe).
 * NO crea uno nuevo si no existe.
 * 
 * @param orgId - ID de la organización
 * @returns ID del contenedor o null si no existe
 */
export async function getOrgPoliciesContainerId(
  orgId: string
): Promise<string | null> {
  const container = await prisma.case.findFirst({
    where: {
      orgId: orgId,
      status: ORG_POLICIES_CONTAINER.STATUS,
      stage: ORG_POLICIES_CONTAINER.STAGE,
    },
    select: { id: true },
  });

  return container?.id ?? null;
}

// ============================================================================
// FUNCIONES DE FILTRADO - Para excluir contenedores de consultas normales
// ============================================================================

/**
 * Cláusula WHERE para excluir el contenedor de pólizas de consultas de cases.
 * Usar en todas las consultas que listen casos para usuarios.
 * 
 * Ejemplo de uso con Prisma:
 * ```
 * const cases = await prisma.case.findMany({
 *   where: {
 *     orgId: currentOrg.id,
 *     ...EXCLUDE_ORG_POLICIES_CONTAINER,
 *   }
 * });
 * ```
 */
export const EXCLUDE_ORG_POLICIES_CONTAINER = {
  NOT: {
    AND: [
      { status: ORG_POLICIES_CONTAINER.STATUS },
      { stage: ORG_POLICIES_CONTAINER.STAGE },
    ],
  },
} as const;

/**
 * Verifica si un case debe ser excluido de listas normales.
 * Útil para filtrado en el frontend.
 * 
 * @param caseData - Datos del case (debe incluir status y stage)
 * @returns true si el case debe ser excluido
 */
export function shouldExcludeFromCaseLists(caseData: {
  status?: string | null;
  stage?: string | null;
}): boolean {
  return (
    caseData.status === ORG_POLICIES_CONTAINER.STATUS &&
    caseData.stage === ORG_POLICIES_CONTAINER.STAGE
  );
}

// ============================================================================
// FUNCIONES DE ESTADÍSTICAS
// ============================================================================

/**
 * Cuenta las pólizas standalone de una organización.
 * 
 * @param orgId - ID de la organización
 * @returns Conteo de PolicyAnalysis en el contenedor
 */
export async function countOrgStandalonePolicies(orgId: string): Promise<number> {
  const containerId = await getOrgPoliciesContainerId(orgId);
  
  if (!containerId) {
    return 0;
  }

  const count = await prisma.policyAnalysis.count({
    where: {
      caseId: containerId,
      orgId: orgId,
    },
  });

  return count;
}

/**
 * Obtiene las pólizas standalone de una organización con sus datos básicos.
 * 
 * @param orgId - ID de la organización
 * @param options - Opciones de paginación
 * @returns Array de PolicyAnalysis del contenedor con artifact y pageReferences
 */
export async function getOrgStandalonePolicies(
  orgId: string,
  options: { skip?: number; take?: number } = {}
) {
  const containerId = await getOrgPoliciesContainerId(orgId);
  
  if (!containerId) {
    return [];
  }

  // ✅ Construir opciones de paginación solo si están definidas
  // Esto evita problemas con exactOptionalPropertyTypes
  const paginationOptions: { skip?: number; take?: number } = {};
  if (typeof options.skip === 'number') {
    paginationOptions.skip = options.skip;
  }
  if (typeof options.take === 'number') {
    paginationOptions.take = options.take;
  }

  const policies = await prisma.policyAnalysis.findMany({
    where: {
      caseId: containerId,
      orgId: orgId,
    },
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
      pageReferences: {
        orderBy: { pageNumber: 'asc' },
        take: 5, // Solo las primeras 5 referencias para preview
      },
    },
    orderBy: { extractedAt: 'desc' },
    ...paginationOptions,
  });

  return policies;
}
