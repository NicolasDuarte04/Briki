/**
 * PDF Coordinate System Utilities
 * 
 * Módulo centralizado para:
 * - Detección del sistema de coordenadas de pdf2json
 * - Conversión de coordenadas PDF a píxeles web
 * - Normalización de bounding boxes
 * 
 * FUENTE DE VERDAD para todo el manejo de coordenadas PDF
 * 
 * Reutiliza lógica de:
 * - src/app/api/test/diagnose-coordinates/route.ts (detección)
 * - docs/FASE1_INVESTIGACION_COORDENADAS.md (documentación)
 */

/**
 * Coordinate system types detected from PDF
 */
export type CoordinateSystem = 'relative' | 'points' | 'unknown';

/**
 * Information about the detected coordinate system
 */
export interface CoordinateSystemInfo {
  /** Detected system type */
  system: CoordinateSystem;
  /** Is this a relative (0-100) system? */
  isRelative: boolean;
  /** Is this a points (1pt = 1/72") system? */
  isPoints: boolean;
  /** Estimated PDF dimensions in points (for points system) */
  pdfDimensions?: {
    width: number;
    height: number;
  };
  /** Average text height (for normalization when height = 0) */
  avgTextHeight: number;
  /** System detection warnings */
  warnings: string[];
}

/**
 * Text coordinate from pdf2json
 */
export interface TextCoordinate {
  text: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Rendered page dimensions in pixels
 */
export interface PageDimensions {
  /** Rendered width in pixels */
  width: number;
  /** Rendered height in pixels */
  height: number;
}

/**
 * Bounding box (in any coordinate system)
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Detect coordinate system from extracted coordinates
 * 
 * REUTILIZA lógica de src/app/api/test/diagnose-coordinates/route.ts (líneas 102-150)
 * 
 * Detecta tres sistemas posibles:
 * 1. **Relativo (0-100)**: X, Y, Width todos ≤ 100
 * 2. **Puntos (1pt = 1/72")**: X/Y entre 100-650, típico para PDFs carta/A4
 * 3. **Desconocido**: No cumple patrones conocidos
 * 
 * @param coordinates - Coordenadas extraídas del PDF
 * @returns Información del sistema detectado con metadata
 * 
 * @example
 * ```typescript
 * const coords = [{ text: "Hello", page: 1, x: 15, y: 20, width: 30, height: 2 }];
 * const info = detectCoordinateSystem(coords);
 * console.log(info.system); // 'relative'
 * console.log(info.isRelative); // true
 * ```
 */
export function detectCoordinateSystem(
  coordinates: TextCoordinate[]
): CoordinateSystemInfo {
  if (coordinates.length === 0) {
    return {
      system: 'unknown',
      isRelative: false,
      isPoints: false,
      avgTextHeight: 12,
      warnings: ['No coordinates to analyze']
    };
  }

  // Calcular rangos de coordenadas
  const xValues = coordinates.map(c => c.x);
  const yValues = coordinates.map(c => c.y);
  const widthValues = coordinates.map(c => c.width);
  const heightValues = coordinates.map(c => c.height);

  const ranges = {
    x: { 
      min: Math.min(...xValues),
      max: Math.max(...xValues),
      avg: xValues.reduce((a, b) => a + b, 0) / xValues.length
    },
    y: { 
      min: Math.min(...yValues),
      max: Math.max(...yValues),
      avg: yValues.reduce((a, b) => a + b, 0) / yValues.length
    },
    width: { 
      min: Math.min(...widthValues),
      max: Math.max(...widthValues),
      avg: widthValues.reduce((a, b) => a + b, 0) / widthValues.length
    },
    height: {
      min: Math.min(...heightValues),
      max: Math.max(...heightValues),
      avg: heightValues.reduce((a, b) => a + b, 0) / heightValues.length
    }
  };

  const warnings: string[] = [];

  // Detección de sistema relativo (0-100)
  // Todos los valores deben estar en rango 0-100
  const isRelative = 
    ranges.x.max <= 100 && 
    ranges.y.max <= 100 &&
    ranges.width.max <= 100;

  // Detección de sistema de puntos
  // X/Y típicamente entre 100-650 (PDF carta: 612x792pt)
  const isPoints = 
    ranges.x.max > 100 && 
    ranges.x.max < 650 &&
    ranges.y.max > 100 &&
    ranges.y.max < 850;

  let system: CoordinateSystem = 'unknown';
  let pdfDimensions: { width: number; height: number } | undefined;

  if (isRelative) {
    system = 'relative';
  } else if (isPoints) {
    system = 'points';
    // Estimar dimensiones del PDF basándose en los máximos
    pdfDimensions = {
      width: ranges.x.max,
      height: ranges.y.max
    };
  }

  // Advertencia: height siempre 0 (limitación conocida de pdf2json)
  if (ranges.height.max === 0) {
    warnings.push('Height is always 0. pdf2json limitation. Will use estimated height for highlights.');
  }

  // Advertencia: sistema inconsistente
  const hasWidthIssue = ranges.width.max > 100 && ranges.x.max <= 100;
  if (hasWidthIssue) {
    warnings.push(
      `Inconsistent system: X/Y relative (0-100) but Width > 100 (max: ${ranges.width.max.toFixed(2)}). ` +
      `May be hybrid system.`
    );
  }

  return {
    system,
    isRelative,
    isPoints,
    // ✅ CORRECCIÓN: Spread condicional para cumplir con exactOptionalPropertyTypes
    // Solo incluir pdfDimensions si existe y tiene valores válidos (> 0)
    ...(pdfDimensions && 
        pdfDimensions.width > 0 && 
        pdfDimensions.height > 0 && 
        { pdfDimensions }),
    avgTextHeight: ranges.height.avg > 0 ? ranges.height.avg : 12, // Fallback a 12pt
    warnings
  };
}

/**
 * Calculate estimated height when height is 0
 * 
 * pdf2json a menudo devuelve height = 0. Esta función calcula
 * una altura estimada basada en el sistema de coordenadas.
 * 
 * @param system - Sistema de coordenadas detectado
 * @param avgTextHeight - Altura promedio de texto (del análisis)
 * @param defaultPt - Altura por defecto en puntos (default: 12pt)
 * @returns Altura estimada en unidades del sistema
 * 
 * @example
 * ```typescript
 * const height = getEstimatedHeight('relative', 0, 12);
 * console.log(height); // 2 (2% para sistema relativo)
 * 
 * const heightPt = getEstimatedHeight('points', 0, 12);
 * console.log(heightPt); // 12 (12pt para sistema de puntos)
 * ```
 */
export function getEstimatedHeight(
  system: CoordinateSystem,
  avgTextHeight: number,
  defaultPt: number = 12
): number {
  // Si tenemos altura promedio válida, usarla
  if (avgTextHeight > 0) {
    return avgTextHeight;
  }
  
  // Altura por defecto depende del sistema
  if (system === 'relative') {
    // En sistema relativo, 2% de la altura de página es razonable
    // para texto de 12pt en una página de 792pt (12/792 ≈ 1.5%)
    return 2;
  } else if (system === 'points') {
    // En sistema de puntos, usar puntos directamente
    return defaultPt;
  } else {
    // Sistema desconocido: asumir puntos
    return defaultPt;
  }
}

/**
 * Convert PDF coordinates to pixel coordinates for web overlay
 * 
 * Conversión precisa que:
 * 1. Detecta el sistema de coordenadas (relativo vs puntos)
 * 2. Escala según las dimensiones reales de la página renderizada
 * 3. **Invierte el eje Y** (PDF: origen abajo-izquierda → Web: arriba-izquierda)
 * 4. Maneja height = 0 con altura estimada
 * 
 * @param coord - Bounding box en unidades PDF
 * @param systemInfo - Información del sistema de coordenadas detectado
 * @param pageDimensions - Dimensiones renderizadas de la página en píxeles
 * @returns Bounding box en coordenadas web (píxeles, origen arriba-izquierda)
 * 
 * @example
 * ```typescript
 * const pdfCoord = { x: 10, y: 20, width: 30, height: 2 };
 * const systemInfo = detectCoordinateSystem(coords);
 * const pageDims = { width: 800, height: 1000 };
 * 
 * const webCoord = convertCoordinatesToPixels(pdfCoord, systemInfo, pageDims);
 * console.log(webCoord); // { x: 80, y: 780, width: 240, height: 20 }
 * // Nota: Y está invertido (780 = 1000 - 200 - 20)
 * ```
 */
export function convertCoordinatesToPixels(
  coord: BoundingBox,
  systemInfo: CoordinateSystemInfo,
  pageDimensions: PageDimensions
): BoundingBox {
  let pixelX: number;
  let pixelY: number;
  let pixelWidth: number;
  let pixelHeight: number;

  if (systemInfo.system === 'relative') {
    // ===================================================================
    // Sistema relativo (0-100)
    // Coordenadas son porcentajes del ancho/alto de la página
    // ===================================================================
    pixelX = (coord.x / 100) * pageDimensions.width;
    pixelY = (coord.y / 100) * pageDimensions.height;
    pixelWidth = (coord.width / 100) * pageDimensions.width;
    
    // Manejar height = 0
    if (coord.height > 0) {
      pixelHeight = (coord.height / 100) * pageDimensions.height;
    } else {
      const estimatedHeight = getEstimatedHeight(systemInfo.system, systemInfo.avgTextHeight);
      pixelHeight = (estimatedHeight / 100) * pageDimensions.height;
    }
    
  } else if (systemInfo.system === 'points' && systemInfo.pdfDimensions) {
    // ===================================================================
    // Sistema de puntos (1pt = 1/72")
    // Usar dimensiones originales del PDF para la conversión
    // ===================================================================
    const pdfWidth = systemInfo.pdfDimensions.width;
    const pdfHeight = systemInfo.pdfDimensions.height;
    
    pixelX = (coord.x / pdfWidth) * pageDimensions.width;
    pixelY = (coord.y / pdfHeight) * pageDimensions.height;
    pixelWidth = (coord.width / pdfWidth) * pageDimensions.width;
    
    // Manejar height = 0
    if (coord.height > 0) {
      pixelHeight = (coord.height / pdfHeight) * pageDimensions.height;
    } else {
      const estimatedHeight = getEstimatedHeight(systemInfo.system, systemInfo.avgTextHeight);
      pixelHeight = (estimatedHeight / pdfHeight) * pageDimensions.height;
    }
    
  } else {
    // ===================================================================
    // Sistema desconocido: asumir carta (612x792pt)
    // ===================================================================
    console.warn('⚠️ [coordinateUtils] Sistema de coordenadas desconocido, asumiendo carta (612x792pt)');
    const assumedWidth = 612;
    const assumedHeight = 792;
    
    pixelX = (coord.x / assumedWidth) * pageDimensions.width;
    pixelY = (coord.y / assumedHeight) * pageDimensions.height;
    pixelWidth = (coord.width / assumedWidth) * pageDimensions.width;
    
    // Manejar height = 0
    if (coord.height > 0) {
      pixelHeight = (coord.height / assumedHeight) * pageDimensions.height;
    } else {
      const estimatedHeight = 12; // 12pt por defecto
      pixelHeight = (estimatedHeight / assumedHeight) * pageDimensions.height;
    }
  }

  // ===================================================================
  // CRÍTICO: Invertir eje Y
  // PDF: origen en esquina INFERIOR IZQUIERDA, Y crece hacia ARRIBA
  // Web: origen en esquina SUPERIOR IZQUIERDA, Y crece hacia ABAJO
  // ===================================================================
  const webY = pageDimensions.height - pixelY - pixelHeight;

  return {
    x: Math.round(pixelX),
    y: Math.round(webY),  // ✅ Y invertido
    width: Math.round(pixelWidth),
    height: Math.round(pixelHeight)
  };
}

/**
 * Get coordinate system description for logging
 * 
 * @param systemInfo - Información del sistema de coordenadas
 * @returns Descripción legible del sistema
 */
export function getCoordinateSystemDescription(systemInfo: CoordinateSystemInfo): string {
  if (systemInfo.system === 'relative') {
    return 'Relativo (0-100). Conversión: pixelX = (coordX / 100) * pageWidth';
  } else if (systemInfo.system === 'points' && systemInfo.pdfDimensions) {
    const widthInches = (systemInfo.pdfDimensions.width / 72).toFixed(2);
    const heightInches = (systemInfo.pdfDimensions.height / 72).toFixed(2);
    return `Puntos (1pt = 1/72"). PDF: ${widthInches}" × ${heightInches}". Conversión: pixelX = (coordX / pdfWidth) * pageWidth`;
  } else {
    return 'Sistema desconocido. Usando dimensiones asumidas (612x792pt carta).';
  }
}

