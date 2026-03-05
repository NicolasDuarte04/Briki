/**
 * Agent 4: Merger & Validator
 *
 * Merges partial outputs from Coverage Agent and Financial Agent
 * into the final PolicyExtractedData structure, resolves conflicts,
 * assigns confidence scores, and generates pageReferences.
 *
 * The output of this agent feeds directly into the existing
 * `normalizeAnalysisResult()` function, which handles coordinate
 * mapping via `findCoordinatesForValue()` — so we produce
 * pageReferences with `box: { x:0, y:0, width:0, height:0 }` and
 * let the post-processor auto-map real coordinates.
 *
 * Model: GPT-4o-mini (configurable via AGENT_MERGER_MODEL)
 *
 * @module ai/agents/merger
 */

import { executeAgent } from '../providers';
import {
  parseAIResponse,
  type PolicyExtractedData,
  type PageReference,
} from '@/lib/openai/policyAnalysis';
import type { CoverageAgentOutput, FinancialAgentOutput } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MergerOutput {
  data: PolicyExtractedData;
  confidence: number;
  pageReferences: PageReference[];
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un revisor y validador de datos de seguros. Tu tarea es:

1. FUSIONAR los outputs de dos extractores especializados en UNA estructura unificada.
2. RESOLVER conflictos si ambos extractores reportan el mismo dato con valores distintos.
3. ASIGNAR un score de confianza global (0–1) basado en completitud y consistencia.
4. GENERAR una lista de pageReferences vinculando cada campo extraído a su página.

REGLAS DE MERGE:
- Si un campo aparece en AMBOS outputs con el mismo valor: tomar el valor, confidence = promedio.
- Si un campo aparece en AMBOS con valores DISTINTOS: tomar el que tenga más contexto/detalle.
- Si un campo aparece en SOLO UNO: tomarlo tal cual.
- NO inventes datos que no estén en los outputs de entrada.

REGLAS DE CONFIANZA:
- 0.90–1.00: Dato presente en ambos extractores y consistente.
- 0.70–0.89: Dato presente en un extractor, claramente identificado.
- 0.50–0.69: Dato inferido o con ambigüedad.
- Confianza global: promedio ponderado de campos críticos (policy_number, premium_total, coverages).

Responde ÚNICAMENTE con JSON válido.`.trim();

function buildUserPrompt(
  coverageOutput: CoverageAgentOutput,
  financialOutput: FinancialAgentOutput,
): string {
  return `FUSIONA los siguientes outputs de dos agentes extractores en una estructura PolicyExtractedData unificada.

═══ OUTPUT DEL AGENTE DE COBERTURAS ═══
${JSON.stringify(coverageOutput, null, 2)}

═══ OUTPUT DEL AGENTE FINANCIERO ═══
${JSON.stringify(financialOutput, null, 2)}

FORMATO DE RESPUESTA (JSON):
{
  "data": {
    "insurer": { "name": "...", "code": "...", "contact": { "phone": "...", "email": "..." } },
    "policy_number": "...",
    "insured_name": "...",
    "effective_from": "ISO 8601",
    "effective_to": "ISO 8601",
    "jurisdiction": "...",
    "currency": "...",
    "financials": { "premium_net": 0, "taxes": 0, "fees": 0, "premium_total": 0 },
    "coverages": [ ... ],
    "exclusions": [ ... ],
    "deductibles": [ ... ],
    "endorsements": [ ... ],
    "claims_process": { ... }
  },
  "confidence": 0.85,
  "pageReferences": [
    {
      "field": "policy_number",
      "value": "POL-001",
      "page": 1,
      "box": { "x": 0, "y": 0, "width": 0, "height": 0 },
      "confidence": 0.95
    }
  ]
}

INSTRUCCIONES PARA pageReferences:
- Usa los page_hints de ambos agentes para determinar la página de cada campo.
- El campo "value" SIEMPRE debe ser STRING (convierte números a string).
- El "box" SIEMPRE debe ser { "x": 0, "y": 0, "width": 0, "height": 0 } — el sistema mapeará coordenadas automáticamente.
- Incluye referencias para: policy_number, insured_name, premium_total, effective_from, effective_to, insurer.name.
- Y para cada cobertura: su nombre y límite.
- Y para cada exclusión: su nombre principal.
- NUNCA dejes pageReferences vacío si hay datos extraídos.`.trim();
}

// ─── Execution ───────────────────────────────────────────────────────────────

/**
 * Runs the merger agent to produce the final PolicyExtractedData.
 *
 * @param coverageOutput  - Output from Agent 2
 * @param financialOutput - Output from Agent 3
 * @returns Merged data + confidence + pageReferences (ready for normalizeAnalysisResult)
 */
export async function runMergerAgent(
  coverageOutput: CoverageAgentOutput,
  financialOutput: FinancialAgentOutput,
): Promise<MergerOutput> {
  const systemPrompt = SYSTEM_PROMPT;
  const userPrompt = buildUserPrompt(coverageOutput, financialOutput);

  const response = await executeAgent('merger', systemPrompt, userPrompt);
  const parsed = parseAIResponse(response.text);

  // ── Validate & normalize data ──────────────────────────────────────

  const data: PolicyExtractedData = parsed.data || {};

  const confidence =
    typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.5;

  // ── Normalize pageReferences ───────────────────────────────────────

  const rawRefs: unknown[] = Array.isArray(parsed.pageReferences)
    ? parsed.pageReferences
    : [];

  const pageReferences: PageReference[] = rawRefs
    .filter((ref): ref is Record<string, unknown> => {
      if (typeof ref !== 'object' || ref === null) return false;
      const r = ref as Record<string, unknown>;
      return typeof r.field === 'string' && r.page !== undefined;
    })
    .map((ref) => ({
      field: String(ref.field),
      value: String(ref.value ?? ''),
      page: Math.max(1, Math.floor(Number(ref.page) || 1)),
      box:
        ref.box && typeof ref.box === 'object'
          ? {
              x: Number((ref.box as Record<string, unknown>).x) || 0,
              y: Number((ref.box as Record<string, unknown>).y) || 0,
              width:
                Number((ref.box as Record<string, unknown>).width) || 0,
              height:
                Number((ref.box as Record<string, unknown>).height) || 0,
            }
          : { x: 0, y: 0, width: 0, height: 0 },
      confidence:
        typeof ref.confidence === 'number'
          ? Math.max(0, Math.min(1, ref.confidence))
          : 0.5,
    }));

  return { data, confidence, pageReferences };
}
