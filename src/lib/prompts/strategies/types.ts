// src/lib/prompts/strategies/types.ts
/**
 * Core interfaces for the Dispatcher & Strategy Pattern.
 *
 * Every insurance category (trdm, rce, salud, vida …) implements
 * `CategoryStrategy` so the prompt engine can inject domain-specific
 * knowledge while keeping the orchestrator generic.
 *
 * @module prompts/strategies/types
 */

import type { InsuranceCategoryId } from '@/lib/insurance-categories';
import type { z } from 'zod';

// ─── PII Classification ──────────────────────────────────────────────────────

/**
 * Determines how a categoryData field is treated before being sent to the LLM.
 *
 * - `safe`   – value is injected as-is (e.g. insured amounts, year).
 * - `mask`   – value is generalised (address → city only, pre-existing → yes/no).
 * - `redact` – value is **completely omitted** (NIT, cédula, full plate number).
 */
export type PiiClassification = 'safe' | 'mask' | 'redact';

// ─── Field Label Map ─────────────────────────────────────────────────────────

/**
 * Maps a categoryData key (e.g. `rva_edificio`) to a human-readable label
 * used in the serialized YAML block inside the prompt.
 *
 * Labels are always in **Spanish** because the prompt targets the LatAm
 * insurance market and all source documents are in Spanish.
 */
export type FieldLabelMap = Record<string, string>;

// ─── Category Strategy ───────────────────────────────────────────────────────

export interface CategoryStrategy {
  /** Must match an InsuranceCategoryId or 'generic' */
  readonly categoryId: string;

  /** Human-readable category name for the prompt heading (Spanish) */
  readonly categoryLabel: string;

  // ── Domain knowledge ────────────────────────────────────────────────

  /**
   * Domain context paragraph injected into the prompt.
   * Contains specialised insurance knowledge for this category
   * (regulatory frameworks, typical structures, key concepts).
   *
   * Budget: ≤ 800 tokens.
   */
  getDomainContext(): string;

  /**
   * Ordered checklist items the LLM **must** verify during analysis.
   * Rendered as a numbered list in the prompt.
   */
  getAnalysisChecklist(): string[];

  /**
   * Rules for detecting under-insurance or coverage gaps.
   * Injected in modes: baseline_analysis, comparison, qa, individual_analysis.
   */
  getInfraseguroRules(): string;

  /**
   * Applicable regulatory notes (Fasecolda, POS/PBS, Ley 1562, etc.).
   */
  getRegulatoryNotes(): string;

  // ── Data formatting ─────────────────────────────────────────────────

  /**
   * Returns a map of field IDs → Spanish labels for use in YAML output.
   * Must cover **every** field defined in the category's `CATEGORY_DEFINITIONS`.
   */
  getFieldLabels(): FieldLabelMap;

  /**
   * Returns the PII classification for **every** field in the category.
   * Fields not listed default to `'safe'`.
   */
  getPiiClassification(): Record<string, PiiClassification>;

  // ── Structured extraction (Zod) ─────────────────────────────────────

  /**
   * Returns a Zod schema describing the structured data the LLM should
   * extract from documents of this insurance category.
   *
   * Returns `null` when no specialised schema exists (generic fallback).
   * Specific strategies provide rich schemas modeling rate matrices,
   * deductible structures, coverage tables, etc.
   */
  getExtractionSchema(): z.ZodType | null;

  // ── Comparison support (Phase 2+) ──────────────────────────────────

  /**
   * Coverage/financial aspects the comparison engine should prioritise
   * when aligning policies of this category.
   */
  getComparisonPriorities(): string[];
}

// ─── Analysis Reason Context ─────────────────────────────────────────────────

/**
 * Maps the analysis_reason value from the case brief to contextual
 * instructions that shape the agent's tone and focus.
 */
export const ANALYSIS_REASON_CONTEXTS: Record<string, string> = {
  primera_vez: `
**Motivo del análisis: PRIMERA VEZ**
El cliente NO tiene póliza previa en este ramo. Tu enfoque debe ser:
- Educativo: explica conceptos y terminología de forma accesible
- Exhaustivo: detalla coberturas principales y exclusiones relevantes
- Orientado a necesidades: vincula cada cobertura con el perfil del cliente
- Precavido: señala gaps comunes para quienes adquieren este seguro por primera vez`,

  renovacion: `
**Motivo del análisis: RENOVACIÓN**
El cliente ya tiene una póliza vigente o vencida que desea renovar. Tu enfoque debe ser:
- Comparativo: contrasta condiciones actuales vs. propuestas de renovación
- Orientado a cambios: destaca cualquier modificación en primas, deducibles o coberturas
- Alerta temprana: identifica coberturas que se hayan eliminado o reducido
- Historial: considera la experiencia siniestral si hay datos disponibles`,

  benchmarking: `
**Motivo del análisis: BENCHMARKING**
El cliente quiere evaluar opciones del mercado para obtener mejores condiciones. Tu enfoque debe ser:
- Competitivo: prioriza diferencias de precio y cobertura entre opciones
- Táctico: identifica las fortalezas y debilidades de cada aseguradora
- Negociación: señala puntos donde el broker puede negociar mejoras
- Objetivo: evita sesgo hacia una aseguradora, presenta datos duros`,

  reclamo: `
**Motivo del análisis: RECLAMO / SINIESTRO**
El cliente tiene un siniestro activo o reciente. Tu enfoque debe ser:
- Preciso: identifica las coberturas exactas que aplican al tipo de siniestro
- Deducibles: calcula claramente cuánto debe asumir el asegurado
- Exclusiones: verifica que el evento no caiga en exclusiones
- Procedimiento: menciona plazos y proceso de reclamación si están en el documento`,

  auditoria: `
**Motivo del análisis: AUDITORÍA**
El cliente realiza una revisión integral de su programa de seguros. Tu enfoque debe ser:
- Sistemático: revisa cada cobertura contra los activos y riesgos del brief
- Gaps: identifica riesgos no cubiertos o sub-asegurados
- Cumplimiento: verifica requisitos regulatorios del sector
- Recomendaciones: sugiere mejoras concretas con estimaciones cuando sea posible`,
};
