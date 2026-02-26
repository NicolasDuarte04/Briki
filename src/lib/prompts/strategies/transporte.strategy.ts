// src/lib/prompts/strategies/transporte.strategy.ts
/**
 * Transporte Strategy — Transporte de Mercancías
 *
 * Estrategia especializada para pólizas de transporte de mercancías
 * (nacional e importaciones/exportaciones). Codifica la ontología:
 *   - Dimensionamiento: Presupuesto Anual vs. LMD (Límite Máximo por Despacho)
 *   - Coberturas operativas: daño material, hurto, cargue/descargue, HMACC
 *   - Deducibles diferenciados: hurto (~20%) vs. daño (~10%)
 *   - Garantías (condiciones sine qua non): escoltas, GPS, embalaje
 *   - Cláusula de No Subrogación contra transportadores
 *   - Esquema Zod con campos obligatorios: garantias_exigidas + clausula_no_subrogacion
 *
 * Fuente de dominio: docs/knowledge/transporte-rules.md
 *
 * @module prompts/strategies/transporte.strategy
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
 * Tipo de trayecto amparado.
 *   - nacional:       transporte terrestre dentro del país
 *   - importacion:    multimodal desde origen internacional hasta bodega
 *   - exportacion:    desde bodega hasta destino internacional
 *   - interurbano:    entre bodegas del mismo asegurado
 */
const TransportRoutTypeEnum = z.enum([
  'nacional',
  'importacion',
  'exportacion',
  'interurbano',
]);

/**
 * Modalidad de transporte.
 */
const TransportModeEnum = z.enum([
  'terrestre',
  'maritimo',
  'aereo',
  'multimodal',
]);

/**
 * Línea de la estructura de valores y tasas.
 * Replica la tabla §2 Extracción 1.
 */
const TransporteRateLineSchema = z.object({
  concepto: z.string().describe(
    'Tipo de mercancía/trayecto (ej: Mercancía Nacional, Importaciones Terrestre, Importaciones Marítimo)'
  ),
  tipo_trayecto: TransportRoutTypeEnum.nullable().describe(
    'Clasificación del trayecto amparado'
  ),
  modalidad: TransportModeEnum.nullable().describe(
    'Medio de transporte: terrestre, marítimo, aéreo, multimodal'
  ),
  presupuesto_anual: z.number().nullable().describe(
    'Proyección total del valor de mercancía a movilizar en la vigencia'
  ),
  lmd: z.number().nullable().describe(
    'Límite Máximo por Despacho — valor máximo en un solo vehículo/contenedor'
  ),
  tasa_por_mil: z.number().nullable().describe(
    'Tasa en por mil (‰) aplicada sobre el presupuesto anual'
  ),
  prima_neta: z.number().nullable().describe(
    'Prima neta calculada (Presupuesto × Tasa / 1000)'
  ),
});

/**
 * Deducible de transporte con diferenciación por tipo de siniestro.
 * Replica la tabla §2 Extracción 2.
 * La distinción hurto vs. daño material es CRÍTICA (Regla D).
 */
const TransporteDeductibleSchema = z.object({
  cobertura: z.string().describe(
    'Tipo de evento (ej: Pérdida o Daño Material, Hurto Calificado, Falta de Entrega, Avería Particular)'
  ),
  porcentaje_perdida: z.number().nullable().describe(
    'Porcentaje sobre el valor de la pérdida (ej: 10 para 10%, 20 para 20%)'
  ),
  minimo_smmlv: z.number().nullable().describe(
    'Mínimo en SMMLV. Null si no aplica'
  ),
  minimo_valor: z.number().nullable().describe(
    'Mínimo en moneda. Null si se expresa en SMMLV'
  ),
  condicion_textual: z.string().describe(
    'Texto LITERAL extraído del documento describiendo la condición del deducible'
  ),
});

/**
 * Cobertura/amparo individual de transporte.
 */
const TransporteCoverageSchema = z.object({
  nombre: z.string().describe('Nombre del amparo'),
  tipo: z.enum([
    'todo_riesgo',       // Pérdida o Daño Material general
    'hurto',             // Hurto Calificado y/o Saqueo
    'cargue_descargue',  // Operaciones de cargue y descargue
    'hmacc',             // Huelga, Motín, Asonada, Conmoción Civil
    'faltante',          // Falta de entrega
    'averia_particular', // Rotura / Avería
    'mojadura',          // Daños por agua / humedad
    'otro',
  ]).describe('Clasificación del amparo según ontología de transporte'),
  incluido: z.boolean().describe('Si está incluido en la póliza'),
  sublimite: z.number().nullable().describe('Sublímite específico si difiere del LMD'),
});

/**
 * Esquema raíz de extracción Transporte — con campos OBLIGATORIOS
 * para garantías y cláusula de no subrogación.
 */
const TransporteExtractionSchema = z.object({
  // Identificación
  aseguradora: z.string().describe('Nombre de la compañía aseguradora'),
  numero_poliza: z.string().nullable().describe('Número de póliza'),
  vigencia_desde: z.string().nullable().describe('Fecha inicio vigencia'),
  vigencia_hasta: z.string().nullable().describe('Fecha fin vigencia'),
  moneda: z.string().default('COP').describe('Moneda de la póliza'),

  // Dimensionamiento financiero
  presupuesto_anual_total: z.number().nullable().describe(
    'Presupuesto anual total de movilizaciones (suma de todos los conceptos)'
  ),
  lmd_maximo: z.number().nullable().describe(
    'LMD más alto entre todos los conceptos — tope máximo por despacho'
  ),

  // Estructura de valores y tasas (por concepto/trayecto)
  estructura_tasas: z.array(TransporteRateLineSchema).describe(
    'Desglose por concepto: presupuesto anual, LMD, tasa (‰), prima neta'
  ),
  prima_neta_total: z.number().nullable().describe('Prima neta total estimada'),
  iva: z.number().nullable().describe('IVA sobre la prima'),
  prima_total: z.number().nullable().describe('Prima total a pagar'),

  // Coberturas
  coberturas: z.array(TransporteCoverageSchema).describe(
    'Lista de amparos identificados en la póliza'
  ),

  // Deducibles (diferenciados hurto vs. daño)
  deducibles: z.array(TransporteDeductibleSchema).describe(
    'Estructura de deducibles. CRÍTICO: el deducible de Hurto suele ser ~2x del de Daño Material'
  ),

  // ═══════════════════════════════════════════════════════════════════
  // CAMPOS OBLIGATORIOS DE TRANSPORTE (no presentes en otros ramos)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * GARANTÍAS EXIGIDAS — Condiciones Sine Qua Non.
   * Principal motivo de objeción de siniestros en transporte.
   * Extraer TODAS las medidas de seguridad que la aseguradora impone
   * como condición para mantener la cobertura vigente.
   * Ejemplos típicos: "Escolta armada para despachos > $100M",
   * "GPS activo en todo momento", "Embalaje certificado".
   */
  garantias_exigidas: z.array(z.string()).describe(
    'OBLIGATORIO: Lista de TODAS las garantías/condiciones de seguridad exigidas por la aseguradora. Ej: escoltas, GPS, embalaje, horarios de tránsito. Si no se encuentran, devolver array vacío.'
  ),

  /**
   * CLÁUSULA DE NO SUBROGACIÓN contra el transportador.
   * Determina si el asegurado puede usar transportadores terceros
   * sin que la aseguradora se vuelva contra ellos tras un siniestro.
   */
  clausula_no_subrogacion: z.boolean().describe(
    'OBLIGATORIO: ¿La póliza incluye cláusula de No Subrogación contra el transportador contratado? true si la incluye, false si no aparece o está excluida.'
  ),

  // Cláusulas adicionales
  vehiculos_propios: z.boolean().nullable().describe(
    'Si la póliza ampara transporte en vehículos propios del asegurado'
  ),
  transportadores_contratados: z.boolean().nullable().describe(
    'Si la póliza ampara transporte realizado por fleteras/terceros'
  ),
  territorio: z.string().nullable().describe(
    'Territorio geográfico cubierto (ej: Colombia, CAN, Internacional)'
  ),
  coaseguro: z.string().nullable().describe('Detalle de coaseguro si aplica'),
});

// ═════════════════════════════════════════════════════════════════════════════
// TRANSPORTE STRATEGY CLASS
// ═════════════════════════════════════════════════════════════════════════════

export class TransporteStrategy implements CategoryStrategy {
  readonly categoryId = 'transporte' as const;
  readonly categoryLabel = 'Transporte de Mercancías';

  // ── Domain Context (Sección 3: "El Por Qué") ─────────────────────

  getDomainContext(): string {
    return `Estás analizando una póliza de **Transporte de Mercancías** — ampara pérdidas o daños materiales a bienes del asegurado mientras son movilizados de un origen a un destino (terrestre, marítimo, aéreo o multimodal).

**CONCEPTOS CLAVE QUE DEBES DOMINAR:**
- **Presupuesto Anual de Movilizaciones:** Proyección total del valor de mercancía a transportar en el año. Base para calcular la prima de depósito.
- **LMD (Límite Máximo por Despacho):** Valor máximo de mercancía en un SOLO vehículo/contenedor. Es el tope que la aseguradora pagará por siniestro.

**REGLAS DE INFERENCIA OBLIGATORIAS PARA TRANSPORTE:**

**A. PRESUPUESTO vs. LMD — SOBRECUPO E INFRASEGURO (REGLA CRÍTICA)**
La aseguradora cobra prima sobre el Presupuesto Anual, pero SOLO paga hasta el LMD por siniestro. Si el cliente declara un LMD de $100M pero carga $150M en el camión, la aseguradora aplicará infraseguro (penalidad por sobrecupo — no pagará el 100%). DEBES verificar que el LMD de la póliza/cotización sea IGUAL O SUPERIOR al LMD solicitado por el cliente en el brief. Si es inferior, emite **⚠️ ALERTA CRÍTICA DE SOBRECUPO**.

**B. GARANTÍAS — AUDITORÍA OBLIGATORIA (REGLA MÁS IMPORTANTE)**
Las Garantías son medidas de seguridad que la aseguradora EXIGE como condición sine qua non. Si el asegurado las incumple, la aseguradora RECHAZARÁ el siniestro. Esta es la principal causa de objeción de reclamos en transporte. DEBES:
1. Extraer CADA garantía listada en el documento (escoltas armadas, GPS, embalaje, horarios de tránsito, etc.)
2. Alertar al usuario de forma prominente: *"⚠️ La aseguradora exige [GARANTÍA]. Si su operación no cumple esta condición, el siniestro NO será pagado."*
3. Al comparar cotizaciones: la que exija MENOS garantías onerosas (o umbrales más altos para activarlas) es más flexible operativamente.

**C. VEHÍCULOS PROPIOS vs. TRANSPORTADORES CONTRATADOS**
Si la empresa usa transportadoras terceras (fleteras), DEBES buscar la **Cláusula de No Subrogación contra el Transportador**. Sin esta cláusula, la aseguradora pagará al asegurado pero luego demandará a la fletera — y los límites de responsabilidad legal del transportador son bajos. Si la cláusula NO está presente y el brief indica uso de terceros, emite advertencia.

**D. PENALIZACIÓN POR DEDUCIBLES DE HURTO (DOBLE ESTÁNDAR)**
El deducible de Hurto Calificado es típicamente el DOBLE del de Daño Material (ej: 20% hurto vs. 10% daño). Esto es porque el robo en carretera es el riesgo mayor. SIEMPRE destaca ambos deducibles y compáralos explícitamente. Penaliza en el análisis cotizaciones con deducible de hurto ≥ 30% como "deducible abusivo".

**E. EVALUACIÓN CON DATOS DEL BRIEF**
- Compara el Presupuesto Anual del brief contra el de la póliza — deben coincidir o la prima será ajustada.
- Compara el LMD del brief contra el LMD de la póliza — la póliza debe cubrir al menos lo que el cliente necesita.
- Verifica coherencia del Tipo de Mercancía declarado vs. la descripción de mercancía amparada en la póliza.`;
  }

  // ── Analysis Checklist ────────────────────────────────────────────

  getAnalysisChecklist(): string[] {
    return [
      'Extraer Presupuesto Anual de Movilizaciones y comparar contra el valor declarado en el brief',
      'Extraer LMD (Límite Máximo por Despacho) y verificar que sea ≥ al LMD solicitado por el cliente — alertar sobrecupo si es inferior',
      'Extraer estructura de tasas: concepto, presupuesto, LMD, tasa (‰), prima neta por cada tipo de trayecto/mercancía',
      'Extraer TODAS las Garantías exigidas (escoltas, GPS, embalaje, horarios, etc.) — listarlas con prominencia',
      'Alertar sobre cada garantía que pueda ser difícil de cumplir operativamente para el cliente',
      'Extraer deducibles diferenciados: Daño Material vs. Hurto — comparar explícitamente los porcentajes',
      'Penalizar cotizaciones con deducible de hurto ≥ 30% como "deducible abusivo"',
      'Verificar presencia de Cláusula de No Subrogación contra transportador (crítico si usa fleteras)',
      'Verificar coherencia del tipo de mercancía amparada vs. tipo de mercancía del brief',
      'Identificar si cubre operaciones de cargue/descargue — gap crítico si está excluido',
      'Verificar extensión geográfica: ¿cubre todas las rutas que necesita el cliente?',
    ];
  }

  // ── Infraseguro Rules ─────────────────────────────────────────────

  getInfraseguroRules(): string {
    return `**Reglas de Infraseguro — Transporte (LMD y Sobrecupo)**

1. **LMD vs. Brief (CRÍTICO):** Si el LMD en la póliza es menor al LMD solicitado en el brief, hay riesgo de sobrecupo. La aseguradora aplicará penalidad proporcional: Indemnización = (Daño × LMD Póliza) / Valor Real en Vehículo.

2. **Presupuesto Anual Subdeclarado:** Si el presupuesto en la póliza es inferior al real, la aseguradora ajustará la prima al cierre de vigencia (auditoría de despachos) y podría exigir prima adicional retroactiva.

3. **Deducible de Hurto Abusivo:** Deducibles de hurto ≥ 30% de la pérdida son excesivos para el mercado colombiano. El estándar es 15-20%. Alertar si supera ese rango.

4. **Garantías Incumplibles:** Si la póliza exige escolta armada para despachos > $50M y el brief indica LMD de $200M, el costo operativo de escoltas es permanente. Cuantificar el impacto.

5. **Sin Cargue/Descargue:** Si la póliza excluye operaciones de cargue y descargue, no cubrirá daños en bodegas de origen/destino — uno de los puntos más frecuentes de siniestro.`;
  }

  // ── Regulatory Notes ──────────────────────────────────────────────

  getRegulatoryNotes(): string {
    return `**Notas Regulatorias — Transporte de Mercancías (Colombia)**
- El contrato de transporte se rige por el Código de Comercio (Art. 981 y ss.) y el Decreto 1079 de 2015.
- La responsabilidad legal del transportador terrestre está limitada por Ley (aprox. 1.5 SMMLV por kg de peso bruto) — insuficiente para mercancía de alto valor.
- Para importaciones: verificar concordancia con términos Incoterms (CIF, FOB, etc.) que definen quién asume el riesgo durante el tránsito.
- Superintendencia de Transporte exige que los vehículos de carga cumplan con los pesos y dimensiones del Decreto 1906 de 2015.
- Los bienes en tránsito internacional requieren declaración de aduana compatible con la cobertura de la póliza.`;
  }

  // ── Field Labels (para serialización YAML) ────────────────────────

  getFieldLabels(): FieldLabelMap {
    return {
      presupuesto_anual_movilizado: 'Presupuesto Anual de Movilizaciones',
      limite_maximo_despacho: 'Límite Máximo por Despacho (LMD)',
      tipo_mercancia: 'Tipo de Mercancía',
    };
  }

  // ── PII Classification ────────────────────────────────────────────

  getPiiClassification(): Record<string, PiiClassification> {
    return {
      // Montos financieros: SAFE
      presupuesto_anual_movilizado: 'safe',
      limite_maximo_despacho: 'safe',
      // Tipo de mercancía: SAFE — describe la carga, no personas
      tipo_mercancia: 'safe',
    };
  }

  // ── Extraction Schema (Zod) ───────────────────────────────────────

  getExtractionSchema(): z.ZodType {
    return TransporteExtractionSchema;
  }

  // ── Comparison Priorities ─────────────────────────────────────────

  getComparisonPriorities(): string[] {
    return [
      'LMD ofrecido vs. LMD solicitado en el brief (riesgo de sobrecupo)',
      'Garantías exigidas: cantidad, tipo y umbrales de activación (menos = más flexible)',
      'Deducible de Hurto Calificado vs. Deducible de Daño Material (ratio y porcentajes)',
      'Tasa por mil (‰) por concepto de transporte',
      'Presencia de Cláusula de No Subrogación contra transportador',
      'Cobertura de operaciones de Cargue y Descargue',
      'Prima neta total y relación prima/presupuesto anual',
      'Extensión geográfica y tipos de trayecto amparados',
      'Cobertura de HMACC (Huelga, Motín, Asonada)',
      'Sublímites especiales por tipo de mercancía',
    ];
  }
}

// ── Export Zod schemas for external use (validation, testing) ────────────────

export {
  TransporteExtractionSchema,
  TransporteRateLineSchema,
  TransporteDeductibleSchema,
  TransporteCoverageSchema,
  TransportRoutTypeEnum,
  TransportModeEnum,
};
