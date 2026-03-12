import { getOpenAIClient, parseAIResponse } from './policyAnalysis';
import { PolicyAnalysis, ComparisonRow, ReformulationOptions } from '@/lib/types';
import { resolveStrategy } from '@/lib/prompts/strategies';
import { resolveMatrixDefinition } from '@/constants/matrices';
import type { MatrixDefinition } from '@/lib/excel/types';

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

// ─── Types ───────────────────────────────────────────────────────────────────

/** Simplified policy input sent to each AI chunk call */
interface PolicyInput {
  id: string;
  insurer: string;
  policy_number: string | null;
  effective_from: string | null;
  effective_to: string | null;
  currency: string | null;
  coverages: unknown[];
  deductibles: unknown[];
  financials: Record<string, unknown>;
  exclusions: unknown[];
  endorsements: unknown[];
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

/**
 * Aligns multiple policy analyses into a unified comparison matrix using AI.
 *
 * Architecture:
 *  - If a MatrixDefinition exists for the category → **Section-Chunked Parallel Alignment**:
 *    splits the matrix into sections, fires one AI call per section in parallel,
 *    then merges results. This achieves 1:1 coverage of ALL matrix items.
 *  - If no matrix exists → **Free-Form Alignment**: a single AI call generates
 *    comparison rows using heuristic extraction (legacy behavior, improved).
 *
 * @param analyses          - List of policy analyses to compare
 * @param options           - Optional reformulation parameters
 * @param insuranceCategory - Insurance category from the case brief
 * @returns List of normalized comparison rows
 */
export async function alignPoliciesWithAI(
  analyses: PolicyAnalysis[],
  options?: ReformulationOptions & { referenceRows?: ComparisonRow[] },
  insuranceCategory?: string | null,
  briefContext?: string,
): Promise<ComparisonRow[]> {
  const isReformulation = !!(options?.focusAspects?.length || options?.userPrompt || options?.referenceRows?.length);
  console.log(`🤖 ${isReformulation ? 'Reformulating' : 'Aligning'} ${analyses.length} policies with AI (category: ${insuranceCategory || 'generic'})...`);

  // Build full policy inputs ONCE (shared across all chunk calls)
  const policyInputs = buildPolicyInputs(analyses);

  const matrixDef = resolveMatrixDefinition(insuranceCategory);

  if (matrixDef) {
    // ✅ SECTION-CHUNKED PARALLEL ALIGNMENT — 1:1 matrix coverage
    return alignWithMatrixChunks(analyses, policyInputs, matrixDef, insuranceCategory, options, briefContext);
  }

  // Fallback: free-form alignment (generic categories without matrix)
  return alignFreeForm(analyses, policyInputs, insuranceCategory, options, briefContext);
}

// ─── Policy Input Builder ────────────────────────────────────────────────────

/**
 * Extracts ALL relevant fields from extractedData for each analysis.
 * ✅ FIX D1: Previously only extracted coverages, deductibles, financials.
 *    Now includes exclusions, endorsements, vigencia, currency.
 */
function buildPolicyInputs(analyses: PolicyAnalysis[]): PolicyInput[] {
  return analyses.map(a => {
    const ed = a.extractedData as Record<string, unknown> | null;
    return {
      id: a.id,
      insurer: ((ed?.insurer as Record<string, unknown>)?.name as string) || 'Unknown Insurer',
      policy_number: (ed?.policy_number as string) || null,
      effective_from: (ed?.effective_from as string) || null,
      effective_to: (ed?.effective_to as string) || null,
      currency: (ed?.currency as string) || null,
      coverages: (ed?.coverages as unknown[]) || [],
      deductibles: (ed?.deductibles as unknown[]) || [],
      financials: (ed?.financials as Record<string, unknown>) || {},
      exclusions: (ed?.exclusions as unknown[]) || [],
      endorsements: (ed?.endorsements as unknown[]) || [],
    };
  });
}

// ─── Section-Chunked Parallel Alignment ──────────────────────────────────────

/**
 * Splits the MatrixDefinition into sections and fires one AI call per section
 * in parallel. Each call evaluates ALL matrix items in that section against
 * ALL policies. Results are merged into a single ComparisonRow[].
 *
 * This solves the 32K output token limit: each section produces ~2-12K tokens
 * instead of attempting 200K+ tokens in a single call.
 */
async function alignWithMatrixChunks(
  analyses: PolicyAnalysis[],
  policyInputs: PolicyInput[],
  matrixDef: MatrixDefinition,
  insuranceCategory?: string | null,
  options?: ReformulationOptions & { referenceRows?: ComparisonRow[] },
  briefContext?: string,
): Promise<ComparisonRow[]> {
  const sections = Object.entries(matrixDef.secciones);
  const systemPrompt = buildSystemPrompt(insuranceCategory);
  const analysisIds = analyses.map(a => a.id);

  console.log(`📊 Matrix-chunked alignment: ${sections.length} sections, ${matrixDef.matrizCompleta.length} total items across ${analyses.length} policies`);

  // ✅ Fire all section calls in parallel
  const chunkPromises = sections.map(([sectionKey, sectionItems]) =>
    alignSingleSection(
      sectionKey,
      sectionItems as readonly string[],
      policyInputs,
      analysisIds,
      systemPrompt,
      insuranceCategory,
      options,
      briefContext,
    )
  );

  const chunkResults = await Promise.allSettled(chunkPromises);

  // Merge results, log failures
  const allRows: ComparisonRow[] = [];
  for (let i = 0; i < chunkResults.length; i++) {
    const result = chunkResults[i];
    const sectionKey = sections[i]?.[0] ?? `section-${i}`;

    if (result?.status === 'fulfilled' && result.value) {
      allRows.push(...result.value);
      console.log(`  ✅ ${sectionKey}: ${result.value.length} rows`);
    } else {
      const reason = result?.status === 'rejected' ? (result as PromiseRejectedResult).reason : 'unknown';
      console.error(`  ❌ ${sectionKey}: failed —`, reason);
      // Section failure is non-fatal: other sections still populate the matrix
    }
  }

  console.log(`✅ Matrix-chunked alignment complete: ${allRows.length} total rows from ${sections.length} sections`);
  return allRows;
}

/**
 * Aligns a single section of the matrix against all policies.
 * Returns ComparisonRow[] for the items in this section.
 */
async function alignSingleSection(
  sectionKey: string,
  sectionItems: readonly string[],
  policyInputs: PolicyInput[],
  analysisIds: string[],
  systemPrompt: string,
  insuranceCategory?: string | null,
  options?: ReformulationOptions & { referenceRows?: ComparisonRow[] },
  briefContext?: string,
): Promise<ComparisonRow[]> {
  const openai = getOpenAIClient();

  const userPrompt = buildSectionChunkPrompt(
    sectionKey,
    sectionItems,
    policyInputs,
    analysisIds,
    insuranceCategory,
    options,
    briefContext,
  );

  // Estimate max_tokens based on section size: ~300 tokens per item × N policies
  const estimatedTokens = Math.min(16384, Math.max(4096, sectionItems.length * analysisIds.length * 300));

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_COMPARISON_MODEL || process.env.OPENAI_POLICY_MODEL || 'gpt-4.1',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.15,
    max_tokens: estimatedTokens,
    response_format: { type: 'json_object' },
  });

  const resultText = response.choices[0]?.message?.content || '{}';
  const parsed = parseAIResponse(resultText);

  if (!parsed.rows || !Array.isArray(parsed.rows)) {
    throw new Error(`Section "${sectionKey}": invalid AI response — missing "rows" array`);
  }

  // Post-process and validate rows
  return parsed.rows.map((row: Record<string, unknown>) => ({
    id: (row.id as string) || `${sectionKey}-${Math.random().toString(36).substr(2, 9)}`,
    coverageName: row.coverageName as string,
    category: (row.category as ComparisonRow['category']) || 'coverage',
    isMandatory: (row.isMandatory as boolean) || false,
    status: (row.status as ComparisonRow['status']) || 'all_present',
    values: row.values as Record<string, unknown>,
  })) as ComparisonRow[];
}

/**
 * Builds the prompt for a single matrix section chunk.
 */
function buildSectionChunkPrompt(
  sectionKey: string,
  sectionItems: readonly string[],
  policyInputs: PolicyInput[],
  analysisIds: string[],
  insuranceCategory?: string | null,
  options?: ReformulationOptions & { referenceRows?: ComparisonRow[] },
  briefContext?: string,
): string {
  const strategy = resolveStrategy(insuranceCategory);
  const analysisIdsStr = analysisIds.join('", "');

  const itemsList = sectionItems.map((item, i) => `${i + 1}. ${item}`).join('\n');

  // Focus section for reformulation
  const focusNote = options?.focusAspects?.length
    ? `\nENFOQUE PRIORITARIO: Prioriza detalle en: ${options.focusAspects.join(', ')}.\n`
    : '';

  const userInstructionsNote = options?.userPrompt
    ? `\nINSTRUCCIONES DEL ANALISTA: ${options.userPrompt}\n`
    : '';

  // Brief context injection: client's declared values for benchmarking
  let briefBlock = '';
  if (briefContext) {
    const infraseguroRules = strategy.getInfraseguroRules();
    briefBlock = `
CONTEXTO DEL BRIEF DEL CLIENTE (valores declarados por el asegurado):
${briefContext}

${infraseguroRules}

INSTRUCCIÓN DE BENCHMARKING:
- Compara los montos/límites de cada póliza contra los valores de referencia del brief.
- Si un valor asegurado es inferior al valor declarado por el cliente, marca "status": "worse" e incluye en "description" la diferencia porcentual y el impacto (ej: "Límite $3.000M vs valor declarado $5.000M (-40%). Riesgo de infraseguro.").
- Si un valor asegurado es superior o igual al declarado, menciónalo positivamente en "description".
- La moneda del brief es la referencia; si la póliza usa otra moneda, señálalo.
`;
  }

  return `
RAMO: ${strategy.categoryLabel}
SECCIÓN DE MATRIZ: ${sectionKey}

Evalúa los siguientes ${sectionItems.length} ítems de la matriz comparativa contra ${policyInputs.length} pólizas de seguro.

ÍTEMS A EVALUAR (usa estos nombres EXACTOS en "coverageName"):
${itemsList}

DATOS DE LAS PÓLIZAS:
${JSON.stringify(policyInputs, null, 2)}
${focusNote}${userInstructionsNote}${briefBlock}
INSTRUCCIONES:
1. Para CADA ítem de la lista anterior, genera una fila comparativa.
2. Para cada fila, evalúa CADA una de las ${policyInputs.length} pólizas.
3. Si una póliza cubre ese ítem: provee value con name, limitAmount/deductibleAmount si aplica, y description OBLIGATORIA.
4. Si una póliza NO cubre ese ítem: "value": null, "status": "missing".
5. Compara entre pólizas y asigna "status": "better" | "worse" | "equal" | "missing".
6. "description" debe ser específica y basada en datos: montos, condiciones, comparaciones cuantitativas.
7. Si NINGUNA de las ${policyInputs.length} pólizas cubre un ítem, OMITE esa fila (no generes filas 100% "missing").
8. La "category" para la mayoría de ítems en esta sección será "coverage", excepto:
   - Si el ítem es claramente un deducible → "deductible"
   - Si el ítem es una exclusión → "exclusion"
   - Si el ítem es una condición financiera → "financial"
   - Si el ítem es una cláusula/endoso/beneficio adicional → "benefit"
   - Si el ítem es una nota aclaratoria/requisito → "requirement"

FORMATO DE RESPUESTA (JSON):
{
  "rows": [
    {
      "id": "section-item-slug",
      "coverageName": "Nombre EXACTO del ítem de la lista",
      "category": "coverage",
      "isMandatory": true,
      "status": "all_present",
      "values": {
        "${analysisIds[0] || 'analysis-1'}": {
          "value": { "name": "Nombre", "limitAmount": 5000000000, "limitUnit": "COP", "description": "Cobertura a valor total. Incluye..." },
          "reference": null,
          "status": "equal"
        }${analysisIds.length > 1 ? `,
        "${analysisIds[1] || 'analysis-2'}": {
          "value": { "name": "Nombre", "limitAmount": 3000000000, "limitUnit": "COP", "description": "Sublímite de $3.000M. 40% inferior a..." },
          "reference": null,
          "status": "worse"
        }` : ''}
      }
    }
  ]
}

REGLAS CRÍTICAS:
- "coverageName" DEBE ser el texto EXACTO del ítem de la lista (no parafrasees).
- En "values", usa los IDs exactos: "${analysisIdsStr}".
- Incluye TODOS los ${analysisIds.length} análisis en cada fila.
- "description" NUNCA vacía. Datos concretos del documento.
- Montos en la moneda original de la póliza.
`.trim();
}

// ─── Free-Form Alignment (Generic fallback) ──────────────────────────────────

/**
 * Free-form alignment for categories without a MatrixDefinition.
 * Uses a single AI call with improved prompt (enhanced vs original).
 */
async function alignFreeForm(
  analyses: PolicyAnalysis[],
  policyInputs: PolicyInput[],
  insuranceCategory?: string | null,
  options?: ReformulationOptions & { referenceRows?: ComparisonRow[] },
  briefContext?: string,
): Promise<ComparisonRow[]> {
  const openai = getOpenAIClient();
  const isReformulation = !!(options?.focusAspects?.length || options?.userPrompt || options?.referenceRows?.length);
  const systemPrompt = buildSystemPrompt(insuranceCategory);
  const userPrompt = buildFreeFormPrompt(analyses, policyInputs, insuranceCategory, options, briefContext);

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_COMPARISON_MODEL || process.env.OPENAI_POLICY_MODEL || 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: isReformulation ? 0.3 : 0.2,
      max_tokens: 16384,
      response_format: { type: 'json_object' },
    });

    const resultText = response.choices[0]?.message?.content || '{}';
    const parsed = parseAIResponse(resultText);

    if (!parsed.rows || !Array.isArray(parsed.rows)) {
      throw new Error('Invalid AI response structure: missing "rows" array');
    }

    const rows: ComparisonRow[] = parsed.rows.map((row: Record<string, unknown>) => ({
      id: (row.id as string) || `row-${Math.random().toString(36).substr(2, 9)}`,
      coverageName: row.coverageName as string,
      category: (row.category as ComparisonRow['category']) || 'coverage',
      isMandatory: (row.isMandatory as boolean) || false,
      status: (row.status as ComparisonRow['status']) || 'all_present',
      values: row.values as Record<string, unknown>,
    })) as ComparisonRow[];

    console.log(`✅ Free-form alignment complete: ${rows.length} rows generated`);
    return rows;

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error in free-form alignment:', msg);
    throw new Error(`Failed to align policies: ${msg}`);
  }
}

/**
 * Builds the free-form alignment prompt (used when no matrix exists).
 */
function buildFreeFormPrompt(
  analyses: PolicyAnalysis[],
  policyInputs: PolicyInput[],
  insuranceCategory?: string | null,
  options?: ReformulationOptions & { referenceRows?: ComparisonRow[] },
  briefContext?: string,
): string {
  const analysisIdsStr = analyses.map(a => a.id).join('", "');
  const strategy = resolveStrategy(insuranceCategory);
  const isSpecific = strategy.categoryId !== 'generic';

  const categoryContext = isSpecific
    ? `\nRAMO DE SEGURO: ${strategy.categoryLabel}\nInterpreta según la terminología del ramo ${strategy.categoryLabel} en el mercado colombiano.\n`
    : '';

  const focusSection = options?.focusAspects?.length
    ? `\nENFOQUE PRIORITARIO: Prioriza: ${options.focusAspects.join(', ')}.\n`
    : '';

  const userInstructions = options?.userPrompt
    ? `\nINSTRUCCIONES DEL ANALISTA: ${options.userPrompt}\n`
    : '';

  const referenceSection = options?.referenceRows?.length
    ? `\nCOMPARACIONES PREVIAS (MEJORAR, no repetir): ${options.referenceRows.length} filas anteriores. Coberturas: ${options.referenceRows.map(r => r.coverageName).join(', ')}.\n`
    : '';

  // Brief context injection for free-form mode
  let briefBlock = '';
  if (briefContext) {
    const infraseguroRules = strategy.getInfraseguroRules();
    briefBlock = `
CONTEXTO DEL BRIEF DEL CLIENTE (valores declarados por el asegurado):
${briefContext}

${infraseguroRules}

INSTRUCCIÓN DE BENCHMARKING:
- Compara los montos/límites de cada póliza contra los valores de referencia del brief.
- Si un valor asegurado es inferior al valor declarado, marca "status": "worse" e incluye la diferencia en "description".
- Si un valor asegurado es superior o igual, menciónalo positivamente.
`;
  }

  return `
Analiza y alinea las siguientes ${analyses.length} pólizas de seguro para crear una tabla comparativa unificada.
${categoryContext}
DATOS DE LAS PÓLIZAS:
${JSON.stringify(policyInputs, null, 2)}
${focusSection}${userInstructions}${referenceSection}${briefBlock}
INSTRUCCIONES:
1. Genera entre **20 y 60 filas** distribuidas en múltiples categorías: coverage, financial, deductible, exclusion, benefit, requirement.
2. Para cada fila, evalúa CADA una de las ${analyses.length} pólizas.
3. "status": "better" | "worse" | "equal" | "missing". "description" OBLIGATORIA.
4. Si una póliza no cubre algo: "value": null, "status": "missing".

FORMATO JSON: { "rows": [{ "id", "coverageName", "category", "isMandatory", "status", "values": { "<analysisId>": { "value": {...}, "reference": null, "status": "..." } } }] }

REGLAS:
- IDs exactos: "${analysisIdsStr}". Incluye TODOS los ${analyses.length} análisis por fila.
- "description" con datos concretos, nunca genérica.
- Genera el MÁXIMO de filas posible: cada cobertura, deducible, exclusión merece fila propia.
`.trim();
}

// ─── System Prompt ───────────────────────────────────────────────────────────

/**
 * Builds the system prompt with category-specific expertise when available.
 */
function buildSystemPrompt(insuranceCategory?: string | null): string {
  const strategy = resolveStrategy(insuranceCategory);
  const isSpecific = strategy.categoryId !== 'generic';

  const base = `Eres un actuario experto y analista de seguros especializado en el ramo de **${strategy.categoryLabel}**.`;
  const task = ' Tu tarea es comparar múltiples pólizas de seguros, normalizar sus coberturas a una ontología común y resaltar las diferencias clave.';

  if (!isSpecific) {
    return 'Eres un actuario experto y analista de seguros. Tu tarea es comparar múltiples pólizas de seguros, normalizar sus coberturas a una ontología común y resaltar las diferencias clave.';
  }

  const priorities = strategy.getComparisonPriorities();
  const prioritiesBlock = priorities.length > 0
    ? `\n\nPRIORIDADES DE COMPARACIÓN PARA ${strategy.categoryLabel.toUpperCase()}:\n${priorities.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\nEstas prioridades deben guiar el ORDEN e IMPORTANCIA de las filas que generes. Las primeras prioridades deben aparecer como filas obligatorias (isMandatory: true).`
    : '';

  return `${base}${task}${prioritiesBlock}`;
}
