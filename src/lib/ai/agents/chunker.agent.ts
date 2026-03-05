/**
 * Agent 1: Semantic Document Chunker (Page-Index Mode)
 *
 * Classifies pages of an insurance PDF into semantic categories by emitting
 * page INDICES per section — NOT the text itself. This makes the chunker
 * output ~200 tokens instead of ~25K, eliminating the primary bottleneck.
 *
 * The orchestrator uses the page indices to assemble text sections from the
 * already-extracted full text (which contains [[PAGE_N]] markers).
 *
 * If chunking fails or finds fewer than 2 sections, returns a fallback
 * where all pages go into every section — degrading gracefully to
 * monolithic behavior without breaking the pipeline.
 *
 * Model: gpt-4.1-nano (configurable via AGENT_CHUNKER_MODEL)
 *
 * @module ai/agents/chunker
 */

import { executeAgent } from '../providers';
import { parseAIResponse } from '@/lib/openai/policyAnalysis';
import type { SectionKey } from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────

const SECTION_KEYS: readonly SectionKey[] = [
  'general_info',
  'coverages',
  'exclusions',
  'financials',
  'deductibles',
  'endorsements',
  'claims_process',
] as const;

/**
 * Chunker output: page indices per section.
 * The orchestrator resolves these into full text strings.
 */
export interface ChunkerPageIndex {
  /** Map from section key to array of 1-indexed page numbers */
  sectionPages: Record<SectionKey, number[]>;
  metadata: {
    total_pages: number;
    has_tables: boolean;
    document_language: string;
    sections_found: SectionKey[];
  };
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un analizador experto de documentos de seguros. Tu ÚNICA tarea es identificar en QUÉ PÁGINAS se encuentra cada sección temática de una póliza o cotización de seguros.

REGLAS:
1. NO copies texto. Solo indica los NÚMEROS DE PÁGINA para cada sección.
2. Una misma página DEBE aparecer en VARIAS secciones si contiene información mixta o ambigua. Ante la duda, INCLUYE la página en más secciones.
3. Si una sección NO existe en el documento, devuelve un array vacío [].
4. Las páginas están marcadas con [[PAGE_N]] en el documento.
5. Es MEJOR incluir una página de más que perder una. Prioriza exhaustividad.
6. Responde ÚNICAMENTE con JSON válido.`.trim();

/**
 * Builds a compact user prompt with a brief excerpt per page (~300 chars).
 * The full text is NOT sent — only enough context per page for the LLM to
 * classify which sections each page belongs to.
 */
function buildUserPrompt(
  pageMap: ReadonlyMap<number, string>,
  totalPages: number,
): string {
  // Build a compact page directory: head + tail sampling per page
  // 600 chars per end ensures we capture section headers AND closing content
  const PAGE_HEAD_CHARS = 600;
  const PAGE_TAIL_CHARS = 400;
  const pageLines: string[] = [];

  for (const [pageNum, pageText] of pageMap) {
    let preview: string;
    if (pageText.length <= PAGE_HEAD_CHARS + PAGE_TAIL_CHARS) {
      // Short page — send it all
      preview = pageText;
    } else {
      // Long page — head + tail so both section boundaries are visible
      const head = pageText.slice(0, PAGE_HEAD_CHARS);
      const tail = pageText.slice(-PAGE_TAIL_CHARS);
      preview = `${head}\n[…${pageText.length - PAGE_HEAD_CHARS - PAGE_TAIL_CHARS} chars omitidos…]\n${tail}`;
    }
    pageLines.push(`── Página ${pageNum} ──\n${preview}`);
  }

  return `El documento tiene ${totalPages} páginas. A continuación tienes un extracto de cada página.
Clasifica cada página en una o más secciones semánticas indicando SOLO los números de página.

SECCIONES:
- general_info: Información general — aseguradora, número de póliza, nombre del asegurado, fechas de vigencia, declaraciones, carátula
- coverages: Coberturas — detalle de coberturas, límites, sublímites, condiciones particulares, amparos
- exclusions: Exclusiones — cláusulas de exclusión, limitaciones, restricciones
- financials: Financiero — prima neta, impuestos, gastos, prima total, forma de pago, recargos
- deductibles: Deducibles — deducibles generales, por cobertura, mínimos, porcentuales
- endorsements: Endosos — endosos, anexos, riders, modificaciones, adendas
- claims_process: Proceso de reclamación — avisos de siniestro, teléfonos, pasos, plazos

FORMATO DE RESPUESTA (JSON):
{
  "sections": {
    "general_info": [1, 2],
    "coverages": [3, 4, 5],
    "exclusions": [6],
    "financials": [2, 7],
    "deductibles": [7],
    "endorsements": [],
    "claims_process": [8]
  },
  "metadata": {
    "total_pages": ${totalPages},
    "has_tables": false,
    "document_language": "es"
  }
}

═══════════════════════════════════════════════════════════
EXTRACTOS POR PÁGINA:
═══════════════════════════════════════════════════════════

${pageLines.join('\n\n')}`.trim();
}

// ─── Execution ───────────────────────────────────────────────────────────────

/**
 * Executes the chunker agent to classify document pages into sections.
 *
 * Returns page indices per section — the orchestrator assembles the actual
 * text strings from the full document using [[PAGE_N]] markers.
 *
 * @param pageMap    - Map of page number → page text (built by orchestrator)
 * @param totalPages - Total number of pages in the document
 * @returns ChunkerPageIndex with page numbers per section
 */
export async function runChunkerAgent(
  pageMap: ReadonlyMap<number, string>,
  totalPages: number,
): Promise<ChunkerPageIndex> {
  try {
    const response = await executeAgent(
      'chunker',
      SYSTEM_PROMPT,
      buildUserPrompt(pageMap, totalPages),
    );
    const parsed = parseAIResponse(response.text);

    // Validate top-level structure
    if (!parsed.sections || typeof parsed.sections !== 'object') {
      console.warn(
        '⚠️ [Chunker] Response missing "sections" object, using fallback',
      );
      return buildFallback(totalPages);
    }

    // Normalize: ensure all keys exist as number arrays within valid range
    const sectionPages: Record<SectionKey, number[]> = {
      general_info: [],
      coverages: [],
      exclusions: [],
      financials: [],
      deductibles: [],
      endorsements: [],
      claims_process: [],
    };

    for (const key of SECTION_KEYS) {
      const raw: unknown = parsed.sections[key];
      if (Array.isArray(raw)) {
        sectionPages[key] = raw
          .filter(
            (v): v is number =>
              typeof v === 'number' && v >= 1 && v <= totalPages,
          )
          .sort((a, b) => a - b);
      }
    }

    // If fewer than 2 sections found, chunking wasn't meaningful
    const foundSections = SECTION_KEYS.filter(
      (k) => sectionPages[k].length > 0,
    );

    if (foundSections.length < 2) {
      console.warn(
        `⚠️ [Chunker] Only ${foundSections.length} section(s) found — using fallback`,
      );
      return buildFallback(totalPages);
    }

    const metadata = {
      total_pages: totalPages,
      has_tables:
        typeof parsed.metadata?.has_tables === 'boolean'
          ? parsed.metadata.has_tables
          : false,
      document_language:
        typeof parsed.metadata?.document_language === 'string'
          ? parsed.metadata.document_language
          : 'es',
      sections_found: foundSections,
    };

    console.log(
      `📋 [Chunker] Secciones encontradas: ${foundSections.join(', ')} ` +
        `(${foundSections.map((k) => `${k}:[${sectionPages[k].join(',')}]`).join(' ')})`,
    );
    return { sectionPages, metadata };
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : 'Unknown chunker error';
    console.error(`❌ [Chunker] Error: ${msg}. Using fallback.`);
    return buildFallback(totalPages);
  }
}

// ─── Fallback ────────────────────────────────────────────────────────────────

/**
 * Fallback: all pages go into every section so downstream agents
 * receive the full document. This degrades to near-monolithic behavior
 * but keeps the pipeline running.
 */
function buildFallback(totalPages: number): ChunkerPageIndex {
  const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return {
    sectionPages: {
      general_info: allPages,
      coverages: allPages,
      exclusions: allPages,
      financials: allPages,
      deductibles: allPages,
      endorsements: allPages,
      claims_process: allPages,
    },
    metadata: {
      total_pages: totalPages,
      has_tables: false,
      document_language: 'es',
      sections_found: ['general_info'] as SectionKey[],
    },
  };
}
