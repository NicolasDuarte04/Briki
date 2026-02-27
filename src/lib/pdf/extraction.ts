/**
 * PDF Extraction Utilities
 * 
 * This module provides functions to extract text and coordinates from PDF files.
 * Used for policy analysis to enable precise referencing and highlighting.
 * 
 * FASE 2: Mejora de Extracción de PDFs
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 6.3.3
 * 
 * @module pdf/extraction
 */

// ✅ FIX: Polyfills de DOMMatrix/Path2D/ImageData para Node.js serverless (Vercel/Lambda)
// DEBE importarse ANTES de pdfjs-dist — pdf.mjs ejecuta `new DOMMatrix()` a nivel de módulo
import './node-polyfills';

// ✅ FIX: Reemplazado pdf2json (fork antiguo de pdfjs, no soporta AES-256/V=5)
// por pdfjs-dist@5.4.624 que soporta V=1, V=2, V=4 y V=5 (AES-256)
// @ts-ignore - legacy build path sin type declarations, API verificada manualmente
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

// ✅ FIX: Registrar WorkerMessageHandler en globalThis ANTES de getDocument()
// pdf.worker.mjs hace self-registration: globalThis.pdfjsWorker = { WorkerMessageHandler }
// Esto evita que pdfjs intente import() dinámico (que Turbopack reescribe a [project]/...)
// @ts-ignore - side-effect import del worker para Node.js server-side
import 'pdfjs-dist/legacy/build/pdf.worker.mjs';

/**
 * Coordinate information for a text block in a PDF
 */
export interface TextCoordinate {
  /** The extracted text content */
  text: string;
  /** Page number (1-indexed) */
  page: number;
  /** X coordinate in PDF units */
  x: number;
  /** Y coordinate in PDF units */
  y: number;
  /** Width of the text block in PDF units */
  width: number;
  /** Height of the text block in PDF units */
  height: number;
}

/**
 * Result of PDF text extraction with coordinates
 */
export interface ExtractionResult {
  /** Full extracted text from all pages */
  text: string;
  /** Total number of pages in the PDF */
  pages: number;
  /** Array of text blocks with their coordinates */
  coordinates: TextCoordinate[];
}

/**
 * Legacy extraction result (for backward compatibility)
 */
export interface LegacyExtractionResult {
  /** Full extracted text from all pages */
  text: string;
  /** Total number of pages in the PDF */
  pages: number;
}

/**
 * Extrae texto de un PDF con coordenadas de posicionamiento.
 * 
 * Esta función mejorada extrae no solo el texto, sino también las coordenadas
 * exactas de cada bloque de texto en el PDF. Esto permite:
 * - Resaltado preciso de texto en el visor
 * - Referencias exactas a ubicaciones en el documento
 * - Análisis de estructura y layout del documento
 * 
 * @param buffer - Buffer del archivo PDF a procesar
 * @returns Promise que resuelve a ExtractionResult con texto y coordenadas
 * @throws Error si el PDF no puede ser parseado
 * 
 * @example
 * ```typescript
 * const pdfBuffer = fs.readFileSync('policy.pdf');
 * const result = await extractWithCoordinates(pdfBuffer);
 * console.log(`Páginas: ${result.pages}`);
 * console.log(`Bloques de texto: ${result.coordinates.length}`);
 * // Primer bloque de texto
 * console.log(result.coordinates[0]);
 * // { text: "Póliza de Seguro", page: 1, x: 100, y: 50, width: 120, height: 20 }
 * ```
 */
export async function extractWithCoordinates(
  buffer: Buffer
): Promise<ExtractionResult> {
  try {
    // Convertir Buffer a Uint8Array para pdfjs-dist
    const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    // Cargar el documento PDF con pdfjs-dist
    // ✅ isEvalSupported: false → seguridad (sin eval para compilación de fuentes)
    // ✅ useSystemFonts: false → no depender de fuentes del sistema en Vercel serverless
    const loadingTask = getDocument({
      data,
      isEvalSupported: false,
      useSystemFonts: false,
    });

    const pdfDocument = await loadingTask.promise;
    const totalPages = pdfDocument.numPages;

    let fullText = '';
    const coordinates: TextCoordinate[] = [];

    // Iterar sobre cada página
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Añadir marcador de página explícito para la IA
      fullText += `[[PAGE_${pageNum}]]\n`;

      // Procesar cada item de texto
      for (const item of textContent.items) {
        // Filtrar TextItem (tiene 'str') vs TextMarkedContent (no tiene 'str')
        if (!('str' in item) || !item.str) continue;

        const text = item.str;

        // pdfjs-dist devuelve texto ya decodificado en UTF-8 limpio
        // (no requiere safeDecodeText como pdf2json)
        fullText += text + ' ';

        // transform es una matriz [scaleX, skewY, skewX, scaleY, translateX, translateY]
        // transform[4] = x, transform[5] = y (coordenadas PDF nativas)
        coordinates.push({
          text,
          page: pageNum,
          x: item.transform?.[4] ?? 0,
          y: item.transform?.[5] ?? 0,
          width: item.width ?? 0,
          height: item.height ?? 0, // ✅ pdfjs-dist provee height real (pdf2json devolvía 0)
        });
      }

      // Añadir salto de línea entre páginas
      fullText += '\n';
    }

    // Liberar recursos del documento
    pdfDocument.destroy();

    console.log(`✅ PDF extraído: ${totalPages} páginas, ${coordinates.length} bloques de texto`);

    return {
      text: fullText.trim(),
      pages: totalPages,
      coordinates,
    };
  } catch (error: any) {
    // ✅ PDFs protegidos con contraseña de usuario (requieren password para abrir)
    if (error?.name === 'PasswordException' || error?.message?.includes('password')) {
      console.error('🔒 PDF requiere contraseña:', error.message);
      throw new Error('El PDF requiere contraseña para abrirse. Por favor, suba una versión sin protección.');
    }

    // ✅ Errores de encriptación no soportada (no debería ocurrir con pdfjs-dist v5, pero por seguridad)
    if (error?.message?.includes('encryption')) {
      console.error('🔐 Error de encriptación PDF:', error.message);
      throw new Error(`El PDF tiene encriptación no compatible: ${error.message}`);
    }

    console.error('❌ PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Extrae solo texto de un PDF (sin coordenadas).
 * 
 * Función legacy mantenida para compatibilidad con código existente.
 * Se recomienda usar extractWithCoordinates() para nuevas implementaciones.
 * 
 * @param buffer - Buffer del archivo PDF a procesar
 * @returns Promise que resuelve a objeto con text y pages
 * @throws Error si el PDF no puede ser parseado
 * 
 * @deprecated Use extractWithCoordinates() instead for enhanced functionality
 */
export async function extractTextFromPDF(
  buffer: Buffer
): Promise<LegacyExtractionResult> {
  // Usar la función mejorada y solo retornar text y pages
  const result = await extractWithCoordinates(buffer);
  return {
    text: result.text,
    pages: result.pages
  };
}

/**
 * Valida que un ExtractionResult tenga la estructura correcta
 * 
 * @param result - Resultado a validar
 * @returns true si es válido, false si no
 */
export function isValidExtractionResult(result: any): result is ExtractionResult {
  return (
    result &&
    typeof result === 'object' &&
    typeof result.text === 'string' &&
    typeof result.pages === 'number' &&
    Array.isArray(result.coordinates) &&
    result.pages > 0
  );
}

/**
 * Filtra coordenadas por página específica
 * 
 * @param coordinates - Array de coordenadas completo
 * @param page - Número de página (1-indexed)
 * @returns Array de coordenadas solo de esa página
 */
export function filterCoordinatesByPage(
  coordinates: TextCoordinate[],
  page: number
): TextCoordinate[] {
  return coordinates.filter(coord => coord.page === page);
}

/**
 * Busca texto en las coordenadas y retorna sus ubicaciones
 * 
 * @param coordinates - Array de coordenadas
 * @param searchText - Texto a buscar (case-insensitive)
 * @returns Array de coordenadas que contienen el texto buscado
 */
export function findTextCoordinates(
  coordinates: TextCoordinate[],
  searchText: string
): TextCoordinate[] {
  const searchLower = searchText.toLowerCase();
  return coordinates.filter(coord =>
    coord.text.toLowerCase().includes(searchLower)
  );
}

/**
 * Calcula el bounding box que contiene un conjunto de coordenadas
 * 
 * Útil para resaltar múltiples palabras como un solo bloque.
 * 
 * @param coordinates - Array de coordenadas a agrupar
 * @returns Bounding box que engloba todas las coordenadas
 */
export function calculateBoundingBox(
  coordinates: TextCoordinate[]
): { x: number; y: number; width: number; height: number } | null {
  if (coordinates.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  coordinates.forEach(coord => {
    minX = Math.min(minX, coord.x);
    minY = Math.min(minY, coord.y);
    maxX = Math.max(maxX, coord.x + coord.width);
    maxY = Math.max(maxY, coord.y + coord.height);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

