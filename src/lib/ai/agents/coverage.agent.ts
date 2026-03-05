/**
 * Agent 2: Coverage & Exclusion Extractor
 *
 * Extracts coverages, exclusions, endorsements, and claims process
 * from pre-chunked document sections.
 *
 * Receives strategy-injected domain context for category-aware extraction
 * (e.g. TRDM, Salud, RCE).
 *
 * Model: GPT-4o-mini (configurable via AGENT_COVERAGE_MODEL)
 *
 * @module ai/agents/coverage
 */

import { executeAgent } from '../providers';
import { parseAIResponse } from '@/lib/openai/policyAnalysis';
import { resolveStrategy } from '@/lib/prompts/strategies';
import type { CoverageAgentOutput, PageHint } from '../types';

// ─── Prompts ─────────────────────────────────────────────────────────────────

function buildSystemPrompt(insuranceCategory?: string): string {
  const strategy = resolveStrategy(insuranceCategory);
  const isSpecific = strategy.categoryId !== 'generic';

  let system = `Eres un auditor forense de pólizas de seguros especializado en coberturas, exclusiones y endosos.
Tu tarea es extraer datos ESTRUCTURADOS de las secciones de cobertura y exclusiones de un documento de seguro.

REGLAS ESTRICTAS:
1. Extrae SOLO los campos indicados en el formato de respuesta.
2. Si un dato no está presente en el texto, OMÍTELO (no inventes).
3. Asigna confidence 0.0–1.0 a cada cobertura según la claridad del dato.
4. Los montos son NÚMEROS, no strings.
5. Responde ÚNICAMENTE con JSON válido.`;

  if (isSpecific) {
    const domainContext = strategy.getDomainContext();
    const checklist = strategy.getAnalysisChecklist();
    const infraseguro = strategy.getInfraseguroRules();

    system += `\n\n═══ CONTEXTO ESPECIALIZADO — ${strategy.categoryLabel.toUpperCase()} ═══\n`;
    system += `\n${domainContext}\n`;
    system += `\n**Checklist de coberturas obligatorias:**\n${checklist.map((item, i) => `${i + 1}. ${item}`).join('\n')}\n`;
    system += `\n**Reglas de infraseguro:**\n${infraseguro}`;
  }

  return system;
}

function buildUserPrompt(
  coveragesText: string,
  exclusionsText: string,
  endorsementsText: string,
  claimsText: string,
): string {
  return `Extrae la siguiente información de las secciones del documento de seguros proporcionadas.

═══ SECCIÓN: COBERTURAS ═══
${coveragesText || '(No se encontró sección de coberturas)'}

═══ SECCIÓN: EXCLUSIONES ═══
${exclusionsText || '(No se encontró sección de exclusiones)'}

═══ SECCIÓN: ENDOSOS ═══
${endorsementsText || '(No se encontró sección de endosos)'}

═══ SECCIÓN: PROCESO DE RECLAMACIÓN ═══
${claimsText || '(No se encontró sección de reclamaciones)'}

FORMATO DE RESPUESTA (JSON):
{
  "coverages": [
    {
      "name": "nombre de la cobertura",
      "description": "descripción breve",
      "limit_amount": 1000000,
      "limit_unit": "unidad (MXN, USD, eventos, etc.)",
      "limit_currency": "ISO 4217 si es monetario, null si no",
      "limit_description": "descripción si no es monetario, null si es monetario",
      "sublimits": [{ "name": "...", "amount": 100000, "unit": "..." }],
      "deductible_amount": 5000,
      "deductible_unit": "MXN o %",
      "waiting_period": 30,
      "confidence": 0.95
    }
  ],
  "exclusions": [
    { "name": "nombre", "description": "descripción", "confidence": 0.90 }
  ],
  "endorsements": [
    { "number": "E-001", "name": "nombre", "description": "descripción", "effective_date": "ISO 8601", "confidence": 0.85 }
  ],
  "claims_process": {
    "phone": "teléfono",
    "email": "email",
    "steps": ["paso 1", "paso 2"],
    "time_limit_days": 30
  },
  "coverage_page_hints": [
    { "field": "coverage_rc", "value": "Responsabilidad Civil", "page": 3 }
  ]
}

IMPORTANTE:
- "coverage_page_hints": incluye una entrada por cada cobertura/exclusión principal
  con la página ESTIMADA donde aparece (si puedes detectarla del contexto).
- Si no puedes estimar la página, usa 1 como default.
- NO inventes coberturas que no estén en el texto.`.trim();
}

// ─── Execution ───────────────────────────────────────────────────────────────

/**
 * Runs the coverage extractor agent.
 *
 * @param coveragesText   - Chunked coverage section text
 * @param exclusionsText  - Chunked exclusions section text
 * @param endorsementsText - Chunked endorsements section text
 * @param claimsText      - Chunked claims process section text
 * @param insuranceCategory - Insurance category for strategy injection
 * @returns Structured coverage data with page hints
 */
export async function runCoverageAgent(
  coveragesText: string,
  exclusionsText: string,
  endorsementsText: string,
  claimsText: string,
  insuranceCategory?: string,
): Promise<CoverageAgentOutput> {
  const systemPrompt = buildSystemPrompt(insuranceCategory);
  const userPrompt = buildUserPrompt(
    coveragesText,
    exclusionsText,
    endorsementsText,
    claimsText,
  );

  const response = await executeAgent('coverage', systemPrompt, userPrompt);
  const parsed = parseAIResponse(response.text);

  // Normalize — guard every array with Array.isArray
  const coverages = Array.isArray(parsed.coverages) ? parsed.coverages : [];
  const exclusions = Array.isArray(parsed.exclusions) ? parsed.exclusions : [];
  const endorsements = Array.isArray(parsed.endorsements)
    ? parsed.endorsements
    : [];
  const rawHints: unknown[] = Array.isArray(parsed.coverage_page_hints)
    ? parsed.coverage_page_hints
    : [];

  // Type-safe page hints
  const coverage_page_hints: PageHint[] = rawHints
    .filter(
      (h): h is { field: string; value: string; page: number } =>
        typeof h === 'object' &&
        h !== null &&
        typeof (h as Record<string, unknown>).field === 'string' &&
        typeof (h as Record<string, unknown>).value === 'string' &&
        typeof (h as Record<string, unknown>).page === 'number',
    )
    .map((h) => ({ field: h.field, value: h.value, page: h.page }));

  return {
    coverages,
    exclusions,
    endorsements,
    claims_process:
      parsed.claims_process && typeof parsed.claims_process === 'object'
        ? parsed.claims_process
        : undefined,
    coverage_page_hints,
  };
}
