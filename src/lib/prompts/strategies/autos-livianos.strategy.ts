// src/lib/prompts/strategies/autos-livianos.strategy.ts
/**
 * Autos Livianos Strategy — Vehículos Livianos (B2C / Familia)
 *
 * PRIMERA CATEGORÍA CLIENT del Strategy Pattern.
 * Estrategia especializada para pólizas individuales de automóviles
 * (sedanes, SUVs, pickups) orientadas al consumidor final.
 *
 * Diferencias fundamentales respecto a Flota (B2B):
 *   - El asegurado es UNA persona/familia, no una empresa
 *   - El impacto financiero es sobre el patrimonio familiar directo
 *   - Las Asistencias B2C (grúa, conductor elegido, vehículo de reemplazo)
 *     son factores de decisión de compra, no beneficios corporativos
 *   - El LUC de RCE protege contra embargo personal (casa, ahorros)
 *   - Pérdida Total con deducible = catástrofe para una familia
 *
 * Ontología codificada:
 *   - Valor Fasecolda (depreciación mes a mes) como base de indemnización
 *   - Amparos patrimoniales: PTD, PTH, PPD, PPH
 *   - Asistencias B2C: Gastos de Transporte (dinero vs. vehículo físico),
 *     Grúa (km o SMDLV), Conductor Elegido (eventos/año)
 *   - Castigo severo a deducible en Pérdida Total
 *   - LUC mínimo ético: $2,000M–$3,000M
 *
 * Fuente de dominio: docs/knowledge/autos-livianos-rules.md
 *
 * @module prompts/strategies/autos-livianos.strategy
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
 * Tipo de auxilio de transporte durante reparación/siniestro.
 *   - dinero_diario:      monto en pesos/día (ej: $50,000/día × 15 días)
 *   - vehiculo_reemplazo: auto alquilado pagado por la aseguradora
 *   - no_incluido:        sin beneficio de movilización temporal
 */
const GastosTransporteTipoEnum = z.enum([
  'dinero_diario',
  'vehiculo_reemplazo',
  'no_incluido',
]);

/**
 * Tipo de pérdida patrimonial sobre el vehículo.
 */
const PerdidaTipoEnum = z.enum([
  'perdida_total_danios',     // PTD — reparación > 75% del valor comercial
  'perdida_total_hurto',      // PTH — robo completo no recuperado
  'perdida_parcial_danios',   // PPD — choques reparables
  'perdida_parcial_hurto',    // PPH — robo de autopartes
]);

// ── Sub-schemas ──────────────────────────────────────────────────────────────

/**
 * Estructura de Gastos de Transporte B2C.
 * Replica §2 Extracción 1 fila "Gastos de Transporte (Choque)".
 * La IA DEBE diferenciar dinero diario vs. vehículo físico de reemplazo.
 */
const GastosTransporteSchema = z.object({
  tipo: GastosTransporteTipoEnum.describe(
    'Tipo de auxilio: dinero_diario (monto/día), vehiculo_reemplazo (auto alquilado), no_incluido'
  ),
  monto_diario: z.number().nullable().describe(
    'Si tipo = dinero_diario: monto en COP por día. Null si es vehículo de reemplazo o no incluido'
  ),
  dias_maximo: z.number().nullable().describe(
    'Número máximo de días del auxilio. Null si no aplica o ilimitado'
  ),
  condicion_textual: z.string().describe(
    'Texto LITERAL extraído del documento (ej: "$50,000/15 días", "Vehículo Alquilado / 20 días")'
  ),
});

/**
 * Límites de asistencias B2C — factores de decisión de compra.
 * Replica §2 Extracción 1 filas "Conductor Elegido" y "Grúa".
 * §3-C: Auditar que no sean pólizas "baratas" que limitan a 3 eventos o 50km.
 */
const AsistenciasBcSchema = z.object({
  vehiculo_reemplazo_dias: z.number().nullable().describe(
    'Días de vehículo de reemplazo incluidos (null si no aplica o si es auxilio económico)'
  ),
  grua_limite: z.string().describe(
    'Límite de la asistencia de grúa: texto extraído (ej: "50 SMDLV", "Ilimitado", "Hasta 100 KM")'
  ),
  grua_ilimitada: z.boolean().describe(
    'true si la grúa es ilimitada (en km y eventos). false si tiene tope'
  ),
  conductor_elegido_eventos: z.number().nullable().describe(
    'Número de eventos de conductor elegido por año. null si es ilimitado'
  ),
  conductor_elegido_ilimitado: z.boolean().describe(
    'true si el conductor elegido es ilimitado en eventos'
  ),
  cerrajeria: z.boolean().describe(
    'true si incluye servicio de cerrajería'
  ),
  otras_asistencias: z.array(z.string()).optional().describe(
    'Otras asistencias mencionadas (ej: "Paso de corriente", "Cambio de llanta", "Envío de combustible")'
  ),
});

/**
 * Deducible B2C por tipo de pérdida.
 * Replica §2 Extracción 2.
 * CRÍTICO: Pérdida Total DEBE ser 0% — si no, castigo severo.
 */
const AutosDeductibleSchema = z.object({
  tipo_perdida: z.string().describe(
    'Cobertura aplicable (ej: "RCE", "Pérdida Total", "Pérdidas Parciales PPD/PPH", "Accesorios")'
  ),
  porcentaje_perdida: z.number().nullable().describe(
    'Porcentaje sobre el valor de la pérdida. null si es 0% (sin deducible)'
  ),
  minimo_smmlv: z.number().nullable().describe(
    'Mínimo en SMMLV. null si no aplica o sin deducible'
  ),
  minimo_valor: z.number().nullable().describe(
    'Mínimo en moneda. null si se expresa en SMMLV o sin deducible'
  ),
  sin_deducible: z.boolean().describe(
    'true si la condición es "Sin Deducible" / 0%. OBLIGATORIO true para Pérdida Total y RCE.'
  ),
  condicion_textual: z.string().describe(
    'Texto LITERAL extraído del documento'
  ),
});

/**
 * Cobertura individual de la póliza de autos B2C.
 */
const AutosCoverageSchema = z.object({
  nombre: z.string().describe('Nombre del amparo'),
  tipo: z.enum([
    'rc_obligatorio',                     // SOAT o equivalente
    'rce_luc',                            // Límite Único Combinado de RCE
    'perdida_total_danios',               // PTD
    'perdida_total_hurto',                // PTH
    'perdida_parcial_danios',             // PPD
    'perdida_parcial_hurto',              // PPH
    'terremoto',                          // Fenómenos naturales
    'accesorios',                         // Rines, radio, blindaje
    'accidentes_personales_ocupantes',    // AP para ocupantes del vehículo
    'asistencia_vehicular',               // Grúa, cerrajería, etc.
    'gastos_transporte',                  // Movilización temporal
    'otro',
  ]).describe('Clasificación según ontología B2C'),
  incluido: z.boolean().describe('Si está incluido en la póliza'),
  limite: z.string().nullable().describe(
    'Límite o condición textual (ej: "$1,500,000,000", "100% Fasecolda")'
  ),
  detalle: z.string().nullable().describe('Condiciones especiales o exclusiones'),
});

// ── Schema Raíz ──────────────────────────────────────────────────────────────

/**
 * Esquema raíz de extracción Autos Livianos B2C.
 * Campos obligatorios marcados (sin `.nullable()` / sin `.optional()`).
 */
const AutosLivianosExtractionSchema = z.object({
  // ── Identificación ──
  aseguradora: z.string().describe('Nombre de la compañía aseguradora'),
  numero_poliza: z.string().nullable().describe('Número de póliza'),
  vigencia_desde: z.string().nullable().describe('Fecha inicio vigencia'),
  vigencia_hasta: z.string().nullable().describe('Fecha fin vigencia'),
  moneda: z.string().default('COP').describe('Moneda de la póliza'),

  // ── Activo Asegurado ──
  valor_asegurado: z.number().nullable().describe(
    'Valor asegurado del vehículo (Fasecolda o equivalente)'
  ),
  base_valoracion: z.string().default('fasecolda').describe(
    'Base de valoración del activo: "fasecolda", "valor_comercial", "valor_pactado"'
  ),
  accesorios_declarados: z.boolean().describe(
    'Si existen accesorios opcionales declarados (rines, radio, blindaje). Si false, la póliza solo cubre partes de fábrica.'
  ),
  valor_accesorios: z.number().nullable().describe(
    'Valor de los accesorios declarados. null si no aplica'
  ),

  // ── RCE / Responsabilidad Civil ──
  luc_rce: z.number().describe(
    'OBLIGATORIO: Límite Único Combinado de RCE en moneda. Mínimo ético: $2,000M–$3,000M. Límites < $1,000M son inaceptables para B2C.'
  ),
  rce_sin_deducible: z.boolean().describe(
    'true si la RCE es Sin Deducible (pago desde el primer peso). Estándar del mercado = true.'
  ),

  // ── Pérdida Total (PTD + PTH) — CAMPO CRÍTICO ──
  perdida_total_sin_deducible: z.boolean().describe(
    'OBLIGATORIO: true si Pérdida Total (daños + hurto) es 0% / Sin Deducible. Si false → CASTIGO SEVERO: la familia pierde dinero en su peor momento.'
  ),
  perdida_total_porcentaje_deducible: z.number().nullable().describe(
    'Si tiene deducible: porcentaje aplicado (ej: 10). null si sin deducible.'
  ),

  // ── Coberturas completas ──
  coberturas: z.array(AutosCoverageSchema).describe(
    'Lista de amparos identificados en la póliza B2C'
  ),

  // ── Deducibles ──
  deducibles: z.array(AutosDeductibleSchema).describe(
    'Estructura de deducibles. CRÍTICO: RCE y Pérdida Total DEBEN ser Sin Deducible.'
  ),

  // ── Gastos de Transporte — DIFERENCIADOR B2C ──
  gastos_transporte: GastosTransporteSchema.describe(
    'OBLIGATORIO: Estructura del auxilio de movilización temporal. Vehículo de reemplazo > dinero diario. La IA DEBE comparar calidad.'
  ),

  // ── Asistencias B2C — DIFERENCIADORES DE COMPRA ──
  asistencias: AsistenciasBcSchema.describe(
    'OBLIGATORIO: Límites de asistencias B2C. Grúa ilimitada > tope 50km. Conductor elegido ilimitado > 3 eventos/año.'
  ),

  // ── Económicos ──
  prima_neta: z.number().nullable().describe('Prima neta anual'),
  iva: z.number().nullable().describe('IVA'),
  prima_total: z.number().nullable().describe('Prima total a pagar'),
});

// ═════════════════════════════════════════════════════════════════════════════
// AUTOS LIVIANOS STRATEGY CLASS
// ═════════════════════════════════════════════════════════════════════════════

export class AutosLivianosStrategy implements CategoryStrategy {
  readonly categoryId = 'vehiculos_livianos' as const;
  readonly categoryLabel = 'Vehículos Livianos (Autos B2C)';

  // ── Domain Context (Sección 3: "El Por Qué") ─────────────────────

  getDomainContext(): string {
    return `Estás analizando una póliza de **Vehículos Livianos (Autos — B2C)** — un seguro INDIVIDUAL para persona natural o familia. NO es un seguro de flota empresarial. El asegurado es UNA persona cuyo patrimonio familiar depende de este vehículo para moverse, trabajar y vivir. Cada peso importa.

**REGLAS DE INFERENCIA OBLIGATORIAS PARA AUTOS B2C:**

**A. DEDUCIBLE EN PÉRDIDA TOTAL — CASTIGO SEVERO (REGLA CRÍTICA)**
Si a una familia le roban un carro de $60,000,000 y la póliza tiene deducible del 10% en Pérdida Total, reciben $54,000,000 — INSUFICIENTE para comprar un carro equivalente. La familia queda en desventaja patrimonial en su peor momento. La IA DEBE:
- Priorizar SIEMPRE cotizaciones que ofrezcan **0% de Deducible en Pérdida Total** (PTD + PTH).
- Si una aseguradora cobra deducible en Pérdida Total, catalogarla como **propuesta INFERIOR** y emitir: **🚨 ALERTA: Deducible en Pérdida Total — la familia recibirá menos dinero del que necesita para reponer el vehículo.**
- Cuantificar siempre el impacto: *"Con valor Fasecolda de $X y deducible del Y%, la familia pierde $Z."*

**B. GASTOS DE TRANSPORTE: DINERO vs. VEHÍCULO FÍSICO (REGLA DE CALIDAD DE VIDA)**
La familia necesita moverse mientras el auto está en el taller. La IA DEBE auditar y COMPARAR la calidad de este amparo:
- **Vehículo de Reemplazo** (auto alquilado pagado por la aseguradora): es la opción SUPERIOR. La familia mantiene su rutina.
- **Auxilio Diario en Dinero** (ej: $40,000–$50,000/día): apenas cubre taxis al trabajo, NO resuelve movilidad familiar completa.
- Si una cotización ofrece dinero diario y otra ofrece vehículo de reemplazo, la segunda es SIGNIFICATIVAMENTE superior en experiencia B2C.
- Evaluar cantidad de días: más días = mejor. 20 días > 15 días.

**C. ASISTENCIAS — LAS "LETRAS CHICAS" QUE IMPORTAN (REGLA DE PROTECCIÓN REAL)**
Las asistencias son diferenciadores de compra en B2C. La IA DEBE auditar:
- **Grúa:** ¿Tiene tope en kilómetros (50 KM) o en SMDLV? ¿O es ilimitada? Para familias que viajan por carretera, grúa limitada a 50 KM es INSUFICIENTE. Alertar: *"La cotización B es más económica, pero su grúa tiene un tope de 50 KM; si viaja por carretera, la cotización A es más segura."*
- **Conductor Elegido:** ¿Cuántos eventos al año? 3 eventos/año es insuficiente para uso social regular. Ilimitado es superior.
- **Cerrajería y otros:** Verificar disponibilidad.

**D. LUC DE RCE — LA RUINA DE LA CLASE MEDIA (REGLA ÉTICA)**
Los clientes B2C miran solo la cobertura de robo e ignoran que **atropellar a alguien puede embargarles la casa** por demandas civiles. La IA DEBE actuar como ASESOR ÉTICO:
- Rechazar LUC obsoletos o insuficientes: límites de $500M son inaceptables en 2026.
- Sugerir LUC mínimo de **$2,000M a $3,000M** para protección patrimonial real.
- Si una cotización ofrece LUC < $1,000M, emitir: **⚠️ ADVERTENCIA: Límite de RCE peligrosamente bajo — un accidente con lesiones graves puede superar este límite y embargar el patrimonio personal del asegurado.**
- RCE DEBE ser "Sin Deducible" (pago desde el primer peso a terceros).

**E. VALOR FASECOLDA Y ACCESORIOS**
- El vehículo se asegura por Valor Fasecolda (guía oficial), NO por un valor a elección. Depreciación mensual automática.
- Accesorios opcionales (rines de lujo, radios, blindajes) DEBEN declararse como monto extra. Si no están declarados, la póliza solo paga partes de fábrica. Alertar si el brief menciona accesorios pero la póliza no los cubre.

**F. EVALUACIÓN CON DATOS DEL BRIEF**
- Comparar el valor asegurado de la póliza vs. el valor Fasecolda declarado en el brief.
- Si la placa y modelo del brief no coinciden con los de la póliza → gap de identificación.`;
  }

  // ── Analysis Checklist ────────────────────────────────────────────

  getAnalysisChecklist(): string[] {
    return [
      'Verificar que Pérdida Total (PTD + PTH) sea SIN DEDUCIBLE — si tiene deducible, emitir alerta y cuantificar la pérdida patrimonial para la familia',
      'Extraer y evaluar LUC de RCE — mínimo ético $2,000M. Si < $1,000M, advertir riesgo de embargo patrimonial',
      'Verificar que RCE sea "Sin Deducible" (pago desde el primer peso a terceros)',
      'Auditar Gastos de Transporte: ¿Dinero diario o Vehículo de Reemplazo? Cuántos días. Vehículo físico es SUPERIOR',
      'Auditar asistencia de Grúa: ¿Ilimitada o con tope de km/SMDLV? Tope de 50 KM insuficiente para carretera',
      'Auditar Conductor Elegido: ¿Ilimitado o limitado a X eventos/año? 3 eventos es insuficiente',
      'Verificar que la base de valoración sea Fasecolda (depreciación mensual automática)',
      'Verificar si existen Accesorios Opcionales declarados — si no, la póliza solo cubre partes de fábrica',
      'Extraer deducibles de Pérdidas Parciales (PPD/PPH) — típico 10% mín 1 SMMLV',
      'Comparar valor asegurado de la póliza vs. valor del brief — alertar discrepancias',
    ];
  }

  // ── Infraseguro Rules ─────────────────────────────────────────────

  getInfraseguroRules(): string {
    return `**Reglas de Infraseguro — Autos Livianos B2C (Patrimonio Familiar)**

1. **Deducible en Pérdida Total = Catástrofe Familiar:** Si la póliza cobra deducible en PTD o PTH, la familia recibe MENOS dinero del necesario para reponer el vehículo. Ejemplo: carro de $60M con 10% deducible = la familia recibe $54M y no puede comprar uno igual. Catalogar como propuesta INFERIOR.

2. **LUC de RCE < $1,000M = Riesgo de Embargo:** En 2026, las demandas por lesiones graves o muerte superan fácilmente los $1,000M. Un LUC de $500M o $750M deja al asegurado expuesto a embargo de casa y ahorros. Mínimo ético: $2,000M–$3,000M.

3. **Auxilio Diario vs. Vehículo de Reemplazo:** Un auxilio de $40,000/día NO resuelve la movilidad de una familia (colegio, trabajo, mercado). Si una cotización ofrece vehículo de reemplazo y otra solo dinero, la primera es significativamente superior.

4. **Grúa con Tope de 50 KM:** Insuficiente para familias que viajan por carretera (Bogotá–Villavicencio = 120 KM). Alertar riesgo y recomendar grúa ilimitada.

5. **Conductor Elegido ≤ 3 Eventos/Año:** Insuficiente para uso social regular. La familia no podrá usar el servicio después de 3 reuniones sociales en enero. Destacar pólizas con ilimitado.

6. **Accesorios No Declarados:** Si el brief indica rines de lujo, blindaje u otros accesorios pero la póliza no los incluye como valor adicional, esos componentes NO están cubiertos. Alertar gap.`;
  }

  // ── Regulatory Notes ──────────────────────────────────────────────

  getRegulatoryNotes(): string {
    return `**Notas Regulatorias — Autos Livianos B2C (Colombia)**
- El SOAT (Ley 769/2002) es el seguro obligatorio de accidentes de tránsito — cubre lesiones a personas con topes mínimos. La póliza voluntaria de autos opera en EXCESO del SOAT.
- La tabla Fasecolda (Fondo de Información de la Industria Aseguradora) es la referencia oficial para el valor de indemnización de vehículos en Colombia.
- La Pérdida Total se declara cuando el costo de reparación supera el 75% del valor comercial (estándar de mercado).
- Los perjuicios extrapatrimoniales (daño moral) son reconocidos por la jurisprudencia colombiana y pueden superar ampliamente los daños materiales.
- El conductor no necesita ser el tomador — la póliza cubre al vehículo (bien asegurado), no al conductor específico, salvo exclusiones de embriaguez o documento vencido.
- La Superintendencia Financiera exige que las pólizas de autos contengan cláusula de subrogación clara.`;
  }

  // ── Field Labels (para serialización YAML) ────────────────────────

  getFieldLabels(): FieldLabelMap {
    return {
      placa: 'Placa del Vehículo',
      marca_linea: 'Marca / Línea',
      modelo_anio: 'Año del Modelo',
      valor_asegurado_vehiculo: 'Valor Asegurado (Fasecolda)',
    };
  }

  // ── PII Classification ────────────────────────────────────────────

  getPiiClassification(): Record<string, PiiClassification> {
    return {
      placa: 'mask',                // Se sanitiza → "***456" (PII vehicular — placa identificable)
      marca_linea: 'safe',          // No es PII — dato comercial del vehículo
      modelo_anio: 'safe',          // No es PII — año del modelo
      valor_asegurado_vehiculo: 'safe', // Valor del bien, no dato personal del individuo
    };
  }

  // ── Extraction Schema (Zod) ───────────────────────────────────────

  getExtractionSchema(): z.ZodType {
    return AutosLivianosExtractionSchema;
  }

  // ── Comparison Priorities ─────────────────────────────────────────

  getComparisonPriorities(): string[] {
    return [
      'Deducible en Pérdida Total: 0% (Sin Deducible) es OBLIGATORIO — castigar severamente si tiene deducible',
      'LUC de RCE: mínimo ético $2,000M–$3,000M, rechazar < $1,000M',
      'RCE Sin Deducible: pago desde el primer peso a terceros',
      'Gastos de Transporte: Vehículo de Reemplazo > Dinero Diario, más días = mejor',
      'Asistencia Grúa: Ilimitada > Tope de km/SMDLV, alertar si ≤ 50 KM',
      'Conductor Elegido: Ilimitado > X eventos/año, alertar si ≤ 3 eventos',
      'Prima total anual (relación costo/beneficio considerando calidad de coberturas)',
      'Valor asegurado vs. Fasecolda — alertar discrepancias',
      'Accesorios declarados: incluidos o no cubiertos',
      'Deducibles de Pérdidas Parciales (PPD/PPH): 10% mín 1 SMMLV es estándar',
    ];
  }
}

// ── Export Zod schemas for external use (validation, testing) ────────────────

export {
  AutosLivianosExtractionSchema,
  AutosDeductibleSchema,
  AutosCoverageSchema,
  GastosTransporteSchema,
  AsistenciasBcSchema,
  GastosTransporteTipoEnum,
  PerdidaTipoEnum,
};
