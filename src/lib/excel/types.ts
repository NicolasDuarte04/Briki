// src/lib/excel/types.ts
/**
 * Type definitions for the Excel Matrix Export feature.
 *
 * These types decouple the Excel generation engine from any specific
 * insurance category, keeping the ExcelBuilderService fully generic.
 *
 * @module excel/types
 */

// ─── Matrix Definition ───────────────────────────────────────────────────────

/**
 * Describes the structure of a comparison matrix for a specific insurance category.
 *
 * Each `secciones` key is a section header (e.g. "COBERTURAS_PRINCIPALES")
 * and its value is an ordered array of row labels that MUST appear in the
 * exported Excel, even if the AI omitted them during alignment.
 *
 * `matrizCompleta` is the flat union of all sections, used for quick lookups.
 */
export interface MatrixDefinition {
  /** Human-readable category label (e.g. "Todo Riesgo Daños Materiales") */
  readonly categoryLabel: string;
  /** Category ID matching InsuranceCategoryId (e.g. "trdm") */
  readonly categoryId: string;
  /** Ordered sections: key = section header, value = row labels */
  readonly secciones: Readonly<Record<string, readonly string[]>>;
  /** Flat array of ALL row labels across all sections (for quick matching) */
  readonly matrizCompleta: readonly string[];
}

// ─── Excel Builder Options ───────────────────────────────────────────────────

/**
 * Options passed to the ExcelBuilderService for customizing output.
 */
export interface ExcelBuildOptions {
  /** Locale for headers and labels ('es' | 'en') */
  locale: 'es' | 'en';
  /** Organization name for the report header */
  orgName?: string | undefined;
  /** Case / project name for the report header */
  caseName?: string | undefined;
  /** Insurance category label for the report header */
  categoryLabel?: string | undefined;
  /** Date string for the report header (ISO 8601) */
  date?: string | undefined;
}

// ─── Section Header Labels (i18n) ────────────────────────────────────────────

/**
 * Maps internal section keys (e.g. "COBERTURAS_PRINCIPALES") to
 * human-readable labels per locale.
 *
 * If a section key isn't found in this map, the builder will
 * format it automatically: replace underscores, title-case.
 */
export const SECTION_HEADER_LABELS: Record<string, Record<'es' | 'en', string>> = {
  VALORES_ASEGURADOS: { es: 'Valores Asegurados', en: 'Insured Values' },
  COBERTURAS_PRINCIPALES: { es: 'Coberturas Principales', en: 'Main Coverages' },
  AMPAROS_ADICIONALES: { es: 'Amparos Adicionales', en: 'Additional Coverages' },
  CLAUSULAS_ADICIONALES: { es: 'Cláusulas Adicionales', en: 'Additional Clauses' },
  NOTAS_ACLARATORIAS: { es: 'Notas Aclaratorias', en: 'Clarification Notes' },
  EXCLUSIONES_PRINCIPALES: { es: 'Exclusiones Principales', en: 'Main Exclusions' },
  LIMITES_A_VALOR_TOTAL: { es: 'Límites a Valor Total', en: 'Full Value Limits' },
  LIMITES_A_PRIMER_RIESGO: { es: 'Límites a Primer Riesgo', en: 'First Risk Limits' },
  AMPAROS_BASICOS_Y_LIMITES: { es: 'Amparos Básicos y Límites', en: 'Basic Coverages & Limits' },
  AMPAROS_PREDIOS_Y_OPERACIONES: { es: 'Amparos Predios y Operaciones', en: 'Premises & Operations Coverages' },
  AMPAROS_ESPECIALIZADOS: { es: 'Amparos Especializados', en: 'Specialized Coverages' },
  VALORES_Y_MODALIDAD: { es: 'Valores y Modalidad', en: 'Values & Mode' },
  NOTAS_ACLARATORIAS_Y_GARANTIAS: { es: 'Notas Aclaratorias y Garantías', en: 'Notes & Warranties' },
  EXCLUSIONES_ESPECIFICAS: { es: 'Exclusiones Específicas', en: 'Specific Exclusions' },
  LIMITES_Y_OBJETO: { es: 'Límites y Objeto', en: 'Limits & Scope' },
  NOTAS_ACLARATORIAS_Y_METODOLOGIA: { es: 'Notas Aclaratorias y Metodología', en: 'Notes & Methodology' },
  EVENTOS_CUBIERTOS: { es: 'Eventos Cubiertos', en: 'Covered Events' },
  VALORES_ASEGURADOS_Y_LIMITES: { es: 'Valores Asegurados y Límites', en: 'Insured Values & Limits' },
  AMPAROS_ADICIONALES_Y_ASISTENCIAS: { es: 'Amparos Adicionales y Asistencias', en: 'Additional Coverages & Assistance' },
  NOTAS_ACLARATORIAS_Y_EXCLUSIONES: { es: 'Notas Aclaratorias y Exclusiones', en: 'Notes & Exclusions' },
  LIMITES_Y_CONDICIONES_GENERALES: { es: 'Límites y Condiciones Generales', en: 'Limits & General Conditions' },
  COBERTURAS_HOSPITALARIAS: { es: 'Coberturas Hospitalarias', en: 'Hospital Coverages' },
  COBERTURAS_AMBULATORIAS: { es: 'Coberturas Ambulatorias', en: 'Outpatient Coverages' },
  MATERNIDAD_Y_RECIEN_NACIDO: { es: 'Maternidad y Recién Nacido', en: 'Maternity & Newborn' },
  TRATAMIENTOS_ESPECIALES_Y_CATASTROFICOS: { es: 'Tratamientos Especiales y Catastróficos', en: 'Special & Catastrophic Treatments' },
  CARENCIAS_Y_PREEXISTENCIAS: { es: 'Carencias y Preexistencias', en: 'Waiting Periods & Pre-existing Conditions' },
  COBERTURA_BASICA: { es: 'Cobertura Básica', en: 'Basic Coverage' },
  AMPAROS_POR_ACCIDENTE: { es: 'Amparos por Accidente', en: 'Accident Coverages' },
  BENEFICIOS_EN_VIDA: { es: 'Beneficios en Vida', en: 'Living Benefits' },
  ASISTENCIAS_Y_BENEFICIOS: { es: 'Asistencias y Beneficios', en: 'Assistance & Benefits' },
  CONDICIONES_Y_RENOVACION: { es: 'Condiciones y Renovación', en: 'Conditions & Renewal' },
  EXCLUSIONES_Y_CARENCIAS: { es: 'Exclusiones y Carencias', en: 'Exclusions & Waiting Periods' },
};

/**
 * Resolves a human-readable section header from its internal key.
 * Falls back to title-casing the key if no translation exists.
 */
export function resolveSectionLabel(sectionKey: string, locale: 'es' | 'en'): string {
  const mapped = SECTION_HEADER_LABELS[sectionKey];
  if (mapped) return mapped[locale];

  // Fallback: replace underscores, title-case
  return sectionKey
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
