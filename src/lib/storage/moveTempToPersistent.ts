/**
 * Función helper para mover archivos temporales a rutas persistentes
 * 
 * Esta función:
 * 1. Descarga el archivo temporal desde Storage
 * 2. Sube el archivo a la ruta persistente con metadata correcta
 * 3. Elimina el archivo temporal original
 * 
 * Principios:
 * - Reutilización máxima: Centraliza lógica de movimiento
 * - Separación de responsabilidades: Solo maneja movimiento de archivos
 * - Manejo robusto de errores: Fallback a ruta temporal si falla
 * 
 * @param params - Parámetros para mover archivo
 * @returns Resultado de la operación con nueva ruta persistente o error
 */

import { createServerSupabase } from '@/lib/supabase/server';

export interface MoveTempToPersistentParams {
  tempPath: string;
  orgId: string;
  caseId: string;
  fileName: string;
  userId: string;
}

export interface MoveTempToPersistentResult {
  success: boolean;
  persistentPath?: string;
  error?: string;
  warning?: string;
}

export async function moveTempToPersistent({
  tempPath,
  orgId,
  caseId,
  fileName,
  userId
}: MoveTempToPersistentParams): Promise<MoveTempToPersistentResult> {
  try {
    const supabase = await createServerSupabase();
    
    // ✅ VALIDACIÓN: Asegurar que tempPath es temporal
    if (!tempPath || !tempPath.startsWith('temp/')) {
      return { 
        success: false, 
        error: 'Path is not a temporary path. Expected path starting with "temp/"' 
      };
    }
    
    console.log('🔄 [moveTempToPersistent] Iniciando movimiento:', {
      tempPath,
      orgId,
      caseId,
      fileName
    });
    
    // Generar ruta persistente
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const persistentPath = `${orgId}/${caseId}/${timestamp}_${sanitizedFileName}`;
    
    // 1. Descargar archivo temporal
    console.log('📥 [moveTempToPersistent] Descargando archivo temporal...');
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('artifacts')
      .download(tempPath);
    
    if (downloadError || !fileData) {
      console.error('❌ [moveTempToPersistent] Error descargando archivo temporal:', downloadError);
      return { 
        success: false, 
        error: `Failed to download temp file: ${downloadError?.message || 'File not found'}` 
      };
    }
    
    console.log('✅ [moveTempToPersistent] Archivo descargado correctamente');
    
    // Convertir Blob a Buffer para upload
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 2. Subir archivo a ruta persistente con metadata correcta
    console.log('📤 [moveTempToPersistent] Subiendo a ruta persistente:', persistentPath);
    const { error: uploadError } = await supabase.storage
      .from('artifacts')
      .upload(persistentPath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf',
        metadata: {
          org_id: String(orgId),        // ✅ CRÍTICO: Conversión explícita a string
          case_id: String(caseId),       // ✅ CRÍTICO: Conversión explícita a string
          uploaded_by: String(userId),  // ✅ CRÍTICO: Conversión explícita a string
          file_name: String(fileName),   // ✅ Ya es string, pero explícito para consistencia
          content_type: 'application/pdf',
          uploaded_at: new Date().toISOString(),
          migrated_from_temp: 'true',
          original_temp_path: tempPath,
        }
      });
    
    if (uploadError) {
      console.error('❌ [moveTempToPersistent] Error subiendo archivo persistente:', uploadError);
      return { 
        success: false, 
        error: `Failed to upload to persistent path: ${uploadError.message}` 
      };
    }
    
    console.log('✅ [moveTempToPersistent] Archivo subido a ruta persistente correctamente');
    
    // 3. Eliminar archivo temporal original
    console.log('🗑️ [moveTempToPersistent] Eliminando archivo temporal...');
    const { error: deleteError } = await supabase.storage
      .from('artifacts')
      .remove([tempPath]);
    
    if (deleteError) {
      console.warn('⚠️ [moveTempToPersistent] Error eliminando archivo temporal (no crítico):', deleteError);
      // No fallar la operación completa si la eliminación falla
      // El archivo temporal puede limpiarse después con la función de limpieza automática
      return { 
        success: true, 
        persistentPath,
        warning: `File moved successfully but temp file could not be deleted: ${deleteError.message}. It will be cleaned up automatically.`
      };
    }
    
    console.log('✅ [moveTempToPersistent] Archivo temporal eliminado correctamente');
    console.log('✅ [moveTempToPersistent] Movimiento completado:', persistentPath);
    
    return { success: true, persistentPath };
  } catch (error: any) {
    console.error('❌ [moveTempToPersistent] Error inesperado:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred during file movement' 
    };
  }
}

