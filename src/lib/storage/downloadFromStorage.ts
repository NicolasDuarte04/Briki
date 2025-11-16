/**
 * Storage Download Utilities
 * 
 * This module provides functions to download files from Supabase Storage.
 * Used for retrieving PDF files for analysis.
 * 
 * FASE 3: API de Análisis de Pólizas
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 6.3.1
 * 
 * @module storage/downloadFromStorage
 */

import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Download a file from Supabase Storage
 * 
 * @param fileId - The storage path of the file (artifact.fileId)
 * @returns Buffer with the file contents
 * @throws Error if download fails or file not found
 * 
 * @example
 * ```typescript
 * const buffer = await downloadFromStorage('org-id/case-id/file.pdf');
 * ```
 */
export async function downloadFromStorage(fileId: string): Promise<Buffer> {
  console.log(`📥 Descargando archivo desde Storage: ${fileId}`);
  
  try {
    const supabase = await createServerSupabase();
    
    // Download file from 'artifacts' bucket
    const { data, error } = await supabase.storage
      .from('artifacts')
      .download(fileId);
    
    if (error) {
      console.error('❌ Error descargando desde Storage:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data returned from storage');
    }
    
    // Convert Blob to Buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`✅ Archivo descargado: ${buffer.length} bytes`);
    
    return buffer;
  } catch (error: any) {
    console.error('❌ Error en downloadFromStorage:', error);
    throw new Error(`Storage download failed: ${error.message}`);
  }
}

/**
 * Check if a file exists in Storage
 * 
 * @param fileId - The storage path of the file
 * @returns true if exists, false otherwise
 */
export async function fileExistsInStorage(fileId: string): Promise<boolean> {
  try {
    const supabase = await createServerSupabase();
    
    const { data, error } = await supabase.storage
      .from('artifacts')
      .list(fileId.split('/').slice(0, -1).join('/'));
    
    if (error) return false;
    
    const fileName = fileId.split('/').pop();
    return data?.some(file => file.name === fileName) ?? false;
  } catch {
    return false;
  }
}

/**
 * Get file metadata from Storage
 * 
 * @param fileId - The storage path of the file
 * @returns Metadata object or null if not found
 */
export async function getFileMetadata(fileId: string): Promise<{
  size: number;
  contentType: string;
  lastModified: string;
} | null> {
  try {
    const supabase = await createServerSupabase();
    
    // Get file info
    const pathParts = fileId.split('/');
    const fileName = pathParts.pop();
    const directory = pathParts.join('/');
    
    const { data, error } = await supabase.storage
      .from('artifacts')
      .list(directory);
    
    if (error || !data) return null;
    
    const file = data.find(f => f.name === fileName);
    if (!file) return null;
    
    return {
      size: file.metadata?.size || 0,
      contentType: file.metadata?.mimetype || 'application/octet-stream',
      lastModified: file.metadata?.lastModified || new Date().toISOString()
    };
  } catch {
    return null;
  }
}

