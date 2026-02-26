// src/lib/prompts/strategies/yaml-serializer.ts
/**
 * YAML Serializer — Token-Efficient Brief Data Formatter
 *
 * Converts sanitized categoryData into compact YAML using `js-yaml`.
 * YAML is ~25-40% more token-efficient than JSON for flat key-value data
 * while remaining human-readable for the LLM.
 *
 * @module prompts/strategies/yaml-serializer
 */

import yaml from 'js-yaml';
import type { FieldLabelMap } from './types';

// ─── Currency Formatting ─────────────────────────────────────────────────────

/**
 * Formats a numeric value with thousand separators and optional currency suffix.
 * Example: 500000000 + 'COP' → '500.000.000 COP'
 */
function formatCurrency(value: number, currency?: string): string {
  // Use dot as thousand separator (LatAm convention)
  const formatted = new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(value);

  return currency ? `${formatted} ${currency}` : formatted;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export interface YamlSerializerOptions {
  /** Budget currency from CaseBrief (default: 'COP') */
  currency?: string;
  /** Field IDs that represent monetary values (formatted with currency) */
  currencyFields?: Set<string>;
}

/**
 * Serializes sanitized categoryData into a compact YAML string with
 * human-readable labels suitable for LLM prompt injection.
 *
 * @param data        - Sanitized categoryData (post-PII filtering)
 * @param fieldLabels - Map of field IDs → Spanish labels from the strategy
 * @param options     - Currency and formatting options
 * @returns           - YAML string, or empty string if no data
 *
 * @example
 * ```
 * const yamlStr = serializeBriefDataToYaml(
 *   { rva_edificio: 500000000, ubicaciones: 'Bogotá (dirección protegida)' },
 *   { rva_edificio: 'Valor Asegurado — Edificio', ubicaciones: 'Ubicaciones' },
 *   { currency: 'COP', currencyFields: new Set(['rva_edificio']) }
 * );
 * // Result:
 * // Valor Asegurado — Edificio: 500.000.000 COP
 * // Ubicaciones: Bogotá (dirección protegida)
 * ```
 */
export function serializeBriefDataToYaml(
  data: Record<string, string | number | boolean | string[] | null>,
  fieldLabels: FieldLabelMap,
  options: YamlSerializerOptions = {},
): string {
  const entries = Object.entries(data);
  if (entries.length === 0) return '';

  const { currency = 'COP', currencyFields } = options;

  // Build a labelled object for YAML serialization
  const labelledData: Record<string, string | number | boolean> = {};

  for (const [key, value] of entries) {
    if (value === null || value === undefined) continue;

    const label = fieldLabels[key] || key; // Fallback to raw key if no label

    // Format currency fields with thousand separators + currency code
    if (typeof value === 'number' && currencyFields?.has(key)) {
      labelledData[label] = formatCurrency(value, currency);
    } else if (typeof value === 'boolean') {
      labelledData[label] = value ? 'Sí' : 'No';
    } else if (Array.isArray(value)) {
      labelledData[label] = value.join(', ');
    } else {
      labelledData[label] = value;
    }
  }

  // Use js-yaml with flow style disabled for maximum readability
  return yaml.dump(labelledData, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false, // Preserve insertion order (strategy-defined)
    quotingType: '\'',
    forceQuotes: false,
  }).trim();
}

// ─── Brief Summary Helper ────────────────────────────────────────────────────

/**
 * Produces a one-line summary of briefData for brief_update mode.
 * Example: "Edificio: $500M, Maquinaria: $200M, 3 ubicaciones"
 */
export function summarizeBriefData(
  data: Record<string, string | number | boolean | string[] | null>,
  fieldLabels: FieldLabelMap,
  options: YamlSerializerOptions = {},
): string {
  const entries = Object.entries(data);
  if (entries.length === 0) return 'Sin datos específicos del ramo.';

  const { currency = 'COP', currencyFields } = options;
  const parts: string[] = [];

  for (const [key, value] of entries) {
    if (value === null || value === undefined) continue;

    const shortLabel = (fieldLabels[key] || key)
      .replace(/Valor Asegurado\s*[—–-]\s*/i, '')
      .replace(/Insurable Value\s*[—–-]\s*/i, '');

    if (typeof value === 'number' && currencyFields?.has(key)) {
      parts.push(`${shortLabel}: ${formatCurrency(value, currency)}`);
    } else if (typeof value === 'boolean') {
      parts.push(`${shortLabel}: ${value ? 'Sí' : 'No'}`);
    } else if (Array.isArray(value) && value.length > 0) {
      parts.push(`${shortLabel}: ${value.join(', ')}`);
    } else if (typeof value === 'string' && value.trim()) {
      // Truncate long text values for summary
      const truncated = value.length > 40 ? `${value.slice(0, 37)}…` : value;
      parts.push(`${shortLabel}: ${truncated}`);
    }
  }

  return parts.length > 0 ? parts.join(' | ') : 'Sin datos específicos del ramo.';
}
