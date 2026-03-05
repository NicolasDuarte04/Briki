/**
 * Shared type definitions for the multi-agent extraction pipeline.
 *
 * These types define the contracts between agents:
 *   Chunker  → Coverage Agent + Financial Agent
 *   Coverage Agent + Financial Agent → Merger Agent
 *   Merger Agent → normalizeAnalysisResult() (existing)
 *
 * @module ai/types
 */

// ─── Chunker Output ─────────────────────────────────────────────────────────

/** Keys of classified document sections. */
export type SectionKey =
  | 'general_info'
  | 'coverages'
  | 'exclusions'
  | 'financials'
  | 'deductibles'
  | 'endorsements'
  | 'claims_process';

/** All sections as string content (empty string if absent). */
export type DocumentSections = Record<SectionKey, string>;

/** Output from Agent 1 — Semantic Chunker. */
export interface ChunkedDocument {
  /** Classified text sections */
  sections: DocumentSections;
  /** Document-level metadata */
  metadata: {
    total_pages: number;
    has_tables: boolean;
    document_language: string;
    /** List of section keys that were actually found in the document */
    sections_found: SectionKey[];
  };
}

// ─── Agent Partial Outputs ───────────────────────────────────────────────────

/**
 * Hints for page mapping — lightweight references that the merger expands
 * into full PageReference objects.
 */
export interface PageHint {
  field: string;
  value: string;
  page: number;
}

/**
 * Output from Agent 2 (Coverage Extractor).
 * Maps to: coverages[], exclusions[], endorsements[], claims_process
 */
export interface CoverageAgentOutput {
  coverages: Array<{
    name?: string;
    description?: string;
    limit_amount?: number;
    limit_unit?: string;
    limit_currency?: string | null;
    limit_description?: string | null;
    sublimits?: Array<{ name: string; amount: number; unit: string }>;
    deductible_amount?: number;
    deductible_unit?: string;
    waiting_period?: number;
    confidence?: number;
  }>;
  exclusions: Array<{
    name: string;
    description?: string;
    confidence?: number;
  }>;
  endorsements: Array<{
    number?: string;
    name: string;
    description?: string;
    effective_date?: string;
    confidence?: number;
  }>;
  claims_process?: {
    phone?: string;
    email?: string;
    steps?: string[];
    time_limit_days?: number;
  };
  /** Page hints for downstream coordinate mapping */
  coverage_page_hints: PageHint[];
}

/**
 * Output from Agent 3 (Financial Extractor).
 * Maps to: insurer, policy_number, dates, financials, deductibles
 */
export interface FinancialAgentOutput {
  insurer?: {
    name?: string;
    code?: string;
    contact?: {
      phone?: string;
      email?: string;
    };
  };
  policy_number?: string;
  insured_name?: string;
  effective_from?: string;
  effective_to?: string;
  jurisdiction?: string;
  currency?: string;
  financials?: {
    premium_net?: number;
    taxes?: number;
    fees?: number;
    premium_total?: number;
  };
  deductibles: Array<{
    type: string;
    amount: number;
    unit: string;
    applies_to?: string;
    confidence?: number;
  }>;
  /** Page hints for downstream coordinate mapping */
  financial_page_hints: PageHint[];
}

// ─── Orchestrator Telemetry ──────────────────────────────────────────────────

/** Per-agent execution record for observability. */
export interface AgentTelemetryEntry {
  role: string;
  model: string;
  durationMs: number;
  promptTokens: number;
  completionTokens: number;
  success: boolean;
  error?: string;
}

/** Full pipeline telemetry — logged in audit trail. */
export interface PipelineTelemetry {
  pipeline: 'multi-agent' | 'monolithic';
  agents: AgentTelemetryEntry[];
  totalDurationMs: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
}
