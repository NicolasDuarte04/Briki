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
import { detectCoordinateSystem, type CoordinateSystemInfo, getCoordinateSystemDescription } from '@/lib/pdf/coordinateUtils';
import { resolveStrategy } from '@/lib/prompts/strategies';

/**
 * Get OpenAI client instance
 */
/**
 * Get OpenAI client instance
 */
export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    console.error('CRITICAL: OPENAI_API_KEY not configured');
    throw new Error('OpenAI service is not configured. Please check environment variables.');
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Parsea JSON de forma robusta desde respuesta de IA.
 * 
 * La IA a veces retorna JSON envuelto en markdown, con comentarios, o con texto adicional.
 * Esta función limpia y extrae el JSON válido.
 * 
 * Estrategias de limpieza (en orden):
 * 1. Intentar parse directo (caso ideal)
 * 2. Extraer JSON de bloques markdown (```json ... ```)
 * 3. Buscar primer objeto JSON válido en el texto
 * 4. Limpiar comentarios y texto adicional
 * 
 * @param rawText - Texto crudo de la respuesta de la IA
 * @returns Objeto parseado o null si no se puede parsear
 * @throws Error con detalles si el JSON es completamente inválido
 * 
 * @example
 * ```typescript
 * parseAIResponse('{"data": {}}') // → { data: {} }
 * parseAIResponse('```json\n{"data": {}}\n```') // → { data: {} }
 * parseAIResponse('Aquí está el análisis: {"data": {}}') // → { data: {} }
 * ```
 */
export function parseAIResponse(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('La respuesta de la IA está vacía o no es válida');
  }

  let cleanedText = rawText.trim();

  // Estrategia 1: Intentar parse directo (caso más común con response_format: json_object)
  try {
    return JSON.parse(cleanedText);
  } catch (e) {
    // No es JSON puro, continuar con limpieza
  }

  // Estrategia 2: Extraer JSON de bloques markdown (```json ... ``` o ``` ... ```)
  const markdownJsonMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (markdownJsonMatch && markdownJsonMatch[1]) {
    try {
      return JSON.parse(markdownJsonMatch[1].trim());
    } catch (e) {
      // El bloque markdown no contiene JSON válido, continuar
    }
  }

  // Estrategia 3: Buscar primer objeto JSON válido en el texto
  // Buscar desde el primer '{' hasta el último '}' balanceado
  const firstBrace = cleanedText.indexOf('{');
  if (firstBrace !== -1) {
    let braceCount = 0;
    let jsonEnd = -1;

    for (let i = firstBrace; i < cleanedText.length; i++) {
      if (cleanedText[i] === '{') braceCount++;
      if (cleanedText[i] === '}') braceCount--;

      if (braceCount === 0) {
        jsonEnd = i + 1;
        break;
      }
    }

    if (jsonEnd > firstBrace) {
      const jsonCandidate = cleanedText.substring(firstBrace, jsonEnd);
      try {
        return JSON.parse(jsonCandidate);
      } catch (e) {
        // El objeto no es JSON válido, continuar
      }
    }
  }

  // Estrategia 4: Limpiar comentarios y texto adicional, luego intentar parsear
  // Eliminar comentarios de línea (// ...)
  cleanedText = cleanedText.replace(/\/\/.*$/gm, '');
  // Eliminar comentarios de bloque (/* ... */)
  cleanedText = cleanedText.replace(/\/\*[\s\S]*?\*\//g, '');
  // Eliminar texto antes del primer '{'
  const firstBraceAfterClean = cleanedText.indexOf('{');
  if (firstBraceAfterClean > 0) {
    cleanedText = cleanedText.substring(firstBraceAfterClean);
  }
  // Eliminar texto después del último '}' balanceado
  let braceCount = 0;
  let lastValidBrace = -1;
  for (let i = 0; i < cleanedText.length; i++) {
    if (cleanedText[i] === '{') braceCount++;
    if (cleanedText[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        lastValidBrace = i + 1;
      }
    }
  }
  if (lastValidBrace > 0) {
    cleanedText = cleanedText.substring(0, lastValidBrace);
  }

  try {
    return JSON.parse(cleanedText.trim());
  } catch (e) {
    // Todas las estrategias fallaron
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    const preview = rawText.substring(0, 500).replace(/\n/g, '\\n');

    console.error('❌ [Parse JSON] Todas las estrategias de parsing fallaron');
    console.error(`   Preview de respuesta: ${preview}...`);
    console.error(`   Error: ${errorMessage}`);

    throw new Error(
      `No se pudo parsear la respuesta de la IA como JSON válido. ` +
      `La respuesta puede estar truncada o malformada. ` +
      `Error: ${errorMessage}`
    );
  }
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
  /** Insurance category selected by the user at upload time */
  insuranceCategory?: string;
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
    name?: string;
    description?: string;
    limit_amount?: number;
    limit_unit?: string; // Deprecated: use limit_currency or limit_description
    limit_currency?: string | null; // ISO 4217 code
    limit_description?: string | null; // Non-monetary unit description
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
  /** Coordinate system information (for PDF viewer) */
  coordinateSystem?: CoordinateSystemInfo;
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
  if (input.insuranceCategory) {
    console.log(`   Categoría de seguro: ${input.insuranceCategory}`);
  }

  // ✅ NUEVO: Detectar sistema de coordenadas del PDF
  const coordinateSystemInfo = detectCoordinateSystem(input.coordinates);
  console.log(`📐 Sistema de coordenadas detectado: ${coordinateSystemInfo.system}`);
  console.log(`   ${getCoordinateSystemDescription(coordinateSystemInfo)}`);
  if (coordinateSystemInfo.warnings.length > 0) {
    console.warn('⚠️ Advertencias del sistema de coordenadas:');
    coordinateSystemInfo.warnings.forEach(w => console.warn(`   - ${w}`));
  }

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

    // ✅ CORRECCIÓN CRÍTICA: Parsing robusto de JSON con múltiples estrategias de limpieza
    // La IA puede retornar JSON envuelto en markdown, con comentarios, o con texto adicional
    let result: any;
    try {
      result = parseAIResponse(resultText);

      // ✅ VALIDACIÓN: Verificar estructura básica del JSON antes de procesar
      if (!result || typeof result !== 'object') {
        throw new Error('La respuesta de la IA no es un objeto JSON válido');
      }

      // Validar que tenga al menos una de las propiedades esperadas
      const hasData = result.data !== undefined;
      const hasPageReferences = Array.isArray(result.pageReferences);
      const hasConfidence = typeof result.confidence === 'number';

      if (!hasData && !hasPageReferences && !hasConfidence) {
        console.warn('⚠️ [Validación] La respuesta de la IA no tiene estructura esperada');
        console.warn(`   Propiedades encontradas: ${Object.keys(result).join(', ')}`);
        // Continuar con estructura mínima en lugar de fallar completamente
        result = {
          data: result.data || {},
          confidence: result.confidence || 0.5,
          pageReferences: result.pageReferences || []
        };
      }

      // ✅ CORRECCIÓN CRÍTICA: Validar y limpiar pageReferences antes de normalizar
      if (Array.isArray(result.pageReferences)) {
        const originalCount = result.pageReferences.length;
        let invalidCount = 0;

        result.pageReferences = result.pageReferences.filter((ref: any, index: number) => {
          if (!validatePageReference(ref)) {
            invalidCount++;
            if (process.env.NODE_ENV === 'development') {
              console.warn(`⚠️ [Validación Pre-análisis] pageReference[${index}] inválida:`, ref);
            }
            return false;
          }
          return true;
        });

        if (invalidCount > 0) {
          console.warn(
            `⚠️ [Validación Pre-análisis] Se descartaron ${invalidCount} referencias inválidas ` +
            `de ${originalCount} totales. Referencias válidas: ${result.pageReferences.length}`
          );
        }
      }

    } catch (parseError: any) {
      // Log detallado para diagnóstico
      console.error('❌ [Parse JSON] Error parseando respuesta de IA:');
      console.error(`   Mensaje: ${parseError.message}`);
      console.error(`   Preview respuesta: ${resultText.substring(0, 300)}...`);

      // Si es un error de parsing, lanzar error específico
      if (parseError.message?.includes('parsear') || parseError.message?.includes('objeto JSON')) {
        throw parseError;
      }

      // Si es SyntaxError de JSON.parse, envolver con contexto
      throw new Error(
        `La IA retornó una respuesta que no se pudo parsear como JSON válido. ` +
        `Esto puede ocurrir si la respuesta está truncada o malformada. ` +
        `Detalles: ${parseError.message}`
      );
    }

    // Validate and normalize (with auto-mapping of coordinates)
    // ✅ La función normalizeAnalysisResult ya maneja casos donde el JSON está parcial o incompleto
    const normalized = normalizeAnalysisResult(result, input.coordinates);

    // ✅ NUEVO: Agregar información del sistema de coordenadas al resultado
    normalized.coordinateSystem = coordinateSystemInfo;

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
    } else if (error instanceof SyntaxError || error.message?.includes('parsear')) {
      // Error de parsing JSON - ya tiene contexto detallado del parseAIResponse
      throw error;
    }

    // Error genérico con mensaje original
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

  // ── Strategy injection (domain-specific knowledge) ──────────────────
  const strategy = resolveStrategy(input.insuranceCategory);
  const domainContext = strategy.getDomainContext();
  const checklist = strategy.getAnalysisChecklist();
  const infraseguro = strategy.getInfraseguroRules();
  const regulatory = strategy.getRegulatoryNotes();

  const strategyBlock = input.insuranceCategory
    ? `
═══════════════════════════════════════════════════════════
CONTEXTO ESPECIALIZADO — ${strategy.categoryLabel.toUpperCase()}
═══════════════════════════════════════════════════════════

${domainContext}

**Checklist de análisis obligatorio:**
${checklist.map((item, i) => `${i + 1}. ${item}`).join('\n')}

**Reglas de infraseguro / gaps de cobertura:**
${infraseguro}

**Marco regulatorio aplicable:**
${regulatory}

`
    : '';

  return `
Analiza el siguiente texto extraído de un PDF de póliza de seguros y extrae los datos estructurados.
${strategyBlock}
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
        "limit_currency": "ISO 4217 code (MXN, USD, EUR) ONLY if monetary, else null",
        "limit_description": "string for non-monetary units (e.g. 'events', 'visits')",
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

**REFERENCIAS DE PÁGINA (CRÍTICO)**:
- Incluye una referencia en "pageReferences" para CADA campo que extraigas
- Campos obligatorios para referencias: policy_number, insured_name, premium_total, effective_from, effective_to
- También incluye referencias para: insurer.name, insurer.contact.phone, insurer.contact.email
- Y para campos financieros: premium_net, taxes, fees, premium_total
- Y para cada cobertura: su nombre y limit_amount (si aplica)

**IMPORTANTE - COBERTURAS CON LÍMITES**:
- Si el límite es monetario (ej: "$2,000,000 MXN"), extrae:
  * limit_amount: número
  * limit_currency: código ISO (MXN, USD, EUR, etc.)
  
- Si el límite es NO monetario (ej: "50 eventos", "10 consultas"), extrae:
  * limit_amount: número o null
  * limit_currency: null
  * limit_description: texto descriptivo completo
  
- NUNCA uses texto descriptivo como limit_currency
- Y para cada exclusión: su nombre principal
- **Si encuentras las coordenadas exactas en la muestra, úsalas**
- **Si NO encuentras coordenadas exactas, OMITE completamente el campo "box"**
- El sistema mapeará automáticamente las coordenadas usando el valor del campo y scoring avanzado
- Ejemplo CON coordenadas: { "field": "policy_number", "value": "POL-001", "page": 1, "box": {...}, "confidence": 0.95 }
- Ejemplo SIN coordenadas: { "field": "policy_number", "value": "POL-001", "page": 1, "confidence": 0.95 }
- NUNCA dejes pageReferences vacío si extrajiste datos
- NO uses coordenadas genéricas o inventadas, es mejor omitir "box" y dejar que el sistema las encuentre

**TIPOS DE DATOS EN REFERENCIAS (MUY IMPORTANTE)**:
- El campo "value" en pageReferences SIEMPRE debe ser un string, incluso si el valor original es numérico
- Convierte TODOS los valores a string antes de incluirlos en pageReferences
- Ejemplos correctos:
  * "value": "1500000" (número convertido a string)
  * "value": "POL-2025-001234" (string)
  * "value": "2025-07-31T00:00:00Z" (fecha como string)
  * "value": "true" (booleano convertido a string)
- Ejemplos INCORRECTOS (NO hacer):
  * "value": 1500000 (número sin convertir)
  * "value": true (booleano sin convertir)
  * "value": null (usar string vacío "" en su lugar)
`.trim();
}

/**
 * Interfaz para un match candidato con su score
 */
interface CoordinateMatch {
  page: number;
  box: { x: number; y: number; width: number; height: number };
  score: number;
  matchType: 'exact' | 'partial' | 'fuzzy';
  matchedText: string;
}

/**
 * Labels conocidos para campos comunes de pólizas (ayudan a mejorar el score)
 */
const KNOWN_FIELD_LABELS: Record<string, string[]> = {
  'policy_number': ['póliza', 'número', 'no.', 'policy', 'núm'],
  'insurer': ['aseguradora', 'compañía', 'company', 'insurer'],
  'effective_from': ['vigencia', 'inicio', 'desde', 'from', 'effective'],
  'effective_to': ['hasta', 'to', 'termina', 'vencimiento'],
  'premium_total': ['prima', 'total', 'premium', 'costo'],
  'deductible': ['deducible', 'deductible'],
  'coverage': ['cobertura', 'coverage', 'límite', 'limit']
};

/**
 * Find coordinates for a given text value in the coordinates array
 * ✅ FASE 2 MEJORADO: Mapeo robusto con sistema de scoring
 * 
 * Mejoras implementadas:
 * 1. Busca TODOS los matches posibles (no solo el primero)
 * 2. Calcula score para cada match basado en múltiples factores
 * 3. Valida dimensiones (width > 0, height >= 0)
 * 4. Filtra por página esperada (si se proporciona)
 * 5. Usa contexto de labels conocidos para mejorar precisión
 * 
 * Sistema de Scoring (0-100):
 * - Exact match: +50 pts
 * - Partial match: +30 pts
 * - Fuzzy match: +10 pts
 * - Valid dimensions: +20 pts (width > 0)
 * - Label context: +10 pts (si hay label conocido cerca)
 * - Page match: +10 pts (si coincide con página esperada)
 * - Penalización: -30 pts si height = 0 (limitación de pdf2json)
 * 
 * @param value - Valor a buscar (ej: "12345", "BBVA Seguros")
 * @param coordinates - Array de coordenadas extraídas del PDF
 * @param options - Opciones adicionales para el mapeo
 * @returns Mejor match encontrado o null si ninguno es válido
 */
function findCoordinatesForValue(
  value: string,
  coordinates: TextCoordinate[],
  options?: {
    fieldName?: string;
    expectedPage?: number;
    minScore?: number;
  }
): {
  page: number;
  box: { x: number; y: number; width: number; height: number };
} | null {
  if (!value || typeof value !== 'string' || !coordinates || coordinates.length === 0) {
    return null;
  }

  const minScore = options?.minScore || 40; // Score mínimo aceptable (de 100)
  const expectedPage = options?.expectedPage;
  const fieldName = options?.fieldName;

  // Normalize value for search (trim, lowercase, remove extra spaces)
  const normalizedValue = value.trim().toLowerCase().replace(/\s+/g, ' ');

  if (normalizedValue.length === 0) return null;

  // Find all potential matches with scores
  const matches: CoordinateMatch[] = [];

  coordinates.forEach((coord, index) => {
    const normalizedText = coord.text.trim().toLowerCase().replace(/\s+/g, ' ');

    if (normalizedText.length === 0) return;

    let score = 0;
    let matchType: 'exact' | 'partial' | 'fuzzy' | null = null;

    // 1. Check for exact match (case-insensitive)
    if (normalizedText === normalizedValue) {
      score += 50;
      matchType = 'exact';
    }
    // 2. Check for inclusion match
    else if (normalizedText.includes(normalizedValue) || normalizedValue.includes(normalizedText)) {
      score += 30;
      matchType = 'partial';
    }
    // 3. Check for fuzzy match (first 10 chars for short values, or 50% for long values)
    else {
      const minLength = Math.min(normalizedText.length, normalizedValue.length);
      const checkLength = Math.max(10, Math.floor(minLength * 0.5));
      const valueStart = normalizedValue.substring(0, checkLength);
      const textStart = normalizedText.substring(0, checkLength);

      if (normalizedText.includes(valueStart) || valueStart.includes(textStart)) {
        score += 10;
        matchType = 'fuzzy';
      }
    }

    // Si no hay match de texto, skip
    if (!matchType) return;

    // 4. Validate dimensions (+20 pts if valid)
    const hasValidWidth = coord.width > 0;
    const hasValidHeight = coord.height > 0;

    if (hasValidWidth) {
      score += 20;
    }

    // ⚠️ Penalización por height = 0 (limitación conocida de pdf2json)
    // No descartamos completamente, pero bajamos score
    if (!hasValidHeight) {
      score -= 10; // Penalización menor (es común en pdf2json)
    }

    // 5. Check for label context (+10 pts if found)
    // Buscar labels conocidos en coordenadas cercanas (misma página, Y similar)
    if (fieldName && KNOWN_FIELD_LABELS[fieldName]) {
      const labels = KNOWN_FIELD_LABELS[fieldName];
      const nearbyCoords = coordinates.filter(c =>
        c.page === coord.page &&
        Math.abs(c.y - coord.y) < 5 && // Mismo rango vertical (Y similar)
        c.x < coord.x // Label generalmente a la izquierda del valor
      );

      const hasLabel = nearbyCoords.some(nearby => {
        const nearbyText = nearby.text.trim().toLowerCase();
        return labels.some(label => nearbyText.includes(label));
      });

      if (hasLabel) {
        score += 10;
      }
    }

    // 6. Check page match (+10 pts if matches expected page)
    if (expectedPage && coord.page === expectedPage) {
      score += 10;
    }

    // Add to matches if score is above minimum
    if (score >= minScore) {
      matches.push({
        page: coord.page,
        box: {
          x: Math.round(coord.x * 100) / 100,
          y: Math.round(coord.y * 100) / 100,
          width: Math.round(coord.width * 100) / 100,
          height: Math.round(coord.height * 100) / 100
        },
        score,
        matchType,
        matchedText: coord.text.substring(0, 50) // Para debugging
      });
    }
  });

  // If no matches found, return null
  if (matches.length === 0) {
    return null;
  }

  // Sort by score (descending) and return best match
  matches.sort((a, b) => b.score - a.score);

  // ✅ CORRECCIÓN: Verificación explícita para TypeScript (aunque ya verificamos length > 0)
  const bestMatch = matches[0];
  if (!bestMatch) {
    return null; // TypeScript guard - nunca debería llegar aquí, pero TypeScript no puede inferirlo
  }

  // Log para debugging (solo en desarrollo)
  if (process.env.NODE_ENV === 'development' && matches.length > 1) {
    console.log(`🎯 [Mapeo] Encontrados ${matches.length} matches para "${value.substring(0, 30)}..." - Mejor score: ${bestMatch.score}`);
  }

  return {
    page: bestMatch.page,
    box: bestMatch.box
  };
}

/**
 * Valida que una referencia tenga la estructura mínima requerida.
 * No valida tipos específicos, solo que existan las propiedades necesarias.
 * 
 * @param ref - Referencia a validar
 * @returns true si es válida, false si no
 * 
 * @example
 * ```typescript
 * validatePageReference({ field: "policy_number", value: "POL-123", page: 1 }) // → true
 * validatePageReference({ field: "", value: "test", page: 1 }) // → false
 * validatePageReference({ field: "test", value: null, page: 0 }) // → false
 * ```
 */
function validatePageReference(ref: any): boolean {
  return (
    ref !== null &&
    ref !== undefined &&
    typeof ref === 'object' &&
    typeof ref.field === 'string' &&
    ref.field.length > 0 &&
    typeof ref.page === 'number' &&
    ref.page > 0 &&
    ref.value !== undefined
  );
}

/**
 * Normaliza un valor de referencia a string de forma segura.
 * Maneja null, undefined, números, booleanos, objetos y arrays.
 * 
 * @param value - Valor a normalizar
 * @returns String representando el valor
 * 
 * @example
 * ```typescript
 * normalizeReferenceValue("POL-123") // → "POL-123"
 * normalizeReferenceValue(1500000) // → "1500000"
 * normalizeReferenceValue(null) // → ""
 * normalizeReferenceValue(true) // → "true"
 * normalizeReferenceValue([1, 2, 3]) // → "[1,2,3]"
 * ```
 */
function normalizeReferenceValue(value: any): string {
  // null/undefined → string vacío
  if (value === null || value === undefined) {
    return '';
  }

  // string → sin cambios
  if (typeof value === 'string') {
    return value;
  }

  // número → convertir a string
  if (typeof value === 'number') {
    return String(value);
  }

  // booleano → 'true' o 'false'
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  // objeto/array → JSON string (con fallback)
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (e) {
      // Objetos circulares o no serializables
      return '[Object]';
    }
  }

  // Cualquier otro tipo → convertir a string
  return String(value);
}

/**
 * Formatea un valor para logging seguro.
 * Trunca si excede maxLength y agrega "..." al final.
 * 
 * @param value - Valor a formatear (puede ser cualquier tipo)
 * @param maxLength - Longitud máxima (default: 30)
 * @returns String formateado para logging
 * 
 * @example
 * ```typescript
 * safeLogValue("Short") // → "Short"
 * safeLogValue("Very long text that needs truncation", 10) // → "Very long ..."
 * safeLogValue(1500000) // → "1500000"
 * safeLogValue(null) // → "(vacío)"
 * ```
 */
function safeLogValue(value: any, maxLength: number = 30): string {
  const normalized = normalizeReferenceValue(value);

  if (normalized.length === 0) {
    return '(vacío)';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return normalized.substring(0, maxLength) + '...';
}

/**
 * Normalize and validate analysis result
 * ✅ REFINAMIENTO: Con mapeo automático de coordenadas
 * ✅ CORRECCIÓN: Logs de debugging mejorados
 * ✅ CORRECCIÓN CRÍTICA: Validación y normalización robusta de valores
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

  // ✅ CORRECCIÓN CRÍTICA: Validar y filtrar referencias con validación explícita
  normalized.pageReferences = normalized.pageReferences
    .filter(ref => {
      const isValid = validatePageReference(ref);
      if (!isValid && process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ [Validación] Referencia inválida descartada:`, ref);
      }
      return isValid;
    })
    .map((ref, index) => {
      // ✅ CORRECCIÓN CRÍTICA: Normalizar value a string INMEDIATAMENTE
      // Esto previene errores al intentar usar .substring() u otras operaciones de string
      const normalizedValue = normalizeReferenceValue(ref.value);
      let box = ref.box;

      // ✅ Logging seguro con valor normalizado
      console.log(
        `🔍 [Mapeo ${index + 1}/${normalized.pageReferences.length}] ` +
        `Campo: "${ref.field}", ` +
        `Valor: "${safeLogValue(normalizedValue, 30)}", ` +
        `Box actual:`,
        box
      );

      // ✅ FASE 2 MEJORADO: Si no hay coordenadas o están en 0, intentar mapeo automático con scoring
      if (!box || (box.x === 0 && box.y === 0 && box.width === 0 && box.height === 0)) {
        console.log(`   🔎 Intentando mapeo automático para "${ref.field}"...`);

        // ✅ FASE 2: Usar nueva versión con opciones (fieldName para contexto de labels)
        // ✅ CORRECCIÓN: Construir opciones explícitamente para evitar problemas con exactOptionalPropertyTypes
        const mappingOptions: {
          fieldName?: string;
          expectedPage?: number;
          minScore?: number;
        } = {
          fieldName: ref.field,
          minScore: 40 // Score mínimo aceptable
        };

        // Solo agregar expectedPage si es válido (evita problemas con exactOptionalPropertyTypes)
        if (ref.page > 0) {
          mappingOptions.expectedPage = ref.page;
        }

        // ✅ Usar valor normalizado para búsqueda de coordenadas
        const found = findCoordinatesForValue(normalizedValue, coordinates, mappingOptions);

        if (found) {
          console.log(`   ✅ Coordenadas mapeadas para "${ref.field}": página ${found.page}, box:`, found.box);
          box = found.box;

          // ⚠️ FASE 2: Si la página mapeada difiere de la ref.page original, actualizar
          if (ref.page !== found.page) {
            console.log(`   ℹ️  Página ajustada de ${ref.page} a ${found.page}`);
            ref.page = found.page;
          }
        } else {
          console.log(`   ⚠️  No se encontraron coordenadas para "${ref.field}": ${safeLogValue(normalizedValue)}`);
          box = { x: 0, y: 0, width: 0, height: 0 };
        }
      } else {
        console.log(`   ℹ️  "${ref.field}" ya tiene coordenadas válidas, no se mapea`);
      }

      // ✅ Retornar referencia normalizada usando el valor ya convertido
      return {
        field: ref.field,
        value: normalizedValue,  // Ya normalizado arriba, sin duplicación
        page: Math.max(1, Math.floor(ref.page)),
        box,
        confidence: Math.max(0, Math.min(1, ref.confidence || 0.5))
      };
    });

  console.log(`✅ [Mapeo] Normalización completada: ${normalized.pageReferences.length} referencias procesadas`);

  return normalized;
}

