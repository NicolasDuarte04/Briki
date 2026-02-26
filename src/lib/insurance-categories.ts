/**
 * Insurance Categories — Data-driven definitions for the Case creation form.
 *
 * Each category defines:
 *  - Which subjectType it belongs to (client | company)
 *  - Dynamic fields to render (with type, constraints, currency flag)
 *  - Suggested coverages (pre-defined chips the user can toggle)
 *
 * All user-facing strings are i18n keys resolved via
 * `useTranslations('workspace.caseBrief')`.
 *
 * @module lib/insurance-categories
 */

// ─── Analysis Reasons ────────────────────────────────────────────────────────

export const ANALYSIS_REASONS = [
  'primera_vez',
  'renovacion',
  'benchmarking',
  'reclamo',
  'auditoria',
] as const;

export type AnalysisReason = (typeof ANALYSIS_REASONS)[number];

// ─── Category IDs ────────────────────────────────────────────────────────────

export const COMPANY_CATEGORIES = [
  'trdm',
  'rce',
  'transporte',
  'riesgos_financieros',
  'flota',
] as const;

export const CLIENT_CATEGORIES = [
  'vehiculos_livianos',
  'accidentes_personales',
  'hogar',
  'salud',
  'vida',
] as const;

export type CompanyCategoryId = (typeof COMPANY_CATEGORIES)[number];
export type ClientCategoryId = (typeof CLIENT_CATEGORIES)[number];
export type InsuranceCategoryId = CompanyCategoryId | ClientCategoryId;

// ─── Field Definition ────────────────────────────────────────────────────────

export type CategoryFieldType = 'number' | 'text' | 'boolean' | 'select' | 'textarea';

export interface CategoryFieldDef {
  /** Unique field id — also used as the key in categoryData and as the i18n suffix */
  id: string;
  type: CategoryFieldType;
  required?: boolean;
  /** Minimum (for number fields) */
  min?: number;
  /** Maximum (for number fields) */
  max?: number;
  step?: number;
  /** If true, render with currency context (COP/USD) */
  isCurrency?: boolean;
  /** Options for 'select' type */
  options?: { value: string; labelKey: string }[];
}

// ─── Category Definition ─────────────────────────────────────────────────────

export interface InsuranceCategoryDef {
  id: InsuranceCategoryId;
  subjectType: 'client' | 'company';
  /** Dynamic form fields specific to this category */
  fields: CategoryFieldDef[];
  /** Suggested coverage keys (i18n: suggestedCoverages.<categoryId>.<key>) */
  suggestedCoverages: string[];
}

// ─── All Category Definitions ────────────────────────────────────────────────

export const CATEGORY_DEFINITIONS: Record<InsuranceCategoryId, InsuranceCategoryDef> = {

  // ═══════════════════════════════════════════════════════════════════════════
  // CORPORATE (subjectType: 'company')
  // ═══════════════════════════════════════════════════════════════════════════

  trdm: {
    id: 'trdm',
    subjectType: 'company',
    fields: [
      { id: 'rva_edificio', type: 'number', isCurrency: true },
      { id: 'rva_muebles', type: 'number', isCurrency: true },
      { id: 'rva_maquinaria', type: 'number', isCurrency: true },
      { id: 'rva_equipo_electronico', type: 'number', isCurrency: true },
      { id: 'rva_dinero_caja', type: 'number', isCurrency: true },
      { id: 'ubicaciones', type: 'textarea' },
      { id: 'anio_construccion', type: 'number', min: 1900, max: 2030 },
    ],
    suggestedCoverages: [
      'incendio',
      'terremoto',
      'sustraccion',
      'danios_agua',
      'rotura_maquinaria',
      'equipos_electronicos',
    ],
  },

  rce: {
    id: 'rce',
    subjectType: 'company',
    fields: [
      { id: 'limite_asegurado', type: 'number', isCurrency: true },
      { id: 'ingresos_anuales', type: 'number', isCurrency: true },
      { id: 'valor_nomina_anual', type: 'number', isCurrency: true },
    ],
    suggestedCoverages: [
      'rc_general',
      'rc_patronal',
      'rc_productos',
      'rc_contratistas',
    ],
  },

  transporte: {
    id: 'transporte',
    subjectType: 'company',
    fields: [
      { id: 'presupuesto_anual_movilizado', type: 'number', isCurrency: true },
      { id: 'limite_maximo_despacho', type: 'number', isCurrency: true },
      { id: 'tipo_mercancia', type: 'text' },
    ],
    suggestedCoverages: [
      'danio_accidente',
      'hurto_mercancia',
      'faltante',
      'averia_particular',
      'mojadura',
    ],
  },

  riesgos_financieros: {
    id: 'riesgos_financieros',
    subjectType: 'company',
    fields: [
      { id: 'limite_indemnizacion', type: 'number', isCurrency: true },
      { id: 'empleados_manejo_dinero', type: 'number', min: 0 },
      { id: 'tiene_auditorias', type: 'boolean' },
    ],
    suggestedCoverages: [
      'infidelidad_empleados',
      'falsificacion',
      'robo_dinero',
      'fraude_informatico',
    ],
  },

  flota: {
    id: 'flota',
    subjectType: 'company',
    fields: [
      { id: 'numero_vehiculos_pesados', type: 'number', min: 0 },
      { id: 'numero_vehiculos_livianos_flota', type: 'number', min: 0 },
    ],
    suggestedCoverages: [
      'rc_vehicular',
      'perdida_total_danios',
      'perdida_total_hurto',
      'perdida_parcial',
      'asistencia_vehicular',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSONAL (subjectType: 'client')
  // ═══════════════════════════════════════════════════════════════════════════

  vehiculos_livianos: {
    id: 'vehiculos_livianos',
    subjectType: 'client',
    fields: [
      { id: 'placa', type: 'text' },
      { id: 'marca_linea', type: 'text' },
      { id: 'modelo_anio', type: 'number', min: 1990, max: 2030 },
      { id: 'valor_asegurado_vehiculo', type: 'number', isCurrency: true },
    ],
    suggestedCoverages: [
      'rc_obligatorio',
      'perdida_total_danios_auto',
      'perdida_total_hurto_auto',
      'perdida_parcial_danios_auto',
      'perdida_parcial_hurto_auto',
      'terremoto_vehiculo',
      'asistencia_vehicular_auto',
      'accidentes_personales_vehiculo',
    ],
  },

  accidentes_personales: {
    id: 'accidentes_personales',
    subjectType: 'client',
    fields: [
      { id: 'limite_muerte_accidental', type: 'number', isCurrency: true },
      { id: 'limite_desmembracion', type: 'number', isCurrency: true },
      { id: 'limite_gastos_medicos', type: 'number', isCurrency: true },
      { id: 'limite_renta_hospitalizacion', type: 'number', isCurrency: true },
      { id: 'ocupacion_asegurado', type: 'text' },
    ],
    suggestedCoverages: [
      'muerte_accidental',
      'desmembracion',
      'incapacidad_total_permanente',
      'gastos_medicos',
      'gastos_traslado',
      'renta_hospitalizacion',
    ],
  },

  hogar: {
    id: 'hogar',
    subjectType: 'client',
    fields: [
      { id: 'valor_edificacion', type: 'number', isCurrency: true },
      { id: 'valor_muebles_enseres', type: 'number', isCurrency: true },
      { id: 'ubicacion_inmueble', type: 'text' },
      {
        id: 'tipo_vivienda',
        type: 'select',
        options: [
          { value: 'casa', labelKey: 'casa' },
          { value: 'apartamento', labelKey: 'apartamento' },
        ],
      },
      {
        id: 'estado_tenencia',
        type: 'select',
        options: [
          { value: 'propietario', labelKey: 'propietario' },
          { value: 'arrendatario', labelKey: 'arrendatario' },
        ],
      },
    ],
    suggestedCoverages: [
      'incendio_hogar',
      'terremoto_hogar',
      'sustraccion_hogar',
      'danios_agua_hogar',
      'rc_familiar',
      'asistencia_domiciliaria',
    ],
  },

  salud: {
    id: 'salud',
    subjectType: 'client',
    fields: [
      { id: 'edades_grupo_familiar', type: 'text' },
      { id: 'preexistencias_medicas', type: 'textarea' },
      {
        id: 'nivel_acceso_medico',
        type: 'select',
        options: [
          { value: 'nacional', labelKey: 'nacional' },
          { value: 'internacional', labelKey: 'internacional' },
          { value: 'red_especifica', labelKey: 'red_especifica' },
        ],
      },
    ],
    suggestedCoverages: [
      'hospitalizacion',
      'cirugia',
      'maternidad',
      'dental',
      'optica',
      'medicamentos',
      'consulta_medica',
    ],
  },

  vida: {
    id: 'vida',
    subjectType: 'client',
    fields: [
      { id: 'valor_asegurado_fallecimiento', type: 'number', isCurrency: true },
      { id: 'edad_asegurado', type: 'number', min: 0, max: 120 },
      {
        id: 'genero_biologico',
        type: 'select',
        options: [
          { value: 'masculino', labelKey: 'masculino' },
          { value: 'femenino', labelKey: 'femenino' },
        ],
      },
      { id: 'fumador', type: 'boolean' },
      { id: 'amparos_adicionales', type: 'textarea' },
    ],
    suggestedCoverages: [
      'fallecimiento',
      'incapacidad_total',
      'enfermedades_graves',
      'exencion_primas',
    ],
  },
};

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Returns the list of category IDs applicable for the given subject type.
 */
export function getCategoriesForSubjectType(
  subjectType: 'client' | 'company',
): readonly string[] {
  return subjectType === 'company' ? COMPANY_CATEGORIES : CLIENT_CATEGORIES;
}

/**
 * Returns the full definition for a category, or undefined if not found.
 */
export function getCategoryDef(
  categoryId: string,
): InsuranceCategoryDef | undefined {
  return CATEGORY_DEFINITIONS[categoryId as InsuranceCategoryId];
}

/**
 * Checks if a category ID is valid for the given subject type.
 */
export function isCategoryValidForSubjectType(
  categoryId: string,
  subjectType: 'client' | 'company',
): boolean {
  const validCategories = getCategoriesForSubjectType(subjectType);
  return validCategories.includes(categoryId);
}

// ─── Validation Helpers ──────────────────────────────────────────────────────

/**
 * All valid insurance category IDs (both company and client).
 * Useful for server-side enum validation.
 */
export const VALID_CATEGORY_IDS: readonly string[] = [
  ...COMPANY_CATEGORIES,
  ...CLIENT_CATEGORIES,
] as const;

/**
 * Checks if a string is a valid insurance category ID.
 * Use for server-side validation before persisting.
 */
export function isValidInsuranceCategory(value: string | null | undefined): boolean {
  if (!value) return false;
  return (VALID_CATEGORY_IDS as readonly string[]).includes(value);
}
