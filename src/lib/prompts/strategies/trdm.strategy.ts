// src/lib/prompts/strategies/trdm.strategy.ts
/**
 * TRDM Strategy — Todo Riesgo Daños Materiales
 *
 * Estrategia especializada para pólizas de protección patrimonial
 * corporativa. Codifica la ontología completa del ramo TRDM incluyendo:
 *   - Desglose de valores asegurables (7 categorías de activos)
 *   - Estructura de coberturas (catastróficas, antrópicas, operativas)
 *   - Matemáticas de deducibles (Valor Asegurable vs. Pérdida vs. Tiempo)
 *   - Reglas de infraseguro (Principio del Valor Total + Regla Proporcional)
 *   - Esquema Zod de extracción (matrices de tasas y deducibles)
 *
 * Fuente de dominio: docs/knowledge/trdm-rules.md
 *
 * @module prompts/strategies/trdm.strategy
 */

import { z } from 'zod';
import type {
  CategoryStrategy,
  FieldLabelMap,
  PiiClassification,
} from './types';

// ═════════════════════════════════════════════════════════════════════════════
// ZOD EXTRACTION SCHEMAS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Base de cálculo para deducibles TRDM.
 * Distinción CRÍTICA que impacta el riesgo financiero del cliente:
 *   - valor_asegurable: X% del valor TOTAL del bien (catastróficos — altísimo impacto)
 *   - valor_perdida: X% del monto de la pérdida (operativos — impacto moderado)
 *   - tiempo: días/horas de franquicia (lucro cesante)
 */
const DeductibleBasisEnum = z.enum([
  'valor_asegurable',
  'valor_perdida',
  'tiempo',
]);

/**
 * Estructura de un deducible individual extraído del documento.
 */
const TrdmDeductibleSchema = z.object({
  cobertura: z.string().describe('Nombre de la cobertura (ej: Terremoto, Incendio, Rotura de Maquinaria)'),
  base_calculo: DeductibleBasisEnum.describe(
    'Base sobre la que se calcula: valor_asegurable (% del total), valor_perdida (% del siniestro), o tiempo (días/horas)'
  ),
  porcentaje: z.number().nullable().describe('Porcentaje del deducible (ej: 2 para 2%). Null si es por tiempo'),
  minimo_smmlv: z.number().nullable().describe('Mínimo en SMMLV. Null si no aplica'),
  minimo_valor: z.number().nullable().describe('Mínimo en moneda. Null si se expresa en SMMLV'),
  dias_franquicia: z.number().nullable().describe('Días de franquicia para Lucro Cesante. Null si no aplica'),
  texto_original: z.string().describe('Texto literal extraído del documento para la condición del deducible'),
});

/**
 * Línea de la matriz de tasas extraída del documento.
 */
const TrdmRateLineSchema = z.object({
  concepto: z.string().describe('Tipo de amparo (ej: Amparo Básico, Terremoto, AMIT, Sustracción)'),
  valor_asegurado: z.number().nullable().describe('Valor asegurado para este amparo'),
  tasa_por_mil: z.number().nullable().describe('Tasa en por mil (‰). Ej: 0.85 = 0.85‰'),
  prima_neta: z.number().nullable().describe('Prima neta calculada para este amparo'),
});

/**
 * Desglose de valores asegurados por categoría de activo.
 */
const TrdmAssetBreakdownSchema = z.object({
  edificios_mejoras: z.number().nullable().describe('Valor de reconstrucción de edificios y mejoras locativas'),
  muebles_enseres: z.number().nullable().describe('Mobiliario y equipo de oficina'),
  maquinaria_equipo: z.number().nullable().describe('Activos productivos industriales'),
  equipo_electronico: z.number().nullable().describe('Computadores, servidores, equipos electrónicos'),
  dineros_caja: z.number().nullable().describe('Efectivo en caja fuerte o en tránsito'),
  mercancias: z.number().nullable().describe('Materias primas, productos en proceso y terminados'),
  lucro_cesante: z.number().nullable().describe('Pérdida de beneficios brutos por paralización'),
  valor_total: z.number().describe('Suma total de todos los valores asegurados'),
});

/**
 * Cobertura individual extraída del documento TRDM.
 */
const TrdmCoverageSchema = z.object({
  nombre: z.string().describe('Nombre del amparo'),
  tipo: z.enum(['catastrofico', 'antropico', 'operativo', 'sublimite']).describe(
    'Clasificación: catastrofico (Terremoto, Inundación), antropico (HMACC, AMIT, Terrorismo), operativo (Rotura Maquinaria, Sustracción), sublimite (Gastos Extinción, Remoción Escombros)'
  ),
  limite: z.number().nullable().describe('Límite o sublímite en moneda'),
  incluido: z.boolean().describe('Si está incluido en la póliza'),
});

/**
 * Esquema raíz de extracción TRDM — combina todos los sub-esquemas.
 */
const TrdmExtractionSchema = z.object({
  // Identificación
  aseguradora: z.string().describe('Nombre de la compañía aseguradora'),
  numero_poliza: z.string().nullable().describe('Número de póliza'),
  vigencia_desde: z.string().nullable().describe('Fecha inicio vigencia (ISO 8601 o texto)'),
  vigencia_hasta: z.string().nullable().describe('Fecha fin vigencia (ISO 8601 o texto)'),
  moneda: z.string().default('COP').describe('Moneda de la póliza'),

  // Valores asegurados (desglose por activo)
  valores_asegurados: TrdmAssetBreakdownSchema.describe(
    'Desglose del valor asegurable por categoría de activo. OBLIGATORIO extraer'
  ),

  // Matriz de tasas y primas
  matriz_tasas: z.array(TrdmRateLineSchema).describe(
    'Desglose de tasas por amparo: concepto, valor asegurado, tasa (‰), prima neta'
  ),
  prima_neta_total: z.number().nullable().describe('Prima neta total'),
  iva: z.number().nullable().describe('IVA sobre la prima'),
  prima_total: z.number().nullable().describe('Prima total a pagar (neta + IVA + gastos)'),

  // Coberturas
  coberturas: z.array(TrdmCoverageSchema).describe(
    'Lista de coberturas/amparos identificados en la póliza, clasificados por tipo'
  ),

  // Deducibles (con diferenciación de base de cálculo)
  deducibles: z.array(TrdmDeductibleSchema).describe(
    'Estructura de deducibles. CRÍTICO: extraer la base de cálculo (valor_asegurable vs valor_perdida vs tiempo)'
  ),

  // Ubicaciones y cláusulas especiales
  ubicaciones_aseguradas: z.array(z.string()).describe('Direcciones/ciudades de las ubicaciones amparadas'),
  clausula_traslado_temporal: z.boolean().nullable().describe('Si incluye cláusula de traslado temporal de bienes'),
  coaseguro: z.string().nullable().describe('Detalle de coaseguro si aplica (porcentajes por aseguradora)'),
});

// ═════════════════════════════════════════════════════════════════════════════
// TRDM STRATEGY CLASS
// ═════════════════════════════════════════════════════════════════════════════

export class TrdmStrategy implements CategoryStrategy {
  readonly categoryId = 'trdm' as const;
  readonly categoryLabel = 'Todo Riesgo Daños Materiales (TRDM)';

  // ── Domain Context (Sección 3: "El Por Qué") ─────────────────────

  getDomainContext(): string {
    return `Estás analizando una póliza de **Todo Riesgo Daños Materiales (TRDM)** — la póliza fundamental de protección patrimonial corporativa en Colombia. Resguarda activos físicos tangibles (edificios, maquinaria, equipos, mercancía, dineros) contra pérdidas súbitas e imprevistas.

**REGLAS DE INFERENCIA OBLIGATORIAS PARA TRDM:**

**A. PRINCIPIO DEL VALOR TOTAL — INFRASEGURO (REGLA CRÍTICA)**
En TRDM el cliente está OBLIGADO a asegurar el 100% del valor de reconstrucción a nuevo de sus bienes. Si el formulario del brief reporta activos por $X pero la póliza/cotización muestra un valor asegurado de $Y donde Y < X, DEBES emitir una **⚠️ ALERTA CRÍTICA DE INFRASEGURO**. Razón: en caso de siniestro parcial, la aseguradora aplicará la **regla proporcional** — pagará los daños en la misma proporción (Y/X), no el 100%.

**B. BASES MATEMÁTICAS DE DEDUCIBLES — DIFERENCIA FUNDAMENTAL**
Existen DOS bases de cálculo de deducibles en TRDM. Al comparar cotizaciones, esta diferencia es DETERMINANTE:
  - **"X% del Valor Asegurable"** (coberturas catastróficas: terremoto, inundación) → Impacto ALTÍSIMO. El deducible se calcula sobre el TOTAL del valor asegurado del bien, no sobre el daño.
  - **"X% del Valor de la Pérdida"** (coberturas operativas: incendio, HMACC, rotura maquinaria) → Impacto MODERADO. El deducible se calcula solo sobre el monto del siniestro.
Si una aseguradora ofrece terremoto al "2% de la Pérdida" y otra al "2% del Valor Asegurable", la primera es CONTUNDENTEMENTE mejor (riesgo financiero para el cliente es MONUMENTALMENTE menor). Resalta esto siempre.

**C. LUCRO CESANTE — TIEMPO vs. DINERO**
En Lucro Cesante el deducible se mide en TIEMPO (días/horas de franquicia), no en porcentaje monetario. Menos días = mejor para el cliente (la aseguradora empieza a indemnizar la pérdida de utilidades más rápido). Ej: "Franquicia 2 días" supera a "Franquicia 5 días".

**D. LÍMITES GEOGRÁFICOS DE RIESGO OCULTOS**
El TRDM es un seguro de ubicación estática. Si el brief indica operaciones en múltiples ciudades/regiones pero la póliza solo lista una ubicación, genera una **advertencia de exclusión geográfica**. Verifica también la cláusula de "Traslado Temporal" (si bienes se mueven temporalmente entre sedes).`;
  }

  // ── Analysis Checklist ────────────────────────────────────────────

  getAnalysisChecklist(): string[] {
    return [
      'Extraer el desglose completo de valores asegurados por categoría de activo (edificios, muebles, maquinaria, equipo electrónico, dineros, mercancías, lucro cesante)',
      'Verificar que la suma asegurada total coincida con los valores declarados en el brief — alertar infraseguro si hay discrepancia (Regla Proporcional)',
      'Extraer la matriz de tasas: amparo, valor asegurado, tasa (‰) y prima neta por cada cobertura',
      'Identificar la base de cálculo de CADA deducible explícitamente (% del Valor Asegurable vs. % de la Pérdida vs. Tiempo/Franquicia)',
      'Verificar presencia de las 4 categorías de coberturas: Catastróficas (terremoto/inundación), Antrópicas (HMACC/AMIT/Terrorismo), Operativas (rotura maquinaria/sustracción), Sublímites (extinción/remoción/honorarios)',
      'Comparar ubicaciones aseguradas en la póliza vs. ubicaciones declaradas en el brief — alertar exclusión geográfica si faltan',
      'Evaluar cobertura de Lucro Cesante: período de indemnización y días de franquicia',
      'Verificar cláusula de Traslado Temporal de bienes entre sedes',
      'Identificar y alertar sobre sublímites que puedan ser insuficientes (gastos de extinción, remoción de escombros, honorarios profesionales)',
      'Validar vigencia de la póliza y condiciones de renovación',
    ];
  }

  // ── Infraseguro Rules ─────────────────────────────────────────────

  getInfraseguroRules(): string {
    return `**Reglas de Infraseguro — TRDM (Principio del Valor Total)**

1. **Regla Proporcional (CRÍTICA):** Si el Valor Asegurado < 100% del Valor de Reconstrucción a Nuevo, en un siniestro parcial la aseguradora indemnizará proporcionalmente: Indemnización = (Daño × Valor Asegurado) / Valor Real. SIEMPRE calcula y muestra el porcentaje de cobertura (VA/VR).

2. **Comparación con Brief:** Toma cada categoría de activo del formulario (edificio, maquinaria, muebles, equipo electrónico, dinero en caja) y compara contra el valor asegurado correspondiente en la póliza. Si hay diferencias > 10%, emitir alerta.

3. **Detección por Tasas:** Si la prima parece anormalmente baja para los activos declarados, verificar si los valores asegurados fueron reducidos para bajar la prima (infraseguro intencional).

4. **Mercancías y Lucro Cesante:** Frecuentemente sub-declarados. Si la empresa es industrial o comercial y estos rubros son $0 o no aparecen, señalarlo como gap potencial.

5. **Deducibles sobre Valor Asegurable (Catastróficos):** Un deducible del 2% del valor asegurable en un edificio de $10,000M = $200M de bolsillo para el cliente. Contextualizar el impacto financiero real.`;
  }

  // ── Regulatory Notes ──────────────────────────────────────────────

  getRegulatoryNotes(): string {
    return `**Notas Regulatorias — TRDM (Colombia)**
- Las pólizas deben cumplir con la regulación de la Superintendencia Financiera de Colombia (SFC).
- Los valores de reconstrucción deben reflejar avalúo técnico vigente; Fasecolda recomienda actualización anual.
- El SMMLV (Salario Mínimo Mensual Legal Vigente) se usa como unidad de mínimo en deducibles — actualmente referenciado en las condiciones. El agente debe considerarlo como referencia pero NO necesita el valor exacto; basta con señalar "X SMMLV".
- Pólizas TRDM corporativas frecuentemente incluyen coaseguro (varias aseguradoras comparten el riesgo); verificar porcentajes de participación.
- Para HMACC/AMIT/Terrorismo: existe regulación especial del Gobierno Nacional — estas coberturas son amparos adicionales, no automáticos.`;
  }

  // ── Field Labels (YAML output) ────────────────────────────────────

  getFieldLabels(): FieldLabelMap {
    return {
      rva_edificio: 'Valor Asegurado — Edificio/Mejoras Locativas',
      rva_muebles: 'Valor Asegurado — Muebles y Enseres',
      rva_maquinaria: 'Valor Asegurado — Maquinaria y Equipo',
      rva_equipo_electronico: 'Valor Asegurado — Equipo Electrónico',
      rva_dinero_caja: 'Valor Asegurado — Dinero en Caja Fuerte',
      ubicaciones: 'Ubicaciones del Riesgo',
      anio_construccion: 'Año de Construcción de la Sede',
    };
  }

  // ── PII Classification ────────────────────────────────────────────

  getPiiClassification(): Record<string, PiiClassification> {
    return {
      // Montos asegurados: SAFE — son datos financieros, no PII
      rva_edificio: 'safe',
      rva_muebles: 'safe',
      rva_maquinaria: 'safe',
      rva_equipo_electronico: 'safe',
      rva_dinero_caja: 'safe',
      // Ubicaciones: MASK — reducir a ciudad solamente
      ubicaciones: 'mask',
      // Año de construcción: SAFE — no identifica personas
      anio_construccion: 'safe',
    };
  }

  // ── Extraction Schema (Zod) ───────────────────────────────────────

  getExtractionSchema(): z.ZodType {
    return TrdmExtractionSchema;
  }

  // ── Comparison Priorities ─────────────────────────────────────────

  getComparisonPriorities(): string[] {
    return [
      'Valor asegurado total vs. activos declarados en brief (cobertura al 100%)',
      'Base de cálculo de deducibles: % sobre Valor Asegurable vs. % sobre Pérdida',
      'Deducible de Terremoto (altísimo impacto financiero)',
      'Prima neta total y desglose por amparo (tasa ‰)',
      'Cobertura de Lucro Cesante: período de indemnización y días de franquicia',
      'Presencia de HMACC + AMIT + Terrorismo (no siempre incluidos)',
      'Sublímites de Remoción de Escombros y Gastos de Extinción',
      'Cobertura de ubicaciones: ¿todas las sedes están amparadas?',
      'Cláusula de Traslado Temporal de bienes',
      'Condiciones de coaseguro (si aplica)',
    ];
  }
}

// ── Export Zod schemas for external use (validation, testing) ────────────────

export {
  TrdmExtractionSchema,
  TrdmDeductibleSchema,
  TrdmRateLineSchema,
  TrdmAssetBreakdownSchema,
  TrdmCoverageSchema,
  DeductibleBasisEnum,
};
