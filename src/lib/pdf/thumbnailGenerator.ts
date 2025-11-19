
/**
 * thumbnailGenerator.ts
 * 
 * Utilidades para generar thumbnails de páginas PDF usando pdf.js
 * 
 * Features:
 * - Generación de thumbnails en canvas
 * - Conversión a data URL
 * - Cache de thumbnails generados
 * - Generación lazy y en background
 */

import { pdfjs } from 'react-pdf';


const getDocument = pdfjs.getDocument;
const GlobalWorkerOptions = pdfjs.GlobalWorkerOptions;

// Configurar worker de PDF.js si no está configurado
if (typeof window !== 'undefined' && !GlobalWorkerOptions.workerSrc) {
  GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

/**
 * Configuración para generación de thumbnails
 */
export interface ThumbnailConfig {
  scale: number;        // Escala del thumbnail (0.1 = 10% del tamaño original)
  quality: number;      // Calidad de la imagen (0-1)
  format: 'png' | 'jpeg'; // Formato de la imagen
}

/**
 * Thumbnail generado
 */
export interface Thumbnail {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
  generatedAt: number;
}

/**
 * Cache de thumbnails
 */
class ThumbnailCache {
  private cache: Map<string, Thumbnail> = new Map();
  private maxSize: number = 100; // Máximo de thumbnails en cache

  getCacheKey(pdfUrl: string, pageNumber: number, scale: number): string {
    return `${pdfUrl}:${pageNumber}:${scale}`;
  }

  get(pdfUrl: string, pageNumber: number, scale: number): Thumbnail | undefined {
    const key = this.getCacheKey(pdfUrl, pageNumber, scale);
    return this.cache.get(key);
  }

  set(pdfUrl: string, pageNumber: number, scale: number, thumbnail: Thumbnail): void {
    const key = this.getCacheKey(pdfUrl, pageNumber, scale);

    // Si el cache está lleno, eliminar el más antiguo
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].generatedAt - b[1].generatedAt)[0]?.[0];

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, thumbnail);
  }

  clear(): void {
    this.cache.clear();
  }

  getSize(): number {
    return this.cache.size;
  }
}

// Singleton cache
const thumbnailCache = new ThumbnailCache();

/**
 * Genera un thumbnail de una página específica de un PDF
 * 
 * @param pdfUrl URL del PDF
 * @param pageNumber Número de página (1-indexed)
 * @param config Configuración del thumbnail
 * @returns Promise con el thumbnail generado
 */
export async function generatePageThumbnail(
  pdfUrl: string,
  pageNumber: number,
  config: Partial<ThumbnailConfig> = {}
): Promise<Thumbnail> {
  const finalConfig: ThumbnailConfig = {
    scale: config.scale || 0.2,
    quality: config.quality || 0.8,
    format: config.format || 'jpeg'
  };

  // Verificar cache
  const cached = thumbnailCache.get(pdfUrl, pageNumber, finalConfig.scale);
  if (cached) {
    console.log(`✅ [Thumbnail] Using cached thumbnail for page ${pageNumber}`);
    return cached;
  }

  console.log(`🔄 [Thumbnail] Generating thumbnail for page ${pageNumber}...`);

  try {
    // Cargar el documento PDF
    const loadingTask = getDocument(pdfUrl);
    const pdf = await loadingTask.promise;

    // Obtener la página específica
    const page = await pdf.getPage(pageNumber);

    // Obtener el viewport con la escala especificada
    const viewport = page.getViewport({ scale: finalConfig.scale });

    // Crear canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('No se pudo obtener contexto 2D del canvas');
    }

    // Configurar dimensiones del canvas
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Renderizar la página en el canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas, // Required by RenderParameters type
    };

    await page.render(renderContext).promise;

    // Convertir canvas a data URL
    const mimeType = finalConfig.format === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(mimeType, finalConfig.quality);

    // Crear objeto thumbnail
    const thumbnail: Thumbnail = {
      pageNumber,
      dataUrl,
      width: viewport.width,
      height: viewport.height,
      generatedAt: Date.now()
    };

    // Guardar en cache
    thumbnailCache.set(pdfUrl, pageNumber, finalConfig.scale, thumbnail);

    console.log(`✅ [Thumbnail] Generated thumbnail for page ${pageNumber} (${viewport.width}x${viewport.height})`);

    // Limpiar
    page.cleanup();

    return thumbnail;
  } catch (error) {
    console.error(`❌ [Thumbnail] Error generating thumbnail for page ${pageNumber}:`, error);
    throw error;
  }
}

/**
 * Genera thumbnails para un rango de páginas
 * 
 * @param pdfUrl URL del PDF
 * @param startPage Página inicial (1-indexed)
 * @param endPage Página final (1-indexed)
 * @param config Configuración del thumbnail
 * @param onProgress Callback de progreso (opcional)
 * @returns Promise con array de thumbnails generados
 */
export async function generateThumbnailRange(
  pdfUrl: string,
  startPage: number,
  endPage: number,
  config: Partial<ThumbnailConfig> = {},
  onProgress?: (current: number, total: number) => void
): Promise<Thumbnail[]> {
  const thumbnails: Thumbnail[] = [];
  const total = endPage - startPage + 1;

  console.log(`🔄 [Thumbnail] Generating ${total} thumbnails (pages ${startPage}-${endPage})...`);

  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    try {
      const thumbnail = await generatePageThumbnail(pdfUrl, pageNum, config);
      thumbnails.push(thumbnail);

      if (onProgress) {
        onProgress(pageNum - startPage + 1, total);
      }
    } catch (error) {
      console.error(`❌ [Thumbnail] Failed to generate thumbnail for page ${pageNum}:`, error);
      // Continuar con las demás páginas
    }
  }

  console.log(`✅ [Thumbnail] Generated ${thumbnails.length}/${total} thumbnails`);

  return thumbnails;
}

/**
 * Genera thumbnails para todas las páginas de un PDF
 * 
 * @param pdfUrl URL del PDF
 * @param config Configuración del thumbnail
 * @param onProgress Callback de progreso (opcional)
 * @param maxConcurrent Máximo de generaciones concurrentes
 * @returns Promise con array de thumbnails generados
 */
export async function generateAllThumbnails(
  pdfUrl: string,
  config: Partial<ThumbnailConfig> = {},
  onProgress?: (current: number, total: number) => void,
  maxConcurrent: number = 3
): Promise<Thumbnail[]> {
  console.log(`🔄 [Thumbnail] Loading PDF to get page count...`);

  // Obtener número total de páginas
  const loadingTask = getDocument(pdfUrl);
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  console.log(`📄 [Thumbnail] PDF has ${totalPages} pages`);

  // Generar thumbnails en lotes para no saturar el navegador
  const thumbnails: Thumbnail[] = [];

  for (let i = 0; i < totalPages; i += maxConcurrent) {
    const endPage = Math.min(i + maxConcurrent, totalPages);
    const batch = await generateThumbnailRange(
      pdfUrl,
      i + 1,
      endPage,
      config,
      (current, total) => {
        if (onProgress) {
          onProgress(i + current, totalPages);
        }
      }
    );
    thumbnails.push(...batch);
  }

  return thumbnails;
}

/**
 * Limpia el cache de thumbnails
 */
export function clearThumbnailCache(): void {
  thumbnailCache.clear();
  console.log('🗑️ [Thumbnail] Cache cleared');
}

/**
 * Obtiene el tamaño actual del cache
 */
export function getThumbnailCacheSize(): number {
  return thumbnailCache.getSize();
}

