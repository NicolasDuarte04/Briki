/**
 * Policy Analysis with AI
 * 
 * This module provides functions to analyze policy PDFs using OpenAI
 * and extract structured data with confidence scores and page references.
 * 
 * FASE 3: API de Análisis de Pólizas
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 6.3.4
 * 
 * @module openai/policyAnalysis
 */

import OpenAI from 'openai';

/**
 * Get OpenAI client instance
 */
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    console.error('CRITICAL: OPENAI_API_KEY not configured');
    throw new Error('OpenAI service is not configured. Please check environment variables.');
  }
  
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Text coordinate from PDF extraction
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
 * Input for policy analysis
 */
export interface AnalysisInput {
  /** Full extracted text from PDF */
  text: string;
  /** Coordinates of all text blocks */
  coordinates: TextCoordinate[];
  /** Extraction method used */
  extractionMethod: 'manual' | 'ocr' | 'hybrid';
}

/**
 * Page reference for a specific field
 */
export interface PageReference {
  /** Field name (e.g., 'premium_total', 'deductible') */
  field: string;
  /** Extracted value */
  value: string;
  /** Page number (1-indexed) */
  page: number;
  /** Bounding box coordinates */
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Structured policy data extracted by AI
 */
export interface PolicyExtractedData {
  // Información de aseguradora
  insurer?: {
    name?: string;
    code?: string;
    contact?: {
      phone?: string;
      email?: string;
    };
  };
  
  // Información básica de póliza
  policy_number?: string;
  insured_name?: string;
  effective_from?: string; // ISO 8601
  effective_to?: string; // ISO 8601
  jurisdiction?: string;
  currency?: string;
  
  // Información financiera
  financials?: {
    premium_net?: number;
    taxes?: number;
    fees?: number;
    premium_total?: number;
  };
  
  // Coberturas
  coverages?: Array<{
    name: string;
    description?: string;
    limit_amount?: number;
    limit_unit?: string;
    sublimits?: Array<{
      name: string;
      amount: number;
      unit: string;
    }>;
    deductible_amount?: number;
    deductible_unit?: string;
    waiting_period?: number;
    confidence?: number;
  }>;
  
  // Exclusiones
  exclusions?: Array<{
    name: string;
    description?: string;
    confidence?: number;
  }>;
  
  // Deducibles
  deductibles?: Array<{
    type: string;
    amount: number;
    unit: string;
    applies_to?: string;
    confidence?: number;
  }>;
  
  // Endosos
  endorsements?: Array<{
    number?: string;
    name: string;
    description?: string;
    effective_date?: string;
    confidence?: number;
  }>;
  
  // Proceso de reclamación
  claims_process?: {
    phone?: string;
    email?: string;
    steps?: string[];
    time_limit_days?: number;
  };
}

/**
 * Output from policy analysis
 */
export interface AnalysisOutput {
  /** Structured policy data */
  data: PolicyExtractedData;
  /** Overall confidence score (0-1) */
  confidence: number;
  /** Page references for each field */
  pageReferences: PageReference[];
}

/**
 * Analyze a policy PDF with AI
 * 
 * Uses OpenAI GPT-4 to extract structured data from policy text,
 * including confidence scores and page references.
 * 
 * @param input - Analysis input with text and coordinates
 * @returns Structured policy data with confidence and references
 * 
 * @example
 * ```typescript
 * const result = await analyzeWithAI({
 *   text: pdfText,
 *   coordinates: pdfCoordinates,
 *   extractionMethod: 'hybrid'
 * });
 * 
 * console.log(result.data.policy_number);
 * console.log(result.confidence);
 * console.log(result.pageReferences);
 * ```
 */
export async function analyzeWithAI(input: AnalysisInput): Promise<AnalysisOutput> {
  console.log('🤖 Iniciando análisis de póliza con IA...');
  console.log(`   Texto: ${input.text.length} caracteres`);
  console.log(`   Coordenadas: ${input.coordinates.length} bloques`);
  console.log(`   Método: ${input.extractionMethod}`);
  
  const openai = getOpenAIClient();
  
  // Build specialized prompt
  const prompt = buildAnalysisPrompt(input);
  
  try {
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_POLICY_MODEL || 'gpt-4o', // Modelo potente para análisis estructurado
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente experto en análisis de pólizas de seguros. Extraes datos estructurados con precisión y asignas niveles de confianza apropiados.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.3, // Baja temperatura para mayor precisión
      response_format: { type: 'json_object' } // Forzar respuesta JSON
    });
    
    // Parse response
    const resultText = response.choices[0]?.message?.content || '{}';
    console.log(`✅ Respuesta de IA recibida: ${resultText.length} caracteres`);
    
    const result = JSON.parse(resultText) as AnalysisOutput;
    
    // Validate and normalize (with auto-mapping of coordinates)
    const normalized = normalizeAnalysisResult(result, input.coordinates);
    
    console.log(`✅ Análisis completado - Confianza: ${normalized.confidence.toFixed(2)}`);
    console.log(`   Datos extraídos: ${Object.keys(normalized.data).length} campos principales`);
    console.log(`   Referencias: ${normalized.pageReferences.length} campos con ubicación`);
    
    return normalized;
    
  } catch (error: any) {
    console.error('❌ Error en análisis con IA:', error);
    
    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      throw new Error('Cuota de OpenAI agotada. Verifica tu plan de facturación.');
    } else if (error.code === 'invalid_api_key') {
      throw new Error('Clave de API de OpenAI inválida. Verifica la configuración.');
    } else if (error.code === 'rate_limit_exceeded') {
      throw new Error('Límite de velocidad excedido. Intenta de nuevo en unos momentos.');
    } else if (error instanceof SyntaxError) {
      throw new Error('La IA retornó una respuesta inválida. Intenta de nuevo.');
    }
    
    throw new Error(`Error en análisis de póliza: ${error.message}`);
  }
}

/**
 * Build analysis prompt with instructions
 */
function buildAnalysisPrompt(input: AnalysisInput): string {
  // Limitar coordenadas para no exceder límite de tokens
  // Incluir primeras 200 para dar contexto de estructura
  const coordinatesSample = input.coordinates.slice(0, 200).map(c => ({
    text: c.text.substring(0, 100), // Limitar texto por coordenada
    page: c.page,
    x: Math.round(c.x),
    y: Math.round(c.y)
  }));
  
  return `
Analiza el siguiente texto extraído de un PDF de póliza de seguros y extrae los datos estructurados.

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

1. **Identifica y extrae los siguientes datos:**
   - Información de aseguradora (nombre, código, contacto)
   - Número de póliza
   - Nombre del asegurado
   - Vigencia (fecha inicio y fin en formato ISO 8601)
   - Moneda y jurisdicción
   - Financials (prima neta, impuestos, comisiones, prima total)
   - Coberturas (con límites, sublímites, deducibles, periodos de espera)
   - Exclusiones principales
   - Deducibles generales
   - Endosos o anexos
   - Proceso de reclamación (teléfonos, email, pasos, límites de tiempo)

2. **Asigna niveles de confianza (0-1):**
   - 0.90-1.00: Dato claramente identificado con label explícito
   - 0.70-0.89: Dato inferido con contexto claro
   - 0.50-0.69: Dato inferido con contexto ambiguo
   - 0.00-0.49: Dato no confiable o no encontrado

3. **Para cada dato extraído:**
   - Identifica la página donde aparece (usando las coordenadas)
   - Si encuentras las coordenadas exactas, úsalas
   - Si no, estima la página basándote en el contexto

4. **Formato de respuesta (JSON):**

{
  "data": {
    "insurer": {
      "name": "string",
      "code": "string",
      "contact": {
        "phone": "string",
        "email": "string"
      }
    },
    "policy_number": "string",
    "insured_name": "string",
    "effective_from": "ISO 8601 string",
    "effective_to": "ISO 8601 string",
    "jurisdiction": "mx|us|...",
    "currency": "MXN|USD|...",
    "financials": {
      "premium_net": number,
      "taxes": number,
      "fees": number,
      "premium_total": number
    },
    "coverages": [
      {
        "name": "string",
        "description": "string",
        "limit_amount": number,
        "limit_unit": "string",
        "sublimits": [
          {
            "name": "string",
            "amount": number,
            "unit": "string"
          }
        ],
        "deductible_amount": number,
        "deductible_unit": "string",
        "waiting_period": number,
        "confidence": number
      }
    ],
    "exclusions": [
      {
        "name": "string",
        "description": "string",
        "confidence": number
      }
    ],
    "deductibles": [
      {
        "type": "general|coverage-specific",
        "amount": number,
        "unit": "string",
        "applies_to": "string",
        "confidence": number
      }
    ],
    "endorsements": [
      {
        "number": "string",
        "name": "string",
        "description": "string",
        "effective_date": "ISO 8601 string",
        "confidence": number
      }
    ],
    "claims_process": {
      "phone": "string",
      "email": "string",
      "steps": ["string"],
      "time_limit_days": number
    }
  },
  "confidence": number (promedio de confianza general),
  "pageReferences": [
    {
      "field": "policy_number",
      "value": "POL-2025-001234",
      "page": 1,
      "box": {
        "x": 100,
        "y": 200,
        "width": 150,
        "height": 20
      },
      "confidence": 0.95
    }
  ]
}

**IMPORTANTE**: 
- Responde ÚNICAMENTE con JSON válido
- No incluyas comentarios o texto adicional
- Si un campo no se encuentra, omítelo (no uses null)
- Las fechas deben estar en formato ISO 8601
- Los montos son números, no strings
- Incluye al menos las referencias de los campos principales (premium_total, policy_number, etc.)
`.trim();
}

/**
 * Find coordinates for a given text value in the coordinates array
 * ✅ REFINAMIENTO: Mapeo automático de coordenadas
 */
function findCoordinatesForValue(value: string, coordinates: TextCoordinate[]): {
  page: number;
  box: { x: number; y: number; width: number; height: number };
} | null {
  if (!value || typeof value !== 'string') return null;
  
  // Normalize value for search (trim, lowercase, remove extra spaces)
  const normalizedValue = value.trim().toLowerCase().replace(/\s+/g, ' ');
  
  // Search in coordinates
  for (const coord of coordinates) {
    const normalizedText = coord.text.trim().toLowerCase().replace(/\s+/g, ' ');
    
    // Exact match
    if (normalizedText.includes(normalizedValue) || normalizedValue.includes(normalizedText)) {
      return {
        page: coord.page,
        box: {
          x: Math.round(coord.x * 100) / 100,
          y: Math.round(coord.y * 100) / 100,
          width: Math.round(coord.width * 100) / 100,
          height: Math.round(coord.height * 100) / 100
        }
      };
    }
  }
  
  // If not found, try partial match (first 10 chars)
  const valueStart = normalizedValue.substring(0, 10);
  for (const coord of coordinates) {
    const normalizedText = coord.text.trim().toLowerCase().replace(/\s+/g, ' ');
    if (normalizedText.includes(valueStart)) {
      return {
        page: coord.page,
        box: {
          x: Math.round(coord.x * 100) / 100,
          y: Math.round(coord.y * 100) / 100,
          width: Math.round(coord.width * 100) / 100,
          height: Math.round(coord.height * 100) / 100
        }
      };
    }
  }
  
  return null;
}

/**
 * Normalize and validate analysis result
 * ✅ REFINAMIENTO: Con mapeo automático de coordenadas
 * ✅ CORRECCIÓN: Logs de debugging mejorados
 */
function normalizeAnalysisResult(result: any, coordinates: TextCoordinate[]): AnalysisOutput {
  // Ensure basic structure
  const normalized: AnalysisOutput = {
    data: result.data || {},
    confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
    pageReferences: Array.isArray(result.pageReferences) ? result.pageReferences : []
  };
  
  // Clamp confidence to 0-1
  normalized.confidence = Math.max(0, Math.min(1, normalized.confidence));
  
  console.log(`🔍 [Mapeo] Normalizando ${normalized.pageReferences.length} referencias con ${coordinates.length} coordenadas disponibles`);
  
  // Validate page references and auto-map coordinates
  normalized.pageReferences = normalized.pageReferences
    .filter(ref => ref.field && ref.page > 0)
    .map((ref, index) => {
      let box = ref.box;
      
      console.log(`🔍 [Mapeo ${index + 1}/${normalized.pageReferences.length}] Campo: "${ref.field}", Valor: "${ref.value?.substring(0, 30)}...", Box actual:`, box);
      
      // ✅ REFINAMIENTO: Si no hay coordenadas o están en 0, intentar mapeo automático
      if (!box || (box.x === 0 && box.y === 0 && box.width === 0 && box.height === 0)) {
        console.log(`   🔎 Intentando mapeo automático para "${ref.field}"...`);
        const found = findCoordinatesForValue(ref.value, coordinates);
        if (found) {
          console.log(`   ✅ Coordenadas mapeadas para "${ref.field}": página ${found.page}, box:`, found.box);
          box = found.box;
        } else {
          console.log(`   ⚠️  No se encontraron coordenadas para "${ref.field}": ${ref.value}`);
          box = { x: 0, y: 0, width: 0, height: 0 };
        }
      } else {
        console.log(`   ℹ️  "${ref.field}" ya tiene coordenadas válidas, no se mapea`);
      }
      
      return {
        field: ref.field,
        value: String(ref.value || ''),
        page: Math.max(1, Math.floor(ref.page)),
        box,
        confidence: Math.max(0, Math.min(1, ref.confidence || 0.5))
      };
    });
  
  console.log(`✅ [Mapeo] Normalización completada: ${normalized.pageReferences.length} referencias procesadas`);
  
  return normalized;
}

