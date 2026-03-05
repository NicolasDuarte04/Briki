/**
 * Multi-Agent Pipeline Orchestrator
 *
 * Coordinates the 4-agent pipeline for policy/quote extraction:
 *
 *   1. Chunker   → classifies PAGES into semantic sections (page indices)
 *   2. Orchestrator builds text sections from page indices
 *   3. Coverage  ┐
 *      Financial ┘ → parallel extraction from text sections
 *   4. Merger    → validates, merges, produces final output
 *
 * Feature-flagged via MULTI_AGENT_PIPELINE env var.
 * Falls back to monolithic pipeline on any critical failure.
 *
 * The final output is compatible with `normalizeAnalysisResult()` —
 * the existing post-processor handles coordinate mapping.
 *
 * @module ai/orchestrator
 */

import type { AnalysisInput, AnalysisOutput } from '@/lib/openai/policyAnalysis';
import type {
  PipelineTelemetry,
  AgentTelemetryEntry,
  DocumentSections,
  SectionKey,
} from './types';
import { getAgentConfig } from './providers';
import { runChunkerAgent, type ChunkerPageIndex } from './agents/chunker.agent';
import { runCoverageAgent } from './agents/coverage.agent';
import { runFinancialAgent } from './agents/financial.agent';
import { runMergerAgent } from './agents/merger.agent';

// ─── Feature Flag ────────────────────────────────────────────────────────────

/**
 * Whether the multi-agent pipeline is enabled.
 * Reads from env at call time (not module load) so it can be toggled
 * without restarting the server.
 */
export function isMultiAgentEnabled(): boolean {
  return process.env.MULTI_AGENT_PIPELINE === 'true';
}

// ─── Page Text Utilities ─────────────────────────────────────────────────────

/** Regex that matches [[PAGE_N]] markers inserted by extraction.ts */
const PAGE_MARKER_RE = /\[\[PAGE_(\d+)\]\]/g;

/**
 * Splits the full extracted text into a Map<pageNumber, pageText>.
 * Relies on the `[[PAGE_N]]` markers that extraction.ts already inserts
 * at the start of each page.
 *
 * @returns Map where keys are 1-indexed page numbers and values are the
 *          raw text content of that page (without the marker itself).
 */
function buildPageTextMap(fullText: string): Map<number, string> {
  const map = new Map<number, string>();

  // Split text by [[PAGE_N]] markers, keeping the delimiter info
  const parts = fullText.split(/\[\[PAGE_(\d+)\]\]\n?/);

  // parts structure: [textBeforeFirstMarker, "1", page1Text, "2", page2Text, ...]
  // Start at index 1 (skip text before first marker, if any)
  for (let i = 1; i < parts.length; i += 2) {
    const pageNum = parseInt(parts[i] ?? '', 10);
    const pageText = (parts[i + 1] ?? '').trim();
    if (!isNaN(pageNum) && pageText.length > 0) {
      map.set(pageNum, pageText);
    }
  }

  return map;
}

/**
 * Functional affinity groups: sections whose content frequently overlaps
 * in real insurance documents. When a page is assigned to one section in
 * a group, it is automatically shared with the other sections in the same
 * group. This ensures no data is lost due to chunker classification ambiguity.
 *
 * Coverage group: coverages ↔ exclusions ↔ endorsements ↔ claims_process
 * Financial group: general_info ↔ financials ↔ deductibles
 */
const AFFINITY_GROUPS: ReadonlyArray<readonly SectionKey[]> = [
  ['coverages', 'exclusions', 'endorsements', 'claims_process'] as const,
  ['general_info', 'financials', 'deductibles'] as const,
];

/**
 * Assembles DocumentSections from chunker page indices + page text map.
 *
 * For each section, concatenates the text of all pages assigned to it,
 * PLUS pages from affinity-related sections (shared pages). This guarantees
 * that coverage-adjacent data (exclusions, endorsements) is always visible
 * to the coverage agent, and financial-adjacent data is always visible to
 * the financial agent.
 *
 * If the chunker left a section empty, the downstream agent gets ""
 * and can safely skip processing.
 */
function assembleSections(
  pageIndex: ChunkerPageIndex,
  pageMap: ReadonlyMap<number, string>,
): DocumentSections {
  const sections: DocumentSections = {
    general_info: '',
    coverages: '',
    exclusions: '',
    financials: '',
    deductibles: '',
    endorsements: '',
    claims_process: '',
  };

  // Build effective page sets with affinity sharing
  const effectivePages: Record<SectionKey, Set<number>> = {
    general_info: new Set(pageIndex.sectionPages.general_info),
    coverages: new Set(pageIndex.sectionPages.coverages),
    exclusions: new Set(pageIndex.sectionPages.exclusions),
    financials: new Set(pageIndex.sectionPages.financials),
    deductibles: new Set(pageIndex.sectionPages.deductibles),
    endorsements: new Set(pageIndex.sectionPages.endorsements),
    claims_process: new Set(pageIndex.sectionPages.claims_process),
  };

  // Share pages across affinity groups
  for (const group of AFFINITY_GROUPS) {
    // Collect all pages assigned to any section in this group
    const groupPages = new Set<number>();
    for (const key of group) {
      for (const p of effectivePages[key]) {
        groupPages.add(p);
      }
    }
    // Merge into each section of the group
    for (const key of group) {
      for (const p of groupPages) {
        effectivePages[key].add(p);
      }
    }
  }

  const sectionKeys: SectionKey[] = [
    'general_info',
    'coverages',
    'exclusions',
    'financials',
    'deductibles',
    'endorsements',
    'claims_process',
  ];

  for (const key of sectionKeys) {
    const pages = [...effectivePages[key]].sort((a, b) => a - b);
    if (pages.length === 0) continue;

    const texts: string[] = [];
    for (const pageNum of pages) {
      const pageText = pageMap.get(pageNum);
      if (pageText) {
        texts.push(`[[PAGE_${pageNum}]]\n${pageText}`);
      }
    }
    sections[key] = texts.join('\n\n');
  }

  return sections;
}

// ─── Pipeline Execution ──────────────────────────────────────────────────────

/**
 * Runs the full multi-agent extraction pipeline.
 *
 * @param input - Same `AnalysisInput` used by the monolithic `analyzeWithAI()`
 * @returns `AnalysisOutput` compatible with `normalizeAnalysisResult()` + telemetry
 * @throws Error if critical agents fail (caller should fallback to monolithic)
 */
export async function runMultiAgentPipeline(
  input: AnalysisInput,
): Promise<{ result: AnalysisOutput; telemetry: PipelineTelemetry }> {
  const pipelineStart = Date.now();
  const agentLogs: AgentTelemetryEntry[] = [];

  console.log('🔄 [Multi-Agent] Iniciando pipeline multi-agente...');
  console.log(
    `   Texto: ${input.text.length} chars | Categoría: ${input.insuranceCategory || 'generic'}`,
  );

  // ── Step 0: Build page text map from [[PAGE_N]] markers ─────────────

  const pageMap = buildPageTextMap(input.text);
  const totalPages = pageMap.size;

  console.log(
    `📄 [Multi-Agent] Mapa de páginas construido: ${totalPages} páginas`,
  );

  // ── Step 1: Chunker (page-index mode) ───────────────────────────────

  const chunkerStart = Date.now();
  let pageIndex: ChunkerPageIndex;

  try {
    pageIndex = await runChunkerAgent(pageMap, totalPages);
    agentLogs.push({
      role: 'chunker',
      model: getAgentConfig('chunker').modelId,
      durationMs: Date.now() - chunkerStart,
      promptTokens: 0,
      completionTokens: 0,
      success: true,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Chunker failed';
    agentLogs.push({
      role: 'chunker',
      model: getAgentConfig('chunker').modelId,
      durationMs: Date.now() - chunkerStart,
      promptTokens: 0,
      completionTokens: 0,
      success: false,
      error: msg,
    });
    throw new Error(`Multi-agent pipeline failed at Chunker: ${msg}`);
  }

  console.log(
    `📋 [Multi-Agent] Chunking completado: ${pageIndex.metadata.sections_found.length} secciones`,
  );

  // ── Step 1.5: Assemble text sections from page indices ──────────────

  const sections = assembleSections(pageIndex, pageMap);

  const sectionSizes = Object.entries(sections)
    .filter(([, v]) => v.length > 0)
    .map(([k, v]) => `${k}:${v.length}`)
    .join(' ');
  console.log(`📦 [Multi-Agent] Secciones ensambladas: ${sectionSizes}`);

  // ── Step 2: Parallel Extraction ─────────────────────────────────────

  const [coverageResult, financialResult] = await Promise.allSettled([
    runCoverageExtractorWithTelemetry(sections, input, agentLogs),
    runFinancialExtractorWithTelemetry(sections, input, agentLogs),
  ]);

  // Both failed → can't produce any output
  if (
    coverageResult.status === 'rejected' &&
    financialResult.status === 'rejected'
  ) {
    throw new Error(
      `Multi-agent pipeline failed: both extractors failed. ` +
        `Coverage: ${coverageResult.reason instanceof Error ? coverageResult.reason.message : 'Unknown'}. ` +
        `Financial: ${financialResult.reason instanceof Error ? financialResult.reason.message : 'Unknown'}`,
    );
  }

  // Use results or empty defaults for failed agent
  const coverageOutput =
    coverageResult.status === 'fulfilled'
      ? coverageResult.value
      : {
          coverages: [],
          exclusions: [],
          endorsements: [],
          coverage_page_hints: [],
        };

  const financialOutput =
    financialResult.status === 'fulfilled'
      ? financialResult.value
      : { deductibles: [], financial_page_hints: [] };

  if (coverageResult.status === 'rejected') {
    console.warn(
      '⚠️ [Multi-Agent] Coverage agent failed, continuing with financial data only',
    );
  }
  if (financialResult.status === 'rejected') {
    console.warn(
      '⚠️ [Multi-Agent] Financial agent failed, continuing with coverage data only',
    );
  }

  console.log('✅ [Multi-Agent] Extracción paralela completada');

  // ── Step 3: Merger ──────────────────────────────────────────────────

  const mergerStart = Date.now();
  let mergedResult;

  try {
    mergedResult = await runMergerAgent(coverageOutput, financialOutput);
    agentLogs.push({
      role: 'merger',
      model: getAgentConfig('merger').modelId,
      durationMs: Date.now() - mergerStart,
      promptTokens: 0,
      completionTokens: 0,
      success: true,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Merger failed';
    agentLogs.push({
      role: 'merger',
      model: getAgentConfig('merger').modelId,
      durationMs: Date.now() - mergerStart,
      promptTokens: 0,
      completionTokens: 0,
      success: false,
      error: msg,
    });
    throw new Error(`Multi-agent pipeline failed at Merger: ${msg}`);
  }

  // ── Build Final Output ──────────────────────────────────────────────

  const totalDurationMs = Date.now() - pipelineStart;

  const telemetry: PipelineTelemetry = {
    pipeline: 'multi-agent',
    agents: agentLogs,
    totalDurationMs,
    totalPromptTokens: agentLogs.reduce((sum, a) => sum + a.promptTokens, 0),
    totalCompletionTokens: agentLogs.reduce(
      (sum, a) => sum + a.completionTokens,
      0,
    ),
  };

  const successCount = agentLogs.filter((a) => a.success).length;
  console.log(
    `✅ [Multi-Agent] Pipeline completado en ${totalDurationMs}ms ` +
      `(${successCount}/${agentLogs.length} agentes exitosos)`,
  );

  return {
    result: {
      data: mergedResult.data,
      confidence: mergedResult.confidence,
      pageReferences: mergedResult.pageReferences,
    },
    telemetry,
  };
}

// ─── Helper: Parallel Extractors with Telemetry ──────────────────────────────

async function runCoverageExtractorWithTelemetry(
  sections: DocumentSections,
  input: AnalysisInput,
  agentLogs: AgentTelemetryEntry[],
) {
  const start = Date.now();
  try {
    const result = await runCoverageAgent(
      sections.coverages,
      sections.exclusions,
      sections.endorsements,
      sections.claims_process,
      input.insuranceCategory,
    );
    agentLogs.push({
      role: 'coverage',
      model: getAgentConfig('coverage').modelId,
      durationMs: Date.now() - start,
      promptTokens: 0,
      completionTokens: 0,
      success: true,
    });
    return result;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Coverage failed';
    agentLogs.push({
      role: 'coverage',
      model: getAgentConfig('coverage').modelId,
      durationMs: Date.now() - start,
      promptTokens: 0,
      completionTokens: 0,
      success: false,
      error: msg,
    });
    throw error;
  }
}

async function runFinancialExtractorWithTelemetry(
  sections: DocumentSections,
  input: AnalysisInput,
  agentLogs: AgentTelemetryEntry[],
) {
  const start = Date.now();
  try {
    const result = await runFinancialAgent(
      sections.general_info,
      sections.financials,
      sections.deductibles,
      input.insuranceCategory,
    );
    agentLogs.push({
      role: 'financial',
      model: getAgentConfig('financial').modelId,
      durationMs: Date.now() - start,
      promptTokens: 0,
      completionTokens: 0,
      success: true,
    });
    return result;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Financial failed';
    agentLogs.push({
      role: 'financial',
      model: getAgentConfig('financial').modelId,
      durationMs: Date.now() - start,
      promptTokens: 0,
      completionTokens: 0,
      success: false,
      error: msg,
    });
    throw error;
  }
}
