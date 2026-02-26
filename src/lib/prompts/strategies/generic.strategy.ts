// src/lib/prompts/strategies/generic.strategy.ts
/**
 * Generic (Fallback) Strategy — Provides baseline domain context
 * for any insurance category that doesn't have a dedicated
 * `.strategy.ts` file yet.
 *
 * This strategy dynamically reads from CATEGORY_DEFINITIONS to
 * infer field labels, currency fields, and PII classifications.
 * As specific strategies are authored (with expert ontology), they
 * will supersede this fallback via the StrategyRegistry.
 *
 * @module prompts/strategies/generic.strategy
 */

import {
  CATEGORY_DEFINITIONS,
  getCategoryDef,
  type InsuranceCategoryId,
} from '@/lib/insurance-categories';
import type {
  CategoryStrategy,
  FieldLabelMap,
  PiiClassification,
} from './types';

// ─── PII Heuristics ──────────────────────────────────────────────────────────

/**
 * PII field-ID patterns and their classification.
 * The generic strategy uses these heuristics because it lacks
 * domain-specific knowledge about each field.
 */
const PII_PATTERNS: [RegExp, PiiClassification][] = [
  // Redact: identifiers, plates, documents
  [/\b(placa|cedula|nit|pasaporte|documento|rut)\b/i, 'redact'],
  // Mask: addresses, locations, medical info
  [/\b(ubicacion|direccion|domicilio)\b/i, 'mask'],
  [/\b(preexistencia|medica|diagnostico|condicion)\b/i, 'mask'],
  // Safe: everything else (values, years, counts, types, booleans)
];

/**
 * Label-inference patterns: converts snake_case field IDs into
 * readable Spanish labels.
 */
const LABEL_OVERRIDES: Record<string, string> = {
  // TRDM
  rva_edificio: 'Valor Asegurado — Edificio',
  rva_muebles: 'Valor Asegurado — Muebles y Enseres',
  rva_maquinaria: 'Valor Asegurado — Maquinaria',
  rva_equipo_electronico: 'Valor Asegurado — Equipo Electrónico',
  rva_dinero_caja: 'Valor Asegurado — Dinero en Caja Fuerte',
  ubicaciones: 'Ubicaciones del Riesgo',
  anio_construccion: 'Año de Construcción',

  // RCE
  limite_asegurado: 'Límite Asegurado',
  ingresos_anuales: 'Ingresos Anuales',
  valor_nomina_anual: 'Valor Nómina Anual',

  // Transporte
  presupuesto_anual_movilizado: 'Presupuesto Anual Movilizado',
  limite_maximo_despacho: 'Límite Máximo por Despacho',
  tipo_mercancia: 'Tipo de Mercancía',

  // Riesgos Financieros
  limite_indemnizacion: 'Límite de Indemnización',
  empleados_manejo_dinero: 'Empleados con Manejo de Dinero',
  tiene_auditorias: '¿Tiene Auditorías Periódicas?',

  // Flota
  numero_vehiculos_pesados: 'Vehículos Pesados (cantidad)',
  numero_vehiculos_livianos_flota: 'Vehículos Livianos en Flota (cantidad)',

  // Vehículos Livianos
  placa: 'Placa',
  marca_linea: 'Marca y Línea',
  modelo_anio: 'Modelo / Año',
  valor_asegurado_vehiculo: 'Valor Asegurado del Vehículo',

  // Accidentes Personales
  limite_muerte_accidental: 'Límite — Muerte Accidental',
  limite_desmembracion: 'Límite — Desmembración',
  limite_gastos_medicos: 'Límite — Gastos Médicos',
  limite_renta_hospitalizacion: 'Límite — Renta por Hospitalización',
  ocupacion_asegurado: 'Ocupación del Asegurado',

  // Hogar
  valor_edificacion: 'Valor de la Edificación',
  valor_muebles_enseres: 'Valor de Muebles y Enseres',
  ubicacion_inmueble: 'Ubicación del Inmueble',
  tipo_vivienda: 'Tipo de Vivienda',
  estado_tenencia: 'Estado de Tenencia',

  // Salud
  edades_grupo_familiar: 'Edades del Grupo Familiar',
  preexistencias_medicas: 'Preexistencias Médicas',
  nivel_acceso_medico: 'Nivel de Acceso Médico',

  // Vida
  valor_asegurado_fallecimiento: 'Valor Asegurado por Fallecimiento',
  edad_asegurado: 'Edad del Asegurado',
  genero_biologico: 'Género Biológico',
  fumador: '¿Fumador?',
  amparos_adicionales: 'Amparos Adicionales Solicitados',
};

// ─── Label Inference ─────────────────────────────────────────────────────────

function inferLabel(fieldId: string): string {
  if (LABEL_OVERRIDES[fieldId]) return LABEL_OVERRIDES[fieldId];

  // Fallback: humanise snake_case
  return fieldId
    .replace(/_/g, ' ')
    .replace(/\brva\b/gi, 'Valor Asegurado')
    .replace(/\brc\b/gi, 'Responsabilidad Civil')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Generic Strategy Class ──────────────────────────────────────────────────

export class GenericStrategy implements CategoryStrategy {
  readonly categoryId: string;
  readonly categoryLabel: string;

  private readonly resolvedCategoryId: InsuranceCategoryId | null;

  constructor(categoryId?: string) {
    this.categoryId = categoryId ?? 'generic';
    const def = categoryId
      ? getCategoryDef(categoryId)
      : undefined;
    this.resolvedCategoryId = def ? (categoryId as InsuranceCategoryId) : null;
    this.categoryLabel = this.resolvedCategoryId
      ? this.buildCategoryLabel(this.resolvedCategoryId)
      : 'Seguro General';
  }

  // ── Domain Knowledge ──────────────────────────────────────────────

  getDomainContext(): string {
    const catLabel = this.categoryLabel;
    return `Estás analizando una póliza del ramo **${catLabel}** en el mercado colombiano.
Aplica principios generales de seguros y buenas prácticas de suscripción:
- Verifica que las sumas aseguradas sean consistentes con los valores declarados en el brief.
- Revisa deducibles, sublímites y exclusiones relevantes.
- Evalúa si las coberturas ofrecidas se ajustan al perfil de riesgo del cliente.
- Identifica coberturas faltantes comparando contra las coberturas sugeridas del ramo.
- Si hay datos del formulario, úsalos para personalizar el análisis (montos, activos, etc.).

Nota: Este es un análisis genérico. Cuando se implemente la estrategia especializada
para este ramo, recibirás conocimiento experto adicional (regulación, prácticas de
mercado, umbrales de infraseguro).`;
  }

  getAnalysisChecklist(): string[] {
    const base = [
      'Verificar coincidencia entre sumas aseguradas de la póliza y valores declarados en el brief',
      'Revisar deducibles y sublímites para cada cobertura principal',
      'Identificar exclusiones relevantes que podrían afectar al asegurado',
      'Evaluar si el periodo de vigencia y cláusulas de renovación son adecuados',
      'Comparar coberturas ofrecidas vs. coberturas típicas del ramo',
    ];

    // Add category-specific items from suggestedCoverages
    if (this.resolvedCategoryId) {
      const def = CATEGORY_DEFINITIONS[this.resolvedCategoryId];
      if (def.suggestedCoverages.length > 0) {
        base.push(
          `Verificar presencia de coberturas clave del ramo: ${def.suggestedCoverages
            .slice(0, 5)
            .map((c) => c.replace(/_/g, ' '))
            .join(', ')}`,
        );
      }
    }

    return base;
  }

  getInfraseguroRules(): string {
    return `**Reglas de Infraseguro (Genéricas)**
- Si la suma asegurada es significativamente menor al valor declarado en el brief → alerta de infraseguro.
- Si los deducibles superan el 5% del valor asegurado → señalar como deducible elevado.
- Si faltan coberturas que son estándar para el ramo → señalar como gap de cobertura.
- Si la relación prima/suma asegurada parece anormalmente baja → posible sublimitación oculta.`;
  }

  getRegulatoryNotes(): string {
    return `**Notas Regulatorias (Generales — Colombia)**
- Todas las pólizas deben cumplir con la regulación de la Superintendencia Financiera de Colombia.
- Los intermediarios deben seguir lineamientos de Fasecolda donde aplique.
- Verificar que los amparos cumplan con la legislación vigente para el tipo de riesgo.`;
  }

  // ── Data Formatting ───────────────────────────────────────────────

  getFieldLabels(): FieldLabelMap {
    const labels: FieldLabelMap = {};
    if (this.resolvedCategoryId) {
      const def = CATEGORY_DEFINITIONS[this.resolvedCategoryId];
      for (const field of def.fields) {
        labels[field.id] = inferLabel(field.id);
      }
    }
    return labels;
  }

  getPiiClassification(): Record<string, PiiClassification> {
    const result: Record<string, PiiClassification> = {};
    if (this.resolvedCategoryId) {
      const def = CATEGORY_DEFINITIONS[this.resolvedCategoryId];
      for (const field of def.fields) {
        const matched = PII_PATTERNS.find(([re]) => re.test(field.id));
        result[field.id] = matched ? matched[1] : 'safe';
      }
    }
    return result;
  }

  // ── Extraction Schema ─────────────────────────────────────────────

  getExtractionSchema(): null {
    // Generic strategy has no specialised extraction schema.
    // Specific strategies (trdm, rce, salud…) override this with Zod schemas.
    return null;
  }

  // ── Comparison ────────────────────────────────────────────────────

  getComparisonPriorities(): string[] {
    return [
      'Suma asegurada total',
      'Deducibles por cobertura',
      'Exclusiones principales',
      'Prima total',
      'Coberturas adicionales incluidas',
    ];
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private buildCategoryLabel(catId: InsuranceCategoryId): string {
    const LABELS: Partial<Record<InsuranceCategoryId, string>> = {
      trdm: 'Todo Riesgo Daño Material (TRDM)',
      rce: 'Responsabilidad Civil Extracontractual (RCE)',
      transporte: 'Transporte de Mercancías',
      riesgos_financieros: 'Riesgos Financieros',
      flota: 'Flota Vehicular',
      vehiculos_livianos: 'Vehículos Livianos',
      accidentes_personales: 'Accidentes Personales',
      hogar: 'Hogar',
      salud: 'Salud / Medicina Prepagada',
      vida: 'Vida Individual',
    };
    return LABELS[catId] ?? catId.replace(/_/g, ' ');
  }
}
