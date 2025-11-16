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

import PDFParser from 'pdf2json';

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
  return new Promise((resolve, reject) => {
    // Inicializar el parser de PDF
    const pdfParser = new (PDFParser as any)(null, true);
    
    // Manejar errores de parsing
    pdfParser.on('pdfParser_dataError', (errData: any) => {
      const errorMessage = errData?.parserError || 'Failed to parse PDF';
      console.error('❌ PDF parsing error:', errorMessage);
      reject(new Error(errorMessage));
    });
    
    // Procesar el PDF cuando esté listo
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        let fullText = '';
        const coordinates: TextCoordinate[] = [];
        
        // Verificar que tenemos páginas
        if (!pdfData.Pages || !Array.isArray(pdfData.Pages)) {
          throw new Error('Invalid PDF structure: no pages found');
        }
        
        // Iterar sobre cada página
        pdfData.Pages.forEach((page: any, pageIndex: number) => {
          // Verificar que la página tiene textos
          if (!page.Texts || !Array.isArray(page.Texts)) {
            console.warn(`⚠️  Página ${pageIndex + 1} no tiene textos`);
            return;
          }
          
          // Iterar sobre cada bloque de texto en la página
          page.Texts.forEach((textBlock: any) => {
            // textBlock tiene: x, y, w (width), h (height), y R (runs de texto)
            if (!textBlock.R || !Array.isArray(textBlock.R)) {
              return;
            }
            
            // Procesar cada "run" de texto dentro del bloque
            textBlock.R.forEach((run: any) => {
              try {
                // Decodificar el texto (viene URL-encoded)
                const decodedText = decodeURIComponent(run.T);
                
                // Añadir al texto completo
                fullText += decodedText + ' ';
                
                // ✅ NUEVO: Guardar coordenadas del bloque de texto
                coordinates.push({
                  text: decodedText,
                  page: pageIndex + 1, // 1-indexed para el usuario
                  x: textBlock.x || 0,
                  y: textBlock.y || 0,
                  width: textBlock.w || 0,
                  height: textBlock.h || 0
                });
              } catch (decodeError) {
                // Si falla el decode, intentar usar el texto raw
                console.warn('⚠️  Failed to decode text:', run.T);
                const rawText = run.T || '';
                fullText += rawText + ' ';
                
                coordinates.push({
                  text: rawText,
                  page: pageIndex + 1,
                  x: textBlock.x || 0,
                  y: textBlock.y || 0,
                  width: textBlock.w || 0,
                  height: textBlock.h || 0
                });
              }
            });
          });
          
          // Añadir salto de línea entre páginas
          fullText += '\n';
        });
        
        // Obtener número de páginas de los metadatos
        const totalPages = pdfData.Meta?.Pages || pdfData.Pages.length;
        
        console.log(`✅ PDF extraído: ${totalPages} páginas, ${coordinates.length} bloques de texto`);
        
        // Resolver con el resultado
        resolve({
          text: fullText.trim(),
          pages: totalPages,
          coordinates
        });
      } catch (processingError: any) {
        console.error('❌ Error processing PDF data:', processingError);
        reject(new Error(`Error processing PDF: ${processingError.message}`));
      }
    });
    
    // Iniciar el parsing
    try {
      pdfParser.parseBuffer(buffer);
    } catch (parseError: any) {
      console.error('❌ Error starting PDF parse:', parseError);
      reject(new Error(`Failed to parse PDF buffer: ${parseError.message}`));
    }
  });
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

