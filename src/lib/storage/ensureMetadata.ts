/**
 * Helper centralizado para asegurar metadata correcta en archivos de Storage
 * 
 * Principios:
 * - Reutilización máxima: Centraliza lógica de metadata
 * - Separación de responsabilidades: Solo maneja metadata
 * - Consistencia: Garantiza formato uniforme
 * 
 * @param bucket - Bucket de Storage ('artifacts' | 'proposals')
 * @param filePath - Ruta del archivo en Storage
 * @param params - Parámetros para metadata
 * @returns Resultado de la operación
 */

import { createServerSupabase } from '@/lib/supabase/server';

export interface MetadataParams {
  orgId: string;
  caseId?: string;
  userId: string;
  fileName: string;
  contentType: string;
  additionalMetadata?: Record<string, string>;
}

export interface EnsureMetadataResult {
  success: boolean;
  error?: string;
}

/**
 * Asegura que un archivo en Storage tenga metadata correcta
 * 
 * @param bucket - Bucket de Storage ('artifacts' | 'proposals')
 * @param filePath - Ruta del archivo en Storage
 * @param params - Parámetros para metadata
 * @returns Resultado de la operación
 */
export async function ensureStorageMetadata(
  bucket: 'artifacts' | 'proposals',
  filePath: string,
  params: MetadataParams
): Promise<EnsureMetadataResult> {
  try {
    const supabase = await createServerSupabase();
    
    // Construir metadata base con conversión explícita a strings
    // CRÍTICO: Supabase Storage requiere que TODOS los valores de metadata sean strings
    const metadata: Record<string, string> = {
      org_id: String(params.orgId),
      uploaded_by: String(params.userId),
      file_name: String(params.fileName),
      content_type: String(params.contentType),
      uploaded_at: new Date().toISOString(),
      ...(params.caseId && { case_id: String(params.caseId) }),
      ...(params.additionalMetadata || {}),
    };
    
    // Actualizar metadata del archivo
    const { error } = await supabase.storage
      .from(bucket)
      .update(filePath, null, { metadata });
    
    if (error) {
      console.error('❌ [ensureStorageMetadata] Error actualizando metadata:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ [ensureStorageMetadata] Error inesperado:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Valida que un archivo en Storage tenga metadata correcta
 * 
 * @param bucket - Bucket de Storage
 * @param filePath - Ruta del archivo
 * @param requiredFields - Campos requeridos en metadata
 * @returns Resultado de validación
 */
export async function validateStorageMetadata(
  bucket: 'artifacts' | 'proposals',
  filePath: string,
  requiredFields: string[] = ['org_id', 'uploaded_by']
): Promise<{ valid: boolean; missingFields: string[]; error?: string }> {
  try {
    const supabase = await createServerSupabase();
    
    // Extraer directorio y nombre de archivo
    const pathParts = filePath.split('/');
    const fileName = pathParts.pop() || '';
    const directory = pathParts.join('/');
    
    // Obtener metadata del archivo
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(directory || '', {
        limit: 100,
        search: fileName
      });
    
    if (error) {
      return { 
        valid: false, 
        missingFields: requiredFields, 
        error: error.message 
      };
    }
    
    if (!files || files.length === 0) {
      return { 
        valid: false, 
        missingFields: requiredFields, 
        error: 'File not found' 
      };
    }
    
    // Buscar el archivo exacto
    const file = files.find(f => f.name === fileName);
    
    if (!file) {
      return { 
        valid: false, 
        missingFields: requiredFields, 
        error: 'File not found in list' 
      };
    }
    
    const metadata = file.metadata || {};
    
    // Validar campos requeridos
    const missingFields = requiredFields.filter(field => !metadata[field]);
    
    return {
      valid: missingFields.length === 0,
      missingFields
    };
  } catch (error: any) {
    return { 
      valid: false, 
      missingFields: requiredFields, 
      error: error.message || 'Unknown error' 
    };
  }
}

