import { getOpenAIClient, parseAIResponse } from './policyAnalysis';
import { PolicyAnalysis, ComparisonRow, ReformulationOptions } from '@/lib/types';

// ✅ SEGURIDAD: Límite máximo de comparaciones por caso (prevención crecimiento ilimitado)
export const MAX_COMPARISONS_PER_CASE = 20;

// ✅ SEGURIDAD: Palabras clave peligrosas para sanitización de prompts del usuario
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /forget\s+(all\s+)?(your\s+)?instructions/i,
  /you\s+are\s+now/i,
  /act\s+as\s+(a\s+)?different/i,
  /system\s*:\s*/i,
  /\bDAN\b/,
  /do\s+anything\s+now/i,
  /bypass\s+(your\s+)?restrictions/i,
  /override\s+(your\s+)?rules/i,
];

/**
 * Sanitiza el prompt del usuario para prevenir inyección de prompts maliciosos.
 * - Limita a 500 caracteres
 * - Elimina patrones de prompt injection conocidos
 * - Trim y normaliza whitespace
 */
export function sanitizeUserPrompt(raw: string): string {
  let sanitized = raw.trim().slice(0, 500);
  
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[instrucción filtrada]');
  }
  
  // Normalizar whitespace excesivo
  sanitized = sanitized.replace(/\s{3,}/g, '  ');
  
  return sanitized;
}

/**
 * Aligns multiple policy analyses into a unified comparison matrix using AI.
 * 
 * @param analyses - List of policy analyses to compare
 * @param options - Optional reformulation parameters (focusAspects, userPrompt, referenceRows)
 * @returns List of normalized comparison rows
 */
export async function alignPoliciesWithAI(
  analyses: PolicyAnalysis[],
  options?: ReformulationOptions & { referenceRows?: ComparisonRow[] }
): Promise<ComparisonRow[]> {
  const isReformulation = !!(options?.focusAspects?.length || options?.userPrompt || options?.referenceRows?.length);
  console.log(`🤖 ${isReformulation ? 'Reformulating' : 'Aligning'} ${analyses.length} policies with AI...`);

  const openai = getOpenAIClient();
  const prompt = buildAlignmentPrompt(analyses, options);

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_POLICY_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Eres un actuario experto y analista de seguros. Tu tarea es comparar múltiples pólizas de seguros, normalizar sus coberturas a una ontología común y resaltar las diferencias clave.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: isReformulation ? 0.3 : 0.2, // Slightly higher for reformulations to explore
      response_format: { type: 'json_object' }
    });

    const resultText = response.choices[0]?.message?.content || '{}';
    const parsedResult = parseAIResponse(resultText);

    if (!parsedResult.rows || !Array.isArray(parsedResult.rows)) {
      throw new Error('Invalid AI response structure: missing "rows" array');
    }

    // Post-process and validate rows
    const rows: ComparisonRow[] = parsedResult.rows.map((row: any) => ({
      id: row.id || `row-${Math.random().toString(36).substr(2, 9)}`,
      coverageName: row.coverageName,
      category: row.category,
      isMandatory: row.isMandatory || false,
      status: row.status || 'all_present',
      values: row.values // Map of analysisId -> ComparisonCell
    }));

    console.log(`✅ Alignment complete: ${rows.length} rows generated`);
    return rows;

  } catch (error: any) {
    console.error('❌ Error aligning policies:', error);
    throw new Error(`Failed to align policies: ${error.message}`);
  }
}

function buildAlignmentPrompt(
  analyses: PolicyAnalysis[],
  options?: ReformulationOptions & { referenceRows?: ComparisonRow[] }
): string {
  // Prepare simplified input for the LLM to save tokens
  const inputs = analyses.map(a => ({
    id: a.id,
    insurer: (a.extractedData as any)?.insurer?.name || 'Unknown Insurer',
    coverages: (a.extractedData as any)?.coverages || [],
    deductibles: (a.extractedData as any)?.deductibles || [],
    financials: (a.extractedData as any)?.financials || {}
  }));

  const analysisIdsStr = analyses.map(a => a.id).join('", "');

  // ✅ REFORMULATION: Build focus section if aspects are specified
  const focusSection = options?.focusAspects?.length
    ? `\nENFOQUE PRIORITARIO:
Prioriza y profundiza el análisis en las siguientes categorías: ${options.focusAspects.join(', ')}.
Para estas categorías, extrae el MÁXIMO detalle posible: montos exactos, condiciones, sublímites, períodos de carencia, y cualquier matiz relevante.\n`
    : '';

  // ✅ REFORMULATION: Build user instructions section (already sanitized at API level)
  const userInstructionsSection = options?.userPrompt
    ? `\n"""INSTRUCCIONES ADICIONALES DEL ANALISTA (contexto limitado al dominio de seguros):"""
${options.userPrompt}
"""FIN DE INSTRUCCIONES ADICIONALES"""\n`
    : '';

  // ✅ REFORMULATION: Build reference section from previous comparisons
  const referenceSection = options?.referenceRows?.length
    ? `\nCOMPARACIONES PREVIAS (úsalas como base para MEJORAR y PROFUNDIZAR, no repetir):
Se generaron ${options.referenceRows.length} filas en comparaciones anteriores. 
Categorías cubiertas: ${[...new Set(options.referenceRows.map(r => r.category))].join(', ')}.
Coberturas ya identificadas: ${options.referenceRows.map(r => r.coverageName).join(', ')}.
Tu tarea es MEJORAR esta comparación: agregar coberturas faltantes, corregir imprecisiones, y profundizar en las categorías priorizadas.\n`
    : '';

  return `
Analiza y alinea las siguientes ${analyses.length} pólizas de seguro para crear una tabla comparativa unificada.

INPUT DATA:
${JSON.stringify(inputs, null, 2)}
${focusSection}${userInstructionsSection}${referenceSection}
INSTRUCCIONES:
1. **Normalización**: Identifica coberturas equivalentes que tengan nombres diferentes y agrúpalas bajo un nombre canónico estandarizado.
2. **Estructura**: Genera una lista de filas ("rows"). Cada fila representa una cobertura o característica comparada.
3. **Valores**: Para cada fila, extrae el valor correspondiente de cada póliza.
4. **Status**: Determina si una póliza es "better", "worse", o "equal" en comparación con las demás.

FORMATO DE RESPUESTA (JSON):
{
  "rows": [
    {
      "id": "coverage-rc",
      "coverageName": "Responsabilidad Civil",
      "category": "coverage",
      "isMandatory": true,
      "status": "all_present",
      "values": {
        "${analyses[0]?.id || 'analysis-1'}": {
          "value": {
            "name": "Responsabilidad Civil",
            "limit Amount": 2000000,
            "limitUnit": "MXN",
            "description": "Cobertura de daños a terceros"
          },
          "reference": null,
          "status": "equal",
          "userNote": null
        }
      }
    }
  ]
}

REGLAS CRÍTICAS:
- Si una póliza no tiene la cobertura, "value" debe ser null y "status": "missing".
- Normaliza los montos a una moneda común si es posible.
- Agrupa inteligentemente: No crees filas duplicadas para la misma cobertura.
- Prioriza las coberturas más importantes (RC, Gastos Médicos, Muerte Accidental) al principio.
- IMPORTANTE: En "values", usa los IDs exactos de los análisis: ${analysisIdsStr}
`.trim();
}
