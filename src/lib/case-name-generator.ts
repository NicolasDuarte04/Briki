/**
 * Case Name Generator
 * 
 * Sistema de generación automática de nombres para casos siguiendo
 * un patrón similar al del sistema de archivos de Windows/macOS.
 * 
 * Formato: "Caso de [Cliente/Empresa] #N" o "Caso de [Cliente/Empresa]" si es único
 * Para casos sin cliente ni empresa: "Cliente vacío #N"
 * 
 * @module lib/case-name-generator
 */

import { prisma } from './prisma';
import { getClientById } from './clientsDb';
import { getCompanyById } from './companiesDb';

/**
 * Extrae los números usados de los nombres de casos existentes.
 * Busca el patrón "#N" al final del nombre.
 * 
 * @param caseNames - Array de nombres de casos
 * @returns Set con los números ya usados
 * 
 * @example
 * extractUsedNumbers(['Caso de Acme', 'Caso de Acme #1', 'Caso de Acme #3'])
 * // Returns: Set { 1, 3 }
 */
function extractUsedNumbers(caseNames: string[]): Set<number> {
  const numbers = new Set<number>();

  caseNames.forEach((name) => {
    const match = name.match(/#(\d+)$/);
    if (match && match[1]) {
      numbers.add(parseInt(match[1], 10));
    }
  });

  return numbers;
}

/**
 * Encuentra el primer número disponible empezando desde 1.
 * Implementa lógica de "rellenar huecos" como sistema de archivos.
 * 
 * @param usedNumbers - Set de números ya usados
 * @returns El primer número disponible
 * 
 * @example
 * findNextAvailableNumber(new Set([1, 3, 4])) // Returns: 2
 * findNextAvailableNumber(new Set([1, 2, 3])) // Returns: 4
 */
function findNextAvailableNumber(usedNumbers: Set<number>): number {
  let number = 1;
  while (usedNumbers.has(number)) {
    number++;
  }
  return number;
}

/**
 * Genera el nombre base sin número para un cliente.
 * 
 * @param clientName - Nombre del cliente (puede ser null)
 * @returns Nombre base del caso
 */
function generateBaseName(clientName: string | null): string {
  if (!clientName || clientName.trim() === '') {
    return 'Cliente vacío';
  }
  return `Caso de ${clientName.trim()}`;
}

/**
 * Genera un nombre único para un nuevo caso.
 * 
 * Algoritmo:
 * 1. Si no hay cliente, genera "Cliente vacío #N"
 * 2. Si hay cliente, obtiene su nombre y genera "Caso de [Cliente]"
 * 3. Si es el primer caso del cliente, no añade número
 * 4. Si ya existen casos, busca el siguiente número disponible
 * 5. Si se crea el segundo caso, renumera el primero a #1
 * 
 * @param clientId - ID del cliente (nullable)
 * @param orgId - ID de la organización
 * @param clientName - Nombre del cliente (opcional, se usa si clientId es null)
 * @returns Nombre generado para el caso
 * 
 * @example
 * // Primer caso de un cliente
 * await generateCaseName('client-123', 'org-456')
 * // Returns: "Caso de Acme Corp"
 * 
 * // Segundo caso del mismo cliente
 * await generateCaseName('client-123', 'org-456')
 * // Returns: "Caso de Acme Corp #2" (y renumera el primero a #1)
 *
 * // Caso de empresa
 * await generateCaseName(null, 'org-456', 'Seguros Bolívar', 'company-789')
 * // Returns: "Caso de Seguros Bolívar"
 */
export async function generateCaseName(
  clientId: string | null,
  orgId: string,
  clientName?: string | null,
  companyId?: string | null
): Promise<string> {
  // 1. Determinar nombre base del sujeto (cliente o empresa)
  let baseName: string;

  if (companyId) {
    // ✅ FASE CLIENTE/EMPRESA: Intentar obtener nombre descifrado de la empresa
    try {
      const company = await getCompanyById(companyId, orgId);
      const companyDisplayName = company?.tradeName || company?.legalName || clientName || null;
      baseName = generateBaseName(companyDisplayName);
    } catch (error) {
      console.warn('[generateCaseName] Error obteniendo empresa, usando clientName como fallback:', error);
      baseName = generateBaseName(clientName || null);
    }
  } else if (clientId) {
    // Intentar obtener nombre descifrado del cliente
    try {
      const client = await getClientById(clientId, orgId);
      baseName = generateBaseName(client?.name || clientName || null);
    } catch (error) {
      console.warn('[generateCaseName] Error obteniendo cliente, usando clientName:', error);
      baseName = generateBaseName(clientName || null);
    }
  } else {
    // Sin cliente - usar clientName o genérico
    baseName = generateBaseName(clientName || null);
  }

  // 2. Buscar casos existentes con este nombre base
  const existingCases = await prisma.case.findMany({
    where: {
      orgId: orgId,
      // Buscar casos que empiecen con el mismo nombre base
      caseName: {
        startsWith: baseName,
      },
    },
    select: {
      id: true,
      caseName: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // 3. Si no hay casos existentes, retornar nombre base sin número
  if (existingCases.length === 0) {
    return baseName;
  }

  // 4. Si hay exactamente un caso y NO tiene número, renumerarlo a #1
  if (existingCases.length === 1) {
    const firstCase = existingCases[0]!;
    if (!firstCase.caseName.includes('#')) {
      // Renumerar el primer caso a #1
      await prisma.case.update({
        where: { id: firstCase.id },
        data: { caseName: `${baseName} #1` },
      });
      console.log(`[generateCaseName] Renumerado caso ${firstCase.id} a "${baseName} #1"`);
      
      // El nuevo caso será #2
      return `${baseName} #2`;
    }
  }

  // 5. Extraer números usados y encontrar siguiente disponible
  const usedNumbers = extractUsedNumbers(existingCases.map((c) => c.caseName));
  
  // Si no hay números usados pero hay casos (caso raro), empezar desde 1
  if (usedNumbers.size === 0) {
    return `${baseName} #1`;
  }

  const nextNumber = findNextAvailableNumber(usedNumbers);
  return `${baseName} #${nextNumber}`;
}

/**
 * Valida que un nombre de caso sea válido.
 * 
 * @param caseName - Nombre a validar
 * @returns true si es válido
 */
export function validateCaseName(caseName: string): { valid: boolean; error?: string } {
  if (!caseName || typeof caseName !== 'string') {
    return { valid: false, error: 'El nombre del caso es requerido' };
  }

  const trimmed = caseName.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'El nombre del caso no puede estar vacío' };
  }

  if (trimmed.length > 255) {
    return { valid: false, error: 'El nombre del caso no puede exceder 255 caracteres' };
  }

  return { valid: true };
}

/**
 * Genera un nombre para casos creados desde la landing page
 * donde no hay cliente asignado inicialmente.
 * 
 * @param orgId - ID de la organización
 * @returns Nombre generado ("Cliente vacío #N")
 */
export async function generateLandingCaseName(orgId: string): Promise<string> {
  return generateCaseName(null, orgId, null);
}
