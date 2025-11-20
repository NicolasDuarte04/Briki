/**
 * Función helper para buscar artifacts duplicados globalmente
 * 
 * Esta función:
 * 1. Busca artifacts con el mismo fileHash en TODOS los casos (no solo en el mismo)
 * 2. Retorna el artifact existente si se encuentra
 * 3. Permite reutilizar archivos existentes o rechazar uploads duplicados
 * 
 * Principios:
 * - Reutilización máxima: Centraliza lógica de búsqueda de duplicados
 * - Separación de responsabilidades: Solo busca, no modifica
 * - Optimización: Usa query eficiente con Prisma
 * 
 * @param fileHash - Hash SHA256 del archivo
 * @param excludeCaseId - Opcional: Excluir artifacts de un caso específico (para verificación local)
 * @returns Artifact existente con el mismo hash, o null si no existe
 */

import { prisma } from '@/lib/prisma';

export interface FindDuplicateResult {
  exists: boolean;
  artifact?: {
    id: string;
    caseId: string;
    fileId: string | null;
    fileName: string | null;
    createdAt: Date;
  };
}

/**
 * Busca un artifact duplicado globalmente por fileHash
 * 
 * @param fileHash - Hash SHA256 del archivo a buscar
 * @param excludeCaseId - Opcional: Excluir artifacts de este caso (para verificación local)
 * @returns Resultado con artifact existente si se encuentra
 */
export async function findDuplicateArtifact(
  fileHash: string,
  excludeCaseId?: string
): Promise<FindDuplicateResult> {
  try {
    // ✅ OPTIMIZACIÓN: Usar $queryRaw para query SQL directa y eficiente
    // Esto es más eficiente que buscar todos los artifacts y filtrar en memoria
    // Usa JSONB path query nativo de PostgreSQL
    
    let query = `
      SELECT 
        id,
        case_id as "caseId",
        file_id as "fileId",
        file_name as "fileName",
        created_at as "createdAt"
      FROM public.artifacts
      WHERE provenance->>'fileHash' = $1
    `;
    
    const params: any[] = [fileHash];
    
    // Si se especifica excludeCaseId, excluir artifacts de ese caso
    if (excludeCaseId) {
      query += ` AND case_id != $2`;
      params.push(excludeCaseId);
    }
    
    // Ordenar por fecha de creación (más antiguo primero)
    query += ` ORDER BY created_at ASC LIMIT 1`;
    
    const results = await prisma.$queryRawUnsafe<Array<{
      id: string;
      caseId: string;
      fileId: string | null;
      fileName: string | null;
      createdAt: Date;
    }>>(query, ...params);

    if (results && results.length > 0) {
      const firstResult = results[0];
      
      // ✅ CORRECCIÓN: Type guard explícito para results[0]
      // Aunque la verificación de length > 0 garantiza lógicamente que existe un elemento,
      // TypeScript no puede inferir esta garantía desde el análisis estático.
      // Este check asegura type-safety completo y respeta exactOptionalPropertyTypes.
      if (!firstResult) {
        console.warn('[findDuplicateArtifact] Unexpected: results has length but first element is undefined');
        return { exists: false };
      }
      
      // Ahora TypeScript sabe que firstResult es definitivamente del tipo correcto, no undefined
      return {
        exists: true,
        artifact: firstResult
      };
    }

    return { exists: false };
  } catch (error: any) {
    console.error('❌ [findDuplicateArtifact] Error buscando duplicado:', error);
    // En caso de error, retornar que no existe (no bloquear upload)
    return { exists: false };
  }
}

