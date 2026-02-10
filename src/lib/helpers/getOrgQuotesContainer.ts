// src/lib/helpers/getOrgQuotesContainer.ts
/**
 * Helper para gestionar el "Case Contenedor" de cotizaciones standalone.
 * 
 * Este case especial:
 * - Tiene status = '__org_quotes_container__'
 * - Tiene stage = '__system__'
 * - NUNCA aparece en listas de casos normales
 * - NUNCA aparece como chat histórico
 * - NO requiere validaciones de brief, cliente, etc.
 * - Solo sirve como contenedor para artifacts/QuoteAnalysis de cotizaciones standalone
 * 
 * Análogo a getOrgPoliciesContainer.ts pero para cotizaciones.
 */

import { prisma } from '@/lib/prisma';

// ============================================================================
// CONSTANTES - Valores especiales que identifican el case contenedor
// ============================================================================

export const ORG_QUOTES_CONTAINER = {
  STATUS: '__org_quotes_container__',
  STAGE: '__system__',
  CASE_NAME: '__ORG_QUOTES_CONTAINER__',
} as const;

// ============================================================================
// TIPOS
// ============================================================================

export interface OrgQuotesContainer {
  id: string;
  orgId: string;
  createdAt: Date;
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Obtiene o crea el case contenedor de cotizaciones para una organización.
 * Este case es especial y está completamente aislado del flujo normal de cases.
 * 
 * @param orgId - ID de la organización
 * @returns El case contenedor de cotizaciones
 */
export async function getOrCreateOrgQuotesContainer(
  orgId: string
): Promise<OrgQuotesContainer> {
  // Primero intentar encontrar el contenedor existente
  let container = await prisma.case.findFirst({
    where: {
      orgId: orgId,
      status: ORG_QUOTES_CONTAINER.STATUS,
      stage: ORG_QUOTES_CONTAINER.STAGE,
    },
    select: {
      id: true,
      orgId: true,
      createdAt: true,
    },
  });

  // Si no existe, crearlo
  if (!container) {
    console.log(`📦 Creando contenedor de cotizaciones para org: ${orgId}`);
    
    container = await prisma.case.create({
      data: {
        orgId: orgId,
        caseName: ORG_QUOTES_CONTAINER.CASE_NAME,
        clientName: null,
        status: ORG_QUOTES_CONTAINER.STATUS,
        stage: ORG_QUOTES_CONTAINER.STAGE,
        priority: 'low',
        briefData: {
          isSystemContainer: true,
          purpose: 'org_quotes',
          description: 'Contenedor automático para cotizaciones de la organización',
        },
      },
      select: {
        id: true,
        orgId: true,
        createdAt: true,
      },
    });

    console.log(`✅ Contenedor de cotizaciones creado: ${container.id}`);
  }

  return {
    id: container.id,
    orgId: container.orgId ?? orgId,
    createdAt: container.createdAt,
  };
}

/**
 * Verifica si un caseId corresponde al contenedor de cotizaciones.
 * Usar para filtrar en consultas o validaciones.
 * 
 * @param caseId - ID del case a verificar
 * @returns true si es el contenedor de cotizaciones
 */
export async function isOrgQuotesContainer(caseId: string): Promise<boolean> {
  const result = await prisma.case.findFirst({
    where: {
      id: caseId,
      status: ORG_QUOTES_CONTAINER.STATUS,
      stage: ORG_QUOTES_CONTAINER.STAGE,
    },
    select: { id: true },
  });

  return result !== null;
}

/**
 * Obtiene el ID del contenedor de cotizaciones de una organización (si existe).
 * NO crea uno nuevo si no existe.
 * 
 * @param orgId - ID de la organización
 * @returns ID del contenedor o null si no existe
 */
export async function getOrgQuotesContainerId(
  orgId: string
): Promise<string | null> {
  const container = await prisma.case.findFirst({
    where: {
      orgId: orgId,
      status: ORG_QUOTES_CONTAINER.STATUS,
      stage: ORG_QUOTES_CONTAINER.STAGE,
    },
    select: { id: true },
  });

  return container?.id ?? null;
}

// ============================================================================
// FUNCIONES DE FILTRADO - Para excluir contenedores de consultas normales
// ============================================================================

/**
 * Cláusula WHERE para excluir el contenedor de cotizaciones de consultas de cases.
 * Usar en todas las consultas que listen casos para usuarios.
 * 
 * Ejemplo de uso con Prisma:
 * ```
 * const cases = await prisma.case.findMany({
 *   where: {
 *     orgId: currentOrg.id,
 *     ...EXCLUDE_ORG_QUOTES_CONTAINER,
 *   }
 * });
 * ```
 */
export const EXCLUDE_ORG_QUOTES_CONTAINER = {
  NOT: {
    AND: [
      { status: ORG_QUOTES_CONTAINER.STATUS },
      { stage: ORG_QUOTES_CONTAINER.STAGE },
    ],
  },
} as const;

/**
 * Verifica si un case debe ser excluido de listas normales (cotizaciones).
 * Útil para filtrado en el frontend.
 * 
 * @param caseData - Datos del case (debe incluir status y stage)
 * @returns true si el case debe ser excluido
 */
export function shouldExcludeQuotesContainerFromCaseLists(caseData: {
  status?: string | null;
  stage?: string | null;
}): boolean {
  return (
    caseData.status === ORG_QUOTES_CONTAINER.STATUS &&
    caseData.stage === ORG_QUOTES_CONTAINER.STAGE
  );
}

// ============================================================================
// FUNCIONES DE ESTADÍSTICAS
// ============================================================================

/**
 * Cuenta las cotizaciones standalone de una organización.
 * 
 * @param orgId - ID de la organización
 * @returns Conteo de QuoteAnalysis en el contenedor
 */
export async function countOrgStandaloneQuotes(orgId: string): Promise<number> {
  const containerId = await getOrgQuotesContainerId(orgId);
  
  if (!containerId) {
    return 0;
  }

  const count = await prisma.quoteAnalysis.count({
    where: {
      caseId: containerId,
      orgId: orgId,
    },
  });

  return count;
}

/**
 * Obtiene las cotizaciones standalone de una organización con sus datos básicos.
 * 
 * @param orgId - ID de la organización
 * @param options - Opciones de paginación
 * @returns Array de QuoteAnalysis del contenedor con artifact y pageReferences
 */
export async function getOrgStandaloneQuotes(
  orgId: string,
  options: { skip?: number; take?: number } = {}
) {
  const containerId = await getOrgQuotesContainerId(orgId);
  
  if (!containerId) {
    return [];
  }

  // ✅ Construir opciones de paginación solo si están definidas
  const paginationOptions: { skip?: number; take?: number } = {};
  if (typeof options.skip === 'number') {
    paginationOptions.skip = options.skip;
  }
  if (typeof options.take === 'number') {
    paginationOptions.take = options.take;
  }

  const quotes = await prisma.quoteAnalysis.findMany({
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

  return quotes;
}
