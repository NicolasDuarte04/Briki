// src/lib/prompts/strategies/rce.strategy.ts
/**
 * RCE Strategy — Responsabilidad Civil Extracontractual
 *
 * Estrategia especializada para pólizas de responsabilidad civil
 * corporativa. Codifica la ontología completa del ramo RCE incluyendo:
 *   - Estructura de límites (LUC, PLO, sublímites vs. adicionales)
 *   - Amparos específicos (Patronal, Contratistas, Vehículos, Gastos Médicos)
 *   - Deducibles jurídicos ("en exceso de", "sin deducible", % de la pérdida)
 *   - Reglas de inferencia comparativa (sublímites vs. adicionales, ARL vs. Patronal)
 *   - Esquema Zod de extracción (límites por evento/vigencia + deducibles literales)
 *
 * Fuente de dominio: docs/knowledge/rce-rules.md
 *
 * @module prompts/strategies/rce.strategy
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
 * Tipo de deducible en pólizas de RCE.
 *
 * La distinción es jurídica, no solo financiera:
 *   - porcentaje_perdida: X% del monto de la pérdida (estándar para PLO)
 *   - en_exceso:          opera sobre otra cobertura primaria (ARL, SOAT, póliza autos)
 *   - sin_deducible:      el tercero recibe atención inmediata (Gastos Médicos)
 *   - monto_fijo:         cifra fija en moneda
 */
const RceDeductibleTypeEnum = z.enum([
  'porcentaje_perdida',
  'en_exceso',
  'sin_deducible',
  'monto_fijo',
]);

/**
 * Naturaleza del límite del amparo respecto al PLO.
 *
 * Distinción CRÍTICA (Regla A del manual):
 *   - sublimite:  RESTA del LUC/PLO → capacidad total NO aumenta
 *   - adicional:  SE SUMA al LUC/PLO → capacidad indemnizatoria real MAYOR
 *   - compartido: límite compartido con otro amparo
 */
const LimitNatureEnum = z.enum([
  'sublimite',
  'adicional',
  'compartido',
]);

/**
 * Estructura de un límite asegurado por amparo, capturando
 * la dualidad por Evento vs. por Vigencia.
 */
const RceLimitLineSchema = z.object({
  amparo: z.string().describe(
    'Nombre del amparo (ej: PLO, RC Patronal, RC Vehículos, Gastos Médicos)'
  ),
  limite_por_evento: z.number().nullable().describe(
    'Límite máximo por evento/siniestro individual. Null si no especificado'
  ),
  limite_por_vigencia: z.number().nullable().describe(
    'Límite máximo agregado por vigencia de la póliza. Null si no especificado'
  ),
  naturaleza: LimitNatureEnum.nullable().describe(
    'Si el amparo es sublimite (resta del PLO), adicional (se suma), o compartido. Null si es el PLO base'
  ),
});

/**
 * Estructura de un deducible/franquicia de amparo RCE,
 * con captura de la condición jurídica literal.
 */
const RceDeductibleSchema = z.object({
  cobertura: z.string().describe(
    'Amparo al que aplica (ej: PLO, RC Patronal, Gastos Médicos, RC Vehículos)'
  ),
  tipo_deducible: RceDeductibleTypeEnum.describe(
    'Clasificación: porcentaje_perdida, en_exceso (de ARL/SOAT/póliza primaria), sin_deducible, monto_fijo'
  ),
  porcentaje: z.number().nullable().describe(
    'Porcentaje de la pérdida (ej: 10 para 10%). Null si no aplica'
  ),
  minimo_smmlv: z.number().nullable().describe(
    'Mínimo en SMMLV. Null si no aplica'
  ),
  minimo_valor: z.number().nullable().describe(
    'Mínimo en moneda. Null si se expresa en SMMLV o no aplica'
  ),
  en_exceso_de: z.string().nullable().describe(
    'Descripción de la cobertura primaria sobre la que opera en exceso (ej: "Seguridad Social (ARL)", "SOAT y póliza primaria de mínimo $100M COP"). Null si no aplica'
  ),
  condicion_textual: z.string().describe(
    'Texto LITERAL extraído del documento describiendo la condición del deducible'
  ),
});

/**
 * Cobertura / amparo individual extraído del documento RCE.
 */
const RceCoverageSchema = z.object({
  nombre: z.string().describe('Nombre del amparo'),
  tipo: z.enum([
    'basico',        // PLO — corazón de la póliza
    'patronal',      // RC Patronal (demandas de empleados)
    'contratistas',  // RC Contratistas y Subcontratistas
    'vehiculos',     // RC Vehículos Propios y No Propios
    'parqueaderos',  // RC Parqueaderos
    'cuidado',       // Bienes bajo cuidado, tenencia y control
    'gastos_medicos',// Gastos Médicos (sin análisis de culpa)
    'productos',     // RC Productos/Completadas
    'otro',          // Amparos no clasificados
  ]).describe('Clasificación del amparo según la ontología RCE'),
  incluido: z.boolean().describe('Si está incluido en la póliza'),
  detalle: z.string().nullable().describe('Detalle adicional o condiciones especiales'),
});

/**
 * Esquema raíz de extracción RCE — combina todos los sub-esquemas.
 */
const RceExtractionSchema = z.object({
  // Identificación
  aseguradora: z.string().describe('Nombre de la compañía aseguradora'),
  numero_poliza: z.string().nullable().describe('Número de póliza'),
  vigencia_desde: z.string().nullable().describe('Fecha inicio vigencia'),
  vigencia_hasta: z.string().nullable().describe('Fecha fin vigencia'),
  moneda: z.string().default('COP').describe('Moneda de la póliza'),

  // Actividad económica amparada
  actividad_economica_asegurada: z.string().nullable().describe(
    'Descripción de la actividad económica amparada según la póliza'
  ),
  codigo_ciiu: z.string().nullable().describe('Código CIIU si se especifica en la póliza'),

  // Límite Único Combinado
  limite_unico_combinado: z.number().nullable().describe(
    'LUC — Monto máximo total que pagará la aseguradora por todos los eventos en la vigencia'
  ),

  // Estructura de límites por amparo (por Evento Y por Vigencia)
  limites: z.array(RceLimitLineSchema).describe(
    'Estructura de límites asegurados. CRÍTICO: capturar si es por Evento y/o por Vigencia, y si es sublímite o límite adicional'
  ),

  // Coberturas
  coberturas: z.array(RceCoverageSchema).describe(
    'Lista de amparos identificados en la póliza, clasificados por tipo'
  ),

  // Deducibles (con condición jurídica literal)
  deducibles: z.array(RceDeductibleSchema).describe(
    'Estructura de deducibles. CRÍTICO: capturar tipo (porcentaje_perdida, en_exceso, sin_deducible) y condición textual literal'
  ),

  // Económicos
  prima_neta: z.number().nullable().describe('Prima neta'),
  iva: z.number().nullable().describe('IVA'),
  prima_total: z.number().nullable().describe('Prima total a pagar'),

  // Cláusulas especiales
  retroactividad: z.string().nullable().describe('Fecha o condición de retroactividad si aplica'),
  territorio: z.string().nullable().describe('Territorio/jurisdicción cubierta'),
  coaseguro: z.string().nullable().describe('Detalle de coaseguro si aplica'),
});

// ═════════════════════════════════════════════════════════════════════════════
// RCE STRATEGY CLASS
// ═════════════════════════════════════════════════════════════════════════════

export class RceStrategy implements CategoryStrategy {
  readonly categoryId = 'rce' as const;
  readonly categoryLabel = 'Responsabilidad Civil Extracontractual (RCE)';

  // ── Domain Context (Sección 3: "El Por Qué") ─────────────────────

  getDomainContext(): string {
    return `Estás analizando una póliza de **Responsabilidad Civil Extracontractual (RCE)** — protege el patrimonio del asegurado frente a la obligación legal de indemnizar a terceros por daños derivados de su actividad económica.

**REGLAS DE INFERENCIA OBLIGATORIAS PARA RCE:**

**A. SUBLÍMITES vs. LÍMITES ADICIONALES — LA TRAMPA MATEMÁTICA (REGLA CRÍTICA)**
Al analizar una póliza RCE, DEBES identificar para CADA amparo accesorio si su límite es un **Sublímite** (RESTA del PLO/LUC → la capacidad total de la póliza NO aumenta) o un **Límite Adicional** (SE SUMA al PLO/LUC → la capacidad indemnizatoria real es MAYOR). Ejemplo: Si la Aseguradora A ofrece PLO $1,000M con RC Patronal como sublímite de $500M, y la Aseguradora B ofrece PLO $1,000M con RC Patronal como límite adicional de $500M, la Aseguradora B es CONTUNDENTEMENTE superior — su capacidad total real es $1,500M vs. $1,000M de la A. SIEMPRE resalta esta diferencia en comparaciones.

**B. GASTOS MÉDICOS — SIN DEDUCIBLE ES OBLIGATORIO**
Los "Gastos Médicos" DEBEN figurar "Sin Deducible" en una póliza RCE bien estructurada. Este amparo permite atención hospitalaria inmediata del tercero lesionado sin análisis previo de culpa. Si una póliza impone deducible en Gastos Médicos, PENALÍZALA en el análisis — forzará a la empresa a cubrir el gasto de bolsillo, lo que derivará en demandas mayores por daño moral.

**C. RC PATRONAL vs. ARL — NO SON SUSTITUTOS**
La RC Patronal opera "En Exceso" de la Seguridad Social (ARL). La ARL cubre gastos médicos laborales y pensión. La RC Patronal cubre las **demandas civiles por Daños Morales y Lucro Cesante futuro** de la familia del trabajador si hubo negligencia del empleador. Son complementarias, NO excluyentes. Si el brief muestra una nómina significativa y la póliza NO incluye RC Patronal, emite una advertencia de gap crítico. El deducible de RC Patronal es típicamente "En exceso de la Seguridad Social" — asegúrate de extraerlo así.

**D. RC VEHÍCULOS — PÓLIZA SOMBRILLA Y UMBRALES DE ACTIVACIÓN**
La RC Vehículos Propios y No Propios opera como "Póliza Sombrilla" — en exceso del SOAT y la póliza primaria de autos. DEBES extraer el monto mínimo exigido en la póliza primaria para que se active esta cobertura corporativa. Si la aseguradora exige una póliza primaria con un límite inalcanzable o inusualmente alto, advierte al usuario que la cobertura podría ser difícil de activar en la práctica.

**E. EVALUACIÓN CON DATOS DEL BRIEF**
- Compara el LUC/PLO contra los Ingresos Anuales declarados en el brief. En general, el límite debería ser al menos 10-20% de los ingresos anuales para empresas con riesgo moderado.
- Si el brief incluye Valor de Nómina Anual y hay RC Patronal, evalúa si el sublímite/límite patronal es razonable frente al tamaño de la nómina.`;
  }

  // ── Analysis Checklist ────────────────────────────────────────────

  getAnalysisChecklist(): string[] {
    return [
      'Extraer el Límite Único Combinado (LUC) y el límite PLO — verificar si son iguales o diferentes',
      'Para CADA amparo accesorio, identificar explícitamente si es SUBLÍMITE (resta del PLO) o LÍMITE ADICIONAL (se suma al PLO)',
      'Extraer límites duales: por Evento Y por Vigencia para cada amparo',
      'Extraer condición de deducible LITERAL de cada amparo — clasificar como porcentaje_perdida, en_exceso, sin_deducible, o monto_fijo',
      'Verificar que Gastos Médicos figure "Sin Deducible" — alertar si tiene deducible',
      'Verificar presencia de RC Patronal si el brief indica nómina significativa — alertar gap si falta',
      'Para RC Patronal: confirmar que opera "En Exceso de la Seguridad Social (ARL)"',
      'Para RC Vehículos: extraer el monto mínimo exigido en la póliza primaria de autos para activación',
      'Comparar LUC/PLO contra Ingresos Anuales del brief (regla: al menos 10-20% de ingresos)',
      'Identificar actividad económica amparada y verificar coherencia con el perfil del caso',
    ];
  }

  // ── Infraseguro Rules ─────────────────────────────────────────────

  getInfraseguroRules(): string {
    return `**Reglas de Infraseguro — RCE (Capacidad Indemnizatoria)**

1. **LUC vs. Ingresos:** Si el Límite Único Combinado es menor al 10% de los Ingresos Anuales declarados en el brief, emitir alerta de sublimitación. Empresas con exposición alta (construcción, salud, manufactura) necesitan al menos 15-20%.

2. **Sublímites que Erosionan el PLO:** Si varios amparos son sublímites y su suma supera el 60% del PLO, la capacidad residual para incidentes en PLO base se reduce peligrosamente. Calcular la "capacidad neta PLO" y alertar si es insuficiente.

3. **RC Patronal Insuficiente:** Con nóminas anuales superiores a $500M COP, un sublímite patronal menor a $500M es potencialmente insuficiente ante una demanda colectiva por accidente laboral grave.

4. **Gastos Médicos con Sublímite Bajo:** Si el sublímite de Gastos Médicos es inferior a $20M por evento, advertir que podría no cubrir una sola emergencia hospitalaria seria.

5. **RC Vehículos con Umbral Inalcanzable:** Si la póliza exige una primaria de autos de $500M o más para activar RC Vehículos, evaluar si la empresa realmente tiene esas pólizas primarias.`;
  }

  // ── Regulatory Notes ──────────────────────────────────────────────

  getRegulatoryNotes(): string {
    return `**Notas Regulatorias — RCE (Colombia)**
- La obligación de reparar daños a terceros se fundamenta en el Art. 2341 y ss. del Código Civil Colombiano.
- Ciertos sectores tienen obligatoriedad de RC: construcción (Ley 400/1997), salud (Ley 1438/2011), transporte (Decreto 101/2000).
- La RC Patronal complementa la Ley 1562 de 2012 (Sistema de Riesgos Laborales) — NO la reemplaza.
- El SOAT (Seguro Obligatorio de Accidentes de Tránsito) es la base mínima exigida; la RC Vehículos corporativa opera en exceso.
- Superintendencia Financiera exige que las condiciones de retroactividad estén claramente definidas en la carátula de la póliza.`;
  }

  // ── Field Labels (para serialización YAML) ────────────────────────

  getFieldLabels(): FieldLabelMap {
    return {
      limite_asegurado: 'Límite Asegurado Solicitado',
      ingresos_anuales: 'Ingresos Anuales de la Empresa',
      valor_nomina_anual: 'Valor de Nómina Anual',
    };
  }

  // ── PII Classification ────────────────────────────────────────────

  getPiiClassification(): Record<string, PiiClassification> {
    return {
      // Montos financieros: SAFE — son datos de sizing, no PII
      limite_asegurado: 'safe',
      ingresos_anuales: 'safe',
      valor_nomina_anual: 'safe',
    };
  }

  // ── Extraction Schema (Zod) ───────────────────────────────────────

  getExtractionSchema(): z.ZodType {
    return RceExtractionSchema;
  }

  // ── Comparison Priorities ─────────────────────────────────────────

  getComparisonPriorities(): string[] {
    return [
      'Límite Único Combinado (LUC) y límite PLO',
      'Naturaleza de cada amparo: sublímite vs. límite adicional (impacto en capacidad real)',
      'Límite de RC Patronal y su tipo (sublímite/adicional) — cruzar con nómina del brief',
      'Deducible de Gastos Médicos: penalizar si NO es "Sin Deducible"',
      'Condición de activación de RC Vehículos (monto mínimo exigido en póliza primaria)',
      'Deducibles de PLO: porcentaje y mínimo en SMMLV',
      'Prima total y relación prima/límite',
      'Territorio y retroactividad',
      'Presencia de amparos: Contratistas, Parqueaderos, Bienes bajo cuidado',
      'Cobertura de RC Productos/Completadas (relevante para manufactura)',
    ];
  }
}

// ── Export Zod schemas for external use (validation, testing) ────────────────

export {
  RceExtractionSchema,
  RceLimitLineSchema,
  RceDeductibleSchema,
  RceCoverageSchema,
  RceDeductibleTypeEnum,
  LimitNatureEnum,
};
