// src/lib/prompts/strategies/flota.strategy.ts
/**
 * Flota Strategy — Flota de Vehículos (Empresarial / B2B)
 *
 * Estrategia especializada para pólizas colectivas de flota vehicular
 * corporativa. Codifica la ontología completa del ramo incluyendo:
 *   - Póliza colectiva (contrato maestro) — NO es seguro individual
 *   - Diferenciación Livianos vs. Pesados (límites, deducibles, tasas)
 *   - Amparo Patrimonial (riesgo moral del empleado — cobertura crítica B2B)
 *   - Tasa Plana (flat rate) para inclusiones automáticas
 *   - Límites catastróficos diferenciados de RCE
 *   - Campos obligatorios: amparo_patrimonial_incluido + tasa_aplicada_flota
 *
 * Fuente de dominio: docs/knowledge/flota-rules.md
 *
 * @module prompts/strategies/flota.strategy
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
 * Clasificación de uso del vehículo dentro de la flota.
 */
const VehicleClassEnum = z.enum([
  'liviano_comercial',    // Sedanes, SUVs, pickups < 3 ton
  'pesado_carga',         // Camiones, tractomulas > 3 ton
  'pasajeros',            // Buses, busetas
  'maquinaria_amarilla',  // Retroexcavadoras, montacargas
]);

/**
 * Tipo de tarificación aplicada a la flota.
 *   - tasa_plana:     tasa única para toda la flota (inclusiones automáticas)
 *   - individual:     cada vehículo se cotiza por separado
 *   - mixta:          tasa plana por categoría (ej: 2.5% livianos, 3.0% pesados)
 */
const FlotaTarificacionEnum = z.enum([
  'tasa_plana',
  'individual',
  'mixta',
]);

/**
 * Estructura de límites RCE corporativos por tipo de vehículo.
 * Replica la tabla §2 Extracción 1.
 * CRÍTICO: debe diferenciar livianos vs. pesados.
 */
const FlotaRceLimitSchema = z.object({
  tipo_vehiculo: VehicleClassEnum.describe(
    'Categoría de vehículo: liviano_comercial, pesado_carga, pasajeros, maquinaria_amarilla'
  ),
  luc: z.number().nullable().describe(
    'Límite Único Combinado de RCE para este tipo de vehículo'
  ),
  amparo_patrimonial: z.boolean().describe(
    'Si el Amparo Patrimonial está incluido para este tipo de vehículo'
  ),
  perjuicios_extrapatrimoniales: z.string().nullable().describe(
    'Condición de perjuicios extrapatrimoniales (ej: "100% del LUC")'
  ),
  asistencia_juridica_penal: z.string().nullable().describe(
    'Condición de asistencia jurídica penal (ej: "Ilimitada", "Hasta $500M")'
  ),
});

/**
 * Deducible de flota por cobertura.
 * Replica la tabla §2 Extracción 2.
 * Diferencia livianos vs. pesados en pérdidas parciales.
 */
const FlotaDeductibleSchema = z.object({
  cobertura: z.string().describe(
    'Cobertura aplicable (ej: RCE, Pérdida Total, Pérdida Parcial Livianos, Pérdida Parcial Pesados)'
  ),
  aplica_a: z.enum(['toda_flota', 'livianos', 'pesados']).describe(
    'A qué segmento de la flota aplica este deducible'
  ),
  porcentaje_perdida: z.number().nullable().describe(
    'Porcentaje sobre el valor de la pérdida. Null si es 0% (sin deducible)'
  ),
  minimo_smmlv: z.number().nullable().describe(
    'Mínimo en SMMLV. Null si no aplica o sin deducible'
  ),
  minimo_valor: z.number().nullable().describe(
    'Mínimo en moneda. Null si se expresa en SMMLV o sin deducible'
  ),
  sin_deducible: z.boolean().describe(
    'true si la condición es "Sin Deducible" / 0% — exigencia innegociable para RCE B2B'
  ),
  condicion_textual: z.string().describe(
    'Texto LITERAL extraído del documento'
  ),
});

/**
 * Cobertura/amparo individual de la póliza de flota.
 */
const FlotaCoverageSchema = z.object({
  nombre: z.string().describe('Nombre del amparo'),
  tipo: z.enum([
    'rce',                    // Responsabilidad Civil Extracontractual
    'amparo_patrimonial',     // Conducta culposa del empleado-conductor
    'perdida_total_danios',   // Pérdida total por daños (choque, volcamiento)
    'perdida_total_hurto',    // Pérdida total por hurto del vehículo
    'perdida_parcial',        // Daños parciales reparables
    'asistencia_vehicular',   // Grúa, cerrajería, etc.
    'accesorios',             // Furgones, volcos, grúas industriales
    'terremoto',              // Fenómenos naturales
    'otro',
  ]).describe('Clasificación del amparo según ontología de flota'),
  incluido: z.boolean().describe('Si está incluido'),
  aplica_a: z.enum(['toda_flota', 'livianos', 'pesados']).nullable().describe(
    'Segmento al que aplica. Null si aplica a toda la flota'
  ),
  detalle: z.string().nullable().describe('Condiciones especiales'),
});

/**
 * Esquema raíz de extracción Flota — con campos OBLIGATORIOS
 * para Amparo Patrimonial y tipo de tarificación.
 */
const FlotaExtractionSchema = z.object({
  // Identificación
  aseguradora: z.string().describe('Nombre de la compañía aseguradora'),
  numero_poliza: z.string().nullable().describe('Número de póliza'),
  vigencia_desde: z.string().nullable().describe('Fecha inicio vigencia'),
  vigencia_hasta: z.string().nullable().describe('Fecha fin vigencia'),
  moneda: z.string().default('COP').describe('Moneda de la póliza'),

  // Composición de la flota (si se especifica en el documento)
  cantidad_vehiculos_livianos: z.number().nullable().describe(
    'Número de vehículos livianos/comerciales en la póliza'
  ),
  cantidad_vehiculos_pesados: z.number().nullable().describe(
    'Número de vehículos pesados/carga en la póliza'
  ),
  cantidad_total: z.number().nullable().describe(
    'Total de vehículos amparados'
  ),

  // Límites RCE por tipo de vehículo
  limites_rce: z.array(FlotaRceLimitSchema).describe(
    'Estructura de límites RCE. CRÍTICO: diferenciar livianos vs. pesados — pesados DEBEN tener LUC más alto'
  ),

  // Coberturas
  coberturas: z.array(FlotaCoverageSchema).describe(
    'Lista de amparos identificados en la póliza de flota'
  ),

  // Deducibles (diferenciados por segmento)
  deducibles: z.array(FlotaDeductibleSchema).describe(
    'Estructura de deducibles. CRÍTICO: RCE DEBE ser "Sin Deducible" en B2B. Pesados tienen mínimos más altos que livianos.'
  ),

  // Económicos
  prima_neta: z.number().nullable().describe('Prima neta total de la flota'),
  iva: z.number().nullable().describe('IVA'),
  prima_total: z.number().nullable().describe('Prima total a pagar'),

  // ═══════════════════════════════════════════════════════════════════
  // CAMPOS OBLIGATORIOS DE FLOTA
  // ═══════════════════════════════════════════════════════════════════

  /**
   * AMPARO PATRIMONIAL — Cobertura crítica B2B.
   * Si un empleado-conductor causa un accidente por culpa grave
   * (embriaguez, huida) y NO hay Amparo Patrimonial, la aseguradora
   * no paga nada. Las víctimas demandarán a la empresa.
   */
  amparo_patrimonial_incluido: z.boolean().describe(
    'OBLIGATORIO: ¿La póliza incluye Amparo Patrimonial? true = sí, false = no aparece o está excluido. Si false → ALERTA ROJA CRÍTICA.'
  ),

  /**
   * TIPO DE TARIFICACIÓN — cómo la aseguradora calcula la prima.
   * Tasa Plana = inclusiones automáticas (ideal B2B).
   * Individual = inviable para flotas que rotan vehículos.
   */
  tasa_aplicada_flota: z.string().describe(
    'OBLIGATORIO: Descripción de la tarificación aplicada. Ej: "Tasa Plana 2.5%", "Tasa Plana mixta: 2.5% livianos / 3.0% pesados", "Tarificación individual por vehículo". Extraer textualmente.'
  ),

  // Opcionales
  valor_asegurado_total_flota: z.number().nullable().optional().describe(
    'Suma total del valor asegurado de todos los vehículos'
  ),
  coaseguro: z.string().nullable().optional().describe(
    'Detalle de coaseguro si aplica'
  ),
});

// ═════════════════════════════════════════════════════════════════════════════
// FLOTA STRATEGY CLASS
// ═════════════════════════════════════════════════════════════════════════════

export class FlotaStrategy implements CategoryStrategy {
  readonly categoryId = 'flota' as const;
  readonly categoryLabel = 'Flota de Vehículos (Empresarial)';

  // ── Domain Context (Sección 3: "El Por Qué") ─────────────────────

  getDomainContext(): string {
    return `Estás analizando una póliza de **Flota de Vehículos (Empresarial)** — un contrato maestro (póliza colectiva) diseñado para empresas. NO es un seguro individual de auto: evalúa la operación logística y comercial de la compañía, agrupando todos los activos móviles (livianos, pesados, maquinaria).

**REGLAS DE INFERENCIA OBLIGATORIAS PARA FLOTA:**

**A. TASA PLANA vs. TARIFICACIÓN INDIVIDUAL (REGLA OPERATIVA)**
Una flota empresarial rota vehículos constantemente (compras, ventas, siniestros totales). Si la aseguradora aplica **Tasa Plana** (flat rate), las inclusiones y exclusiones futuras son automáticas al mismo costo — esto es ESENCIAL para operaciones B2B. Si la cotización tarifica cada vehículo individualmente, PENALÍZALA: es inviable para una empresa que compra o reemplaza vehículos regularmente. Extrae SIEMPRE el tipo de tarificación y la tasa aplicada.

**B. AMPARO PATRIMONIAL — ALERTA ROJA SI FALTA (REGLA CRÍTICA)**
El Amparo Patrimonial protege a la empresa cuando el conductor-empleado comete una infracción grave (embriaguez, fuga del lugar del accidente). Sin este amparo, la aseguradora RECHAZA el siniestro completo y las víctimas demandarán solidariamente a la empresa. Si la póliza NO incluye explícitamente "Amparo Patrimonial", DEBES emitir: **🚨 ALERTA ROJA CRÍTICA: Sin Amparo Patrimonial, un solo accidente con culpa del conductor puede llevar a la empresa a la quiebra.**

**C. LÍMITES RCE DIFERENCIADOS — PESADOS vs. LIVIANOS (REGLA CATASTRÓFICA)**
Los vehículos pesados (camiones, tractomulas > 3 ton) causan daños CATASTRÓFICOS en comparación con livianos (sedanes, pickups). Un sedán choca un poste; una tractomula sin frenos destruye una fila de vehículos o atropella peatones múltiples. Los pesados DEBEN tener LUC de RCE significativamente más alto que los livianos (regla de mercado: al menos 2x). Si la cotización ofrece el MISMO límite bajo para ambos segmentos, advertir: **⚠️ Sub-seguro de Responsabilidad — los pesados necesitan límites RCE al menos del doble que los livianos.**

**D. DEDUCIBLES DE PÉRDIDA PARCIAL EN PESADOS (REGLA DE MANTENIMIENTO)**
En vehículos pesados, el mínimo del deducible de pérdida parcial es más alto (ej: 3 SMMLV vs. 1 SMMLV en livianos). Esto evita reclamaciones por raspones de uso diario en camiones operativos. No es un defecto de la póliza — es diseño B2B. El cliente debe entender que daños menores en pesados van por su presupuesto de mantenimiento.

**E. RCE SIN DEDUCIBLE — EXIGENCIA INNEGOCIABLE B2B**
En pólizas de flota empresarial, la RCE (daños a terceros) DEBE ser "Sin Deducible". Si una cotización impone deducible en RCE, penalízala severamente: la empresa no puede demorar pagos a víctimas de accidentes.

**F. EVALUACIÓN CON DATOS DEL BRIEF**
- Si el brief indica vehículos pesados > 0 pero la póliza no diferencia límites para pesados → gap crítico.
- Calcular el total de vehículos del brief (livianos + pesados) y comparar con la cantidad amparada en la póliza.`;
  }

  // ── Analysis Checklist ────────────────────────────────────────────

  getAnalysisChecklist(): string[] {
    return [
      'Verificar presencia de AMPARO PATRIMONIAL — si falta, emitir Alerta Roja Crítica inmediata',
      'Extraer tipo de tarificación: Tasa Plana (ideal) vs. Individual (penalizar) vs. Mixta — incluir la tasa numérica',
      'Extraer límites RCE diferenciados para Livianos y Pesados — verificar que pesados tengan al menos 2x del LUC de livianos',
      'Verificar que RCE sea "Sin Deducible" — penalizar si tiene deducible',
      'Extraer deducibles de Pérdida Parcial diferenciados: livianos (típico: 10%, mín 1 SMMLV) vs. pesados (típico: 10%, mín 3 SMMLV)',
      'Verificar inclusión de Perjuicios Extrapatrimoniales (daños morales) al 100% del LUC',
      'Verificar Asistencia Jurídica Penal — debe ser ilimitada o con límite alto para conductores de pesados',
      'Comparar cantidad de vehículos del brief (livianos + pesados) contra la cantidad amparada en la póliza',
      'Verificar si se declaran Accesorios Industriales (furgones, volcos, grúas) por separado del chasis',
      'Evaluar cobertura de Pérdida Total (daños + hurto) — debe ser 0% deducible en flotas B2B',
    ];
  }

  // ── Infraseguro Rules ─────────────────────────────────────────────

  getInfraseguroRules(): string {
    return `**Reglas de Infraseguro — Flota (Responsabilidad y Composición)**

1. **Sin Amparo Patrimonial = Exclusión Catastrófica:** La ausencia de este amparo no es un "gap menor" — es la diferencia entre la continuidad de la empresa y su quiebra ante un accidente grave con culpa del conductor.

2. **LUC Pesados = LUC Livianos:** Si ambos segmentos tienen el mismo LUC, los pesados están sub-asegurados. Una tractomula causa daños de $4,000M+; un sedán raramente supera $2,000M. El LUC de pesados debe ser al menos 2x.

3. **Vehículos del Brief no Amparados:** Si el brief indica 20 livianos y 5 pesados pero la póliza solo ampara 18 livianos, hay 2 vehículos sin cobertura. Alertar discrepancia.

4. **Tarificación Individual en Flota > 10 Vehículos:** Para flotas de más de 10 unidades, la tarificación individual es operativamente inviable. Alertar como deficiencia de la propuesta.

5. **Deducible en RCE:** Cualquier deducible en RCE de flota empresarial es inaceptable según el estándar del mercado. La empresa no puede demorar indemnizaciones a víctimas — penalizar con severidad.`;
  }

  // ── Regulatory Notes ──────────────────────────────────────────────

  getRegulatoryNotes(): string {
    return `**Notas Regulatorias — Flota Empresarial (Colombia)**
- El SOAT (Seguro Obligatorio de Accidentes de Tránsito, Ley 769/2002) es piso mínimo — la póliza de flota opera en exceso.
- La responsabilidad solidaria del empleador por accidentes de empleados se fundamenta en el Código Civil (Art. 2347) y el Código Sustantivo del Trabajo.
- Vehículos de carga deben cumplir con pesos y dimensiones del Decreto 1906/2015 (Ministerio de Transporte).
- Empresas de transporte público de pasajeros tienen obligatoriedad de póliza de RC bajo el Decreto 101/2000.
- Maquinaria amarilla (retroexcavadoras, montacargas) no circula por vía pública — aplican condiciones especiales de cobertura.
- La tarifa de flota se negocia generalmente como prima de depósito ajustable al cierre de vigencia según composición real.`;
  }

  // ── Field Labels (para serialización YAML) ────────────────────────

  getFieldLabels(): FieldLabelMap {
    return {
      numero_vehiculos_pesados: 'Vehículos Pesados (Camiones/Carga)',
      numero_vehiculos_livianos_flota: 'Vehículos Livianos (Comerciales)',
    };
  }

  // ── PII Classification ────────────────────────────────────────────

  getPiiClassification(): Record<string, PiiClassification> {
    return {
      numero_vehiculos_pesados: 'safe',
      numero_vehiculos_livianos_flota: 'safe',
    };
  }

  // ── Extraction Schema (Zod) ───────────────────────────────────────

  getExtractionSchema(): z.ZodType {
    return FlotaExtractionSchema;
  }

  // ── Comparison Priorities ─────────────────────────────────────────

  getComparisonPriorities(): string[] {
    return [
      'Amparo Patrimonial: incluido o excluido (ausencia = Alerta Roja)',
      'Tipo de tarificación: Tasa Plana (ideal) vs. Individual (penalizar)',
      'LUC de RCE para Pesados vs. Livianos (pesados deben tener ≥ 2x)',
      'Deducible de RCE: debe ser "Sin Deducible" en B2B',
      'Deducibles de Pérdida Parcial: livianos vs. pesados (mínimo SMMLV diferenciado)',
      'Prima total y tasa aplicada por segmento',
      'Perjuicios Extrapatrimoniales: cobertura al 100% del LUC',
      'Asistencia Jurídica Penal: ilimitada o con límite alto',
      'Cobertura de Pérdida Total (daños + hurto) sin deducible',
      'Accesorios Industriales declarados por separado',
    ];
  }
}

// ── Export Zod schemas for external use (validation, testing) ────────────────

export {
  FlotaExtractionSchema,
  FlotaRceLimitSchema,
  FlotaDeductibleSchema,
  FlotaCoverageSchema,
  VehicleClassEnum,
  FlotaTarificacionEnum,
};
