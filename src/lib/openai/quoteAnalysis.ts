/**
 * Quote Analysis with AI
 * 
 * Este módulo proporciona funciones para analizar PDFs de cotizaciones de seguros
 * usando OpenAI, extrayendo datos estructurados con scores de confianza y referencias a páginas.
 * 
 * Diferencia con policyAnalysis:
 * - Campos específicos de cotización (prima cotizada, validez de oferta, etc.)
 * - Prompt especializado para propuestas vs pólizas emitidas
 * - Énfasis en comparación de ofertas
 * 
 * @module openai/quoteAnalysis
 */

import OpenAI from 'openai';
import { detectCoordinateSystem, type CoordinateSystemInfo, getCoordinateSystemDescription } from '@/lib/pdf/coordinateUtils';
import { getOpenAIClient, parseAIResponse } from './policyAnalysis';

// Re-exportamos utilidades comunes
export { getOpenAIClient, parseAIResponse };

/**
 * Input for quote analysis
 */
export interface QuoteAnalysisInput {
  /** Extracted text from PDF */
  text: string;
  /** Text coordinates from PDF */
  coordinates: Array<{
    text: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  /** Extraction method used */
  extractionMethod?: 'manual' | 'ocr' | 'hybrid';
}

/**
 * Page reference for a specific field
 */
export interface QuotePageReference {
  /** Field name */
  field: string;
  /** Extracted value */
  value: string;
  /** Page number (1-indexed) */
  page: number;
  /** Bounding box [x, y, width, height] */
  box?: [number, number, number, number];
  /** Confidence for this specific field */
  confidence: number;
}

/**
 * Structured data extracted from quote
 */
export interface QuoteExtractedData {
  // Información de aseguradora
  insurer?: {
    name?: string;
    code?: string;
    branch?: string;
    agent?: string;
    contact?: {
      phone?: string;
      email?: string;
      address?: string;
    };
    confidence?: number;
  };

  // Información del cotizante/prospecto
  prospect?: {
    name?: string;
    id?: string;
    company?: string;
    contact?: {
      phone?: string;
      email?: string;
      address?: string;
    };
    confidence?: number;
  };

  // Datos de la cotización
  quote?: {
    number?: string;
    date?: string;
    valid_until?: string;
    product_name?: string;
    product_code?: string;
    branch_type?: string;
    confidence?: number;
  };

  // Objeto asegurado / riesgo
  insured_object?: {
    type?: string;
    description?: string;
    value?: number;
    currency?: string;
    location?: string;
    details?: Record<string, any>;
    confidence?: number;
  };

  // Información financiera de la cotización
  financials?: {
    quoted_premium?: number;
    net_premium?: number;
    taxes?: number;
    fees?: number;
    total_premium?: number;
    payment_frequency?: string;
    currency?: string;
    deductibles?: Array<{
      type?: string;
      amount?: number;
      percentage?: number;
      applies_to?: string;
    }>;
    confidence?: number;
  };

  // Vigencia propuesta
  proposed_term?: {
    start_date?: string;
    end_date?: string;
    duration_months?: number;
    confidence?: number;
  };

  // Coberturas ofrecidas
  coverages?: Array<{
    name: string;
    limit?: number;
    currency?: string;
    deductible?: number;
    description?: string;
    included?: boolean;
    optional?: boolean;
    additional_premium?: number;
    confidence?: number;
  }>;

  // Exclusiones principales
  exclusions?: Array<{
    name: string;
    description?: string;
    confidence?: number;
  }>;

  // Condiciones especiales de la oferta
  special_conditions?: Array<{
    type?: string;
    description: string;
    confidence?: number;
  }>;

  // Requisitos para emisión
  requirements?: Array<{
    description: string;
    mandatory?: boolean;
    confidence?: number;
  }>;

  // Notas adicionales
  notes?: string[];

  // Metadatos del análisis
  _metadata?: {
    raw_confidence?: number;
    pages_analyzed?: number;
    extraction_quality?: string;
    analysis_notes?: string[];
  };
}

/**
 * Output from quote analysis
 */
export interface QuoteAnalysisOutput {
  /** Structured quote data */
  data: QuoteExtractedData;
  /** Overall confidence score (0-1) */
  confidence: number;
  /** Page references for each field */
  pageReferences: QuotePageReference[];
  /** Coordinate system information (for PDF viewer) */
  coordinateSystem?: CoordinateSystemInfo;
}

/**
 * Validate a page reference object
 */
function validateQuotePageReference(ref: any): boolean {
  if (!ref || typeof ref !== 'object') return false;
  if (typeof ref.field !== 'string' || !ref.field) return false;
  if (typeof ref.page !== 'number' || ref.page < 1) return false;
  if (typeof ref.confidence !== 'number' || ref.confidence < 0 || ref.confidence > 1) return false;
  return true;
}

/**
 * Normalize analysis result to ensure consistent structure
 */
function normalizeQuoteAnalysisResult(
  result: any, 
  coordinates: QuoteAnalysisInput['coordinates']
): QuoteAnalysisOutput {
  // Extract data with defaults
  const data: QuoteExtractedData = result.data || {};
  
  // Calculate overall confidence
  let confidence = result.confidence;
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    // Calcular desde los datos si no viene
    const confidenceValues: number[] = [];
    
    if (data.insurer?.confidence) confidenceValues.push(data.insurer.confidence);
    if (data.prospect?.confidence) confidenceValues.push(data.prospect.confidence);
    if (data.quote?.confidence) confidenceValues.push(data.quote.confidence);
    if (data.financials?.confidence) confidenceValues.push(data.financials.confidence);
    if (data.proposed_term?.confidence) confidenceValues.push(data.proposed_term.confidence);
    
    confidence = confidenceValues.length > 0
      ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
      : 0.5;
  }

  // Normalize page references
  let pageReferences: QuotePageReference[] = [];
  if (Array.isArray(result.pageReferences)) {
    pageReferences = result.pageReferences
      .filter(validateQuotePageReference)
      .map((ref: any) => ({
        field: ref.field,
        value: String(ref.value || ''),
        page: ref.page,
        box: ref.box || undefined,
        confidence: ref.confidence
      }));
  }

  return {
    data,
    confidence,
    pageReferences
  };
}

/**
 * Build analysis prompt specific for quotes
 */
function buildQuoteAnalysisPrompt(input: QuoteAnalysisInput): string {
  // Limitar coordenadas para no exceder límite de tokens
  const coordinatesSample = input.coordinates.slice(0, 200).map(c => ({
    text: c.text.substring(0, 100),
    page: c.page,
    x: Math.round(c.x),
    y: Math.round(c.y)
  }));

  return `
Analiza el siguiente texto extraído de un PDF de COTIZACIÓN de seguros (propuesta comercial, NO póliza emitida).

═══════════════════════════════════════════════════════════
TEXTO DEL PDF:
═══════════════════════════════════════════════════════════

${input.text}

═══════════════════════════════════════════════════════════
COORDENADAS DE TEXTO (muestra para referencias):
═══════════════════════════════════════════════════════════

${JSON.stringify(coordinatesSample, null, 2)}

═══════════════════════════════════════════════════════════
INSTRUCCIONES:
═══════════════════════════════════════════════════════════

IMPORTANTE: Este es un documento de COTIZACIÓN/PROPUESTA, no una póliza emitida.
Las cotizaciones son ofertas comerciales de aseguradoras que:
- Tienen fecha de validez limitada
- Pueden incluir opciones de cobertura
- Muestran primas estimadas/cotizadas
- Incluyen requisitos para formalizar la contratación

1. **Identifica y extrae los siguientes datos:**

   **Aseguradora:**
   - Nombre de la compañía de seguros
   - Código o número de aseguradora
   - Sucursal o agente
   - Contacto (teléfono, email)

   **Cotizante/Prospecto:**
   - Nombre o razón social
   - Identificación (RFC, CURP, etc.)
   - Empresa (si aplica)
   - Datos de contacto

   **Datos de la Cotización:**
   - Número de cotización
   - Fecha de emisión de la cotización
   - Fecha de validez (hasta cuándo es válida la oferta)
   - Nombre del producto cotizado
   - Ramo o tipo de seguro

   **Objeto Asegurado / Riesgo:**
   - Tipo de bien o riesgo (vehículo, inmueble, persona, etc.)
   - Descripción detallada
   - Valor declarado
   - Ubicación (si aplica)

   **Información Financiera:**
   - Prima cotizada/total
   - Prima neta (sin impuestos)
   - Impuestos
   - Gastos de emisión
   - Frecuencia de pago propuesta
   - Moneda
   - Deducibles propuestos

   **Vigencia Propuesta:**
   - Fecha de inicio propuesta
   - Fecha de fin propuesta
   - Duración en meses

   **Coberturas Ofrecidas:**
   - Lista de coberturas incluidas
   - Sumas aseguradas/límites por cobertura
   - Coberturas opcionales disponibles
   - Primas adicionales por coberturas opcionales

   **Exclusiones:**
   - Principales exclusiones mencionadas

   **Condiciones Especiales:**
   - Descuentos ofrecidos
   - Bonificaciones
   - Condiciones especiales de la oferta

   **Requisitos para Contratación:**
   - Documentos requeridos
   - Inspecciones necesarias
   - Otras condiciones previas

2. **Para cada dato extraído:**
   - Indica el número de página donde aparece
   - Asigna un nivel de confianza (0 a 1)
   - Proporciona las coordenadas aproximadas si es posible

3. **Nivel de Confianza:**
   - 0.95-1.0: Dato explícito y claramente legible
   - 0.8-0.94: Dato presente pero requiere interpretación menor
   - 0.6-0.79: Dato inferido o parcialmente visible
   - 0.4-0.59: Dato muy ambiguo o difícil de leer
   - <0.4: No encontrado o poco confiable

4. **Responde ÚNICAMENTE con JSON válido** en este formato:

{
  "data": {
    "insurer": {
      "name": "string",
      "code": "string o null",
      "branch": "string o null",
      "agent": "string o null",
      "contact": {
        "phone": "string o null",
        "email": "string o null"
      },
      "confidence": 0.95
    },
    "prospect": {
      "name": "string",
      "id": "string o null",
      "company": "string o null",
      "contact": { ... },
      "confidence": 0.9
    },
    "quote": {
      "number": "string o null",
      "date": "YYYY-MM-DD o null",
      "valid_until": "YYYY-MM-DD o null",
      "product_name": "string",
      "product_code": "string o null",
      "branch_type": "string (auto, vida, daños, GMM, etc.)",
      "confidence": 0.85
    },
    "insured_object": {
      "type": "string",
      "description": "string",
      "value": number,
      "currency": "MXN/USD/etc",
      "location": "string o null",
      "details": { ... objeto libre ... },
      "confidence": 0.8
    },
    "financials": {
      "quoted_premium": number,
      "net_premium": number o null,
      "taxes": number o null,
      "fees": number o null,
      "total_premium": number,
      "payment_frequency": "anual/semestral/trimestral/mensual",
      "currency": "MXN",
      "deductibles": [
        { "type": "string", "amount": number, "percentage": number, "applies_to": "string" }
      ],
      "confidence": 0.9
    },
    "proposed_term": {
      "start_date": "YYYY-MM-DD o null",
      "end_date": "YYYY-MM-DD o null",
      "duration_months": number,
      "confidence": 0.85
    },
    "coverages": [
      {
        "name": "string",
        "limit": number,
        "currency": "MXN",
        "deductible": number o null,
        "description": "string o null",
        "included": true,
        "optional": false,
        "additional_premium": number o null,
        "confidence": 0.85
      }
    ],
    "exclusions": [
      { "name": "string", "description": "string o null", "confidence": 0.8 }
    ],
    "special_conditions": [
      { "type": "descuento/bonificación/condición", "description": "string", "confidence": 0.7 }
    ],
    "requirements": [
      { "description": "string", "mandatory": true, "confidence": 0.8 }
    ],
    "notes": ["string"]
  },
  "confidence": 0.85,
  "pageReferences": [
    {
      "field": "insurer.name",
      "value": "valor encontrado",
      "page": 1,
      "box": [x, y, width, height],
      "confidence": 0.95
    }
  ]
}

IMPORTANTE:
- Usa null para campos no encontrados, NO inventes datos
- Las fechas deben estar en formato ISO 8601 (YYYY-MM-DD)
- Los montos deben ser números sin formato (ej: 15000.00, no "$15,000.00")
- Distingue claramente entre prima cotizada y prima total (con impuestos)
- Si hay múltiples opciones de cobertura, incluye todas
- Marca coberturas opcionales con "optional": true
`;
}

/**
 * Analyze a quote PDF with AI
 * 
 * Uses OpenAI GPT-4 to extract structured data from quote text,
 * including confidence scores and page references.
 * 
 * @param input - Analysis input with text and coordinates
 * @returns Structured quote data with confidence and references
 */
export async function analyzeQuoteWithAI(input: QuoteAnalysisInput): Promise<QuoteAnalysisOutput> {
  console.log('🤖 Iniciando análisis de cotización con IA...');
  console.log(`   Texto: ${input.text.length} caracteres`);
  console.log(`   Coordenadas: ${input.coordinates.length} bloques`);
  console.log(`   Método: ${input.extractionMethod || 'hybrid'}`);

  // Detectar sistema de coordenadas del PDF
  const coordinateSystemInfo = detectCoordinateSystem(input.coordinates);
  console.log(`📐 Sistema de coordenadas detectado: ${coordinateSystemInfo.system}`);
  console.log(`   ${getCoordinateSystemDescription(coordinateSystemInfo)}`);

  const openai = getOpenAIClient();

  // Build specialized prompt for quotes
  const prompt = buildQuoteAnalysisPrompt(input);

  try {
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_POLICY_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Eres un asistente experto en análisis de COTIZACIONES de seguros (propuestas comerciales).
          
Tu trabajo es extraer datos estructurados de documentos de cotización con precisión.
Una cotización NO es lo mismo que una póliza:
- Las cotizaciones son OFERTAS con validez limitada
- Pueden incluir OPCIONES de cobertura
- Muestran primas ESTIMADAS o COTIZADAS
- Incluyen REQUISITOS para formalizar

Extrae todos los datos posibles y asigna niveles de confianza apropiados.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    // Parse response
    const resultText = response.choices[0]?.message?.content || '{}';
    console.log(`✅ Respuesta de IA recibida: ${resultText.length} caracteres`);

    // Parse JSON with robust handling
    let result: any;
    try {
      result = parseAIResponse(resultText);

      if (!result || typeof result !== 'object') {
        throw new Error('La respuesta de la IA no es un objeto JSON válido');
      }

      // Validate structure
      const hasData = result.data !== undefined;
      const hasPageReferences = Array.isArray(result.pageReferences);
      const hasConfidence = typeof result.confidence === 'number';

      if (!hasData && !hasPageReferences && !hasConfidence) {
        console.warn('⚠️ [Validación] La respuesta de la IA no tiene estructura esperada');
        result = {
          data: result.data || {},
          confidence: result.confidence || 0.5,
          pageReferences: result.pageReferences || []
        };
      }

      // Validate page references
      if (Array.isArray(result.pageReferences)) {
        const originalCount = result.pageReferences.length;
        let invalidCount = 0;

        result.pageReferences = result.pageReferences.filter((ref: any, index: number) => {
          if (!validateQuotePageReference(ref)) {
            invalidCount++;
            return false;
          }
          return true;
        });

        if (invalidCount > 0) {
          console.warn(
            `⚠️ [Validación] Se descartaron ${invalidCount} referencias inválidas ` +
            `de ${originalCount} totales.`
          );
        }
      }

    } catch (parseError: any) {
      console.error('❌ [Parse JSON] Error parseando respuesta de IA:', parseError.message);
      throw parseError;
    }

    // Normalize result
    const normalized = normalizeQuoteAnalysisResult(result, input.coordinates);
    normalized.coordinateSystem = coordinateSystemInfo;

    console.log(`✅ Análisis de cotización completado - Confianza: ${normalized.confidence.toFixed(2)}`);
    console.log(`   Datos extraídos: ${Object.keys(normalized.data).length} campos principales`);
    console.log(`   Referencias: ${normalized.pageReferences.length} campos con ubicación`);

    return normalized;

  } catch (error: any) {
    console.error('❌ Error en análisis de cotización con IA:', error);

    if (error.code === 'insufficient_quota') {
      throw new Error('Cuota de OpenAI agotada. Verifica tu plan de facturación.');
    } else if (error.code === 'invalid_api_key') {
      throw new Error('Clave de API de OpenAI inválida. Verifica la configuración.');
    } else if (error.code === 'rate_limit_exceeded') {
      throw new Error('Límite de velocidad excedido. Intenta de nuevo en unos momentos.');
    }

    throw new Error(`Error en análisis de cotización: ${error.message}`);
  }
}
