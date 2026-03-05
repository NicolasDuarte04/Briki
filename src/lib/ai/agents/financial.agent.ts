/**
 * Agent 3: Financial & General Data Extractor
 *
 * Extracts insurer info, policy identification, dates, premiums,
 * deductibles, and financial data from pre-chunked document sections.
 *
 * Model: GPT-4o-mini (configurable via AGENT_FINANCIAL_MODEL)
 *
 * @module ai/agents/financial
 */

import { executeAgent } from '../providers';
import { parseAIResponse } from '@/lib/openai/policyAnalysis';
import { resolveStrategy } from '@/lib/prompts/strategies';
import type { FinancialAgentOutput, PageHint } from '../types';

// ─── Prompts ─────────────────────────────────────────────────────────────────

function buildSystemPrompt(insuranceCategory?: string): string {
  const strategy = resolveStrategy(insuranceCategory);
  const isSpecific = strategy.categoryId !== 'generic';

  let system = `Eres un actuario financiero experto en seguros.
Tu tarea es extraer datos de IDENTIFICACIÓN y FINANCIEROS de un documento de seguro.

CAMPOS QUE DEBES EXTRAER:
1. Aseguradora (nombre, código, contacto)
2. Número de póliza
3. Nombre del asegurado
4. Vigencia (fecha inicio y fin en ISO 8601)
5. Moneda y jurisdicción
6. Financials (prima neta, impuestos, comisiones, prima total)
7. Deducibles (todos los que encuentres)

REGLAS ESTRICTAS:
1. Fechas en formato ISO 8601 (YYYY-MM-DDTHH:mm:ssZ).
2. Montos son NÚMEROS, no strings.
3. Si un dato no está presente, OMÍTELO (no inventes).
4. Responde ÚNICAMENTE con JSON válido.`;

  if (isSpecific) {
    const domainContext = strategy.getDomainContext();
    const regulatory = strategy.getRegulatoryNotes();

    system += `\n\n═══ CONTEXTO FINANCIERO — ${strategy.categoryLabel.toUpperCase()} ═══\n`;
    system += `\n${domainContext}\n`;
    system += `\n**Marco regulatorio:**\n${regulatory}`;
  }

  return system;
}

function buildUserPrompt(
  generalInfoText: string,
  financialsText: string,
  deductiblesText: string,
): string {
  return `Extrae información de identificación y financiera de las siguientes secciones:

═══ SECCIÓN: INFORMACIÓN GENERAL / CARÁTULA ═══
${generalInfoText || '(No se encontró sección general)'}

═══ SECCIÓN: DATOS FINANCIEROS ═══
${financialsText || '(No se encontró sección financiera)'}

═══ SECCIÓN: DEDUCIBLES ═══
${deductiblesText || '(No se encontró sección de deducibles)'}

FORMATO DE RESPUESTA (JSON):
{
  "insurer": {
    "name": "nombre de la aseguradora",
    "code": "código",
    "contact": { "phone": "...", "email": "..." }
  },
  "policy_number": "POL-2025-001234",
  "insured_name": "nombre del asegurado",
  "effective_from": "2025-01-01T00:00:00Z",
  "effective_to": "2026-01-01T00:00:00Z",
  "jurisdiction": "co",
  "currency": "COP",
  "financials": {
    "premium_net": 5000000,
    "taxes": 950000,
    "fees": 100000,
    "premium_total": 6050000
  },
  "deductibles": [
    { "type": "general", "amount": 500000, "unit": "COP", "applies_to": "todos los amparos", "confidence": 0.9 }
  ],
  "financial_page_hints": [
    { "field": "policy_number", "value": "POL-2025-001234", "page": 1 },
    { "field": "premium_total", "value": "6050000", "page": 2 }
  ]
}

IMPORTANTE:
- "financial_page_hints": incluye una entrada por cada dato importante con la página ESTIMADA.
- Convierte TODOS los valores en "financial_page_hints[].value" a STRING.
- Si un campo no se encuentra en el texto, NO lo incluyas.`.trim();
}

// ─── Execution ───────────────────────────────────────────────────────────────

/**
 * Runs the financial extractor agent.
 *
 * @param generalInfoText  - Chunked general info / cover page text
 * @param financialsText   - Chunked financial section text
 * @param deductiblesText  - Chunked deductibles section text
 * @param insuranceCategory - Insurance category for strategy injection
 * @returns Structured financial data with page hints
 */
export async function runFinancialAgent(
  generalInfoText: string,
  financialsText: string,
  deductiblesText: string,
  insuranceCategory?: string,
): Promise<FinancialAgentOutput> {
  const systemPrompt = buildSystemPrompt(insuranceCategory);
  const userPrompt = buildUserPrompt(
    generalInfoText,
    financialsText,
    deductiblesText,
  );

  const response = await executeAgent('financial', systemPrompt, userPrompt);
  const parsed = parseAIResponse(response.text);

  // Type-safe page hints
  const rawHints: unknown[] = Array.isArray(parsed.financial_page_hints)
    ? parsed.financial_page_hints
    : [];

  const financial_page_hints: PageHint[] = rawHints
    .filter(
      (h): h is { field: string; value: string; page: number } =>
        typeof h === 'object' &&
        h !== null &&
        typeof (h as Record<string, unknown>).field === 'string' &&
        typeof (h as Record<string, unknown>).value === 'string' &&
        typeof (h as Record<string, unknown>).page === 'number',
    )
    .map((h) => ({ field: h.field, value: String(h.value), page: h.page }));

  return {
    insurer:
      parsed.insurer && typeof parsed.insurer === 'object'
        ? parsed.insurer
        : undefined,
    policy_number:
      typeof parsed.policy_number === 'string'
        ? parsed.policy_number
        : undefined,
    insured_name:
      typeof parsed.insured_name === 'string'
        ? parsed.insured_name
        : undefined,
    effective_from:
      typeof parsed.effective_from === 'string'
        ? parsed.effective_from
        : undefined,
    effective_to:
      typeof parsed.effective_to === 'string'
        ? parsed.effective_to
        : undefined,
    jurisdiction:
      typeof parsed.jurisdiction === 'string'
        ? parsed.jurisdiction
        : undefined,
    currency:
      typeof parsed.currency === 'string' ? parsed.currency : undefined,
    financials:
      parsed.financials && typeof parsed.financials === 'object'
        ? parsed.financials
        : undefined,
    deductibles: Array.isArray(parsed.deductibles) ? parsed.deductibles : [],
    financial_page_hints,
  };
}
