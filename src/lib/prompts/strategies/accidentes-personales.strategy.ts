// src/lib/prompts/strategies/accidentes-personales.strategy.ts
/**
 * Accidentes Personales Strategy — AP Individual y Colectivo
 *
 * Estrategia especializada para pólizas de Accidentes Personales que
 * amparan la integridad física ante eventos SÚBITOS, IMPREVISTOS,
 * VIOLENTOS, EXTERNOS e INDEPENDIENTES de la voluntad. NO es Vida.
 * NO es Salud. NO cubre enfermedades.
 *
 * Ontología codificada:
 *   - Distinción Indemnizatorio (Muerte, Invalidez) vs. Reembolso (Gastos Médicos)
 *   - Clasificación de Ocupación como input actuarial (Clase 1–4)
 *   - Exclusiones críticas: motos, deportes extremos, enfermedades
 *   - Límite Catastrófico Acumulado para pólizas colectivas (B2B)
 *   - Franquicias temporales (días de espera) en Renta Diaria
 *   - Copagos fijos en Gastos Médicos por Accidente
 *   - Diferencia médico-legal entre "Accidente" y "Enfermedad"
 *
 * Fuente de dominio: docs/knowledge/accidentes-personales-rules.md
 *
 * @module prompts/strategies/accidentes-personales.strategy
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
 * Naturaleza de la cobertura de Accidentes Personales.
 *   - indemnizatorio_principal:  Muerte Accidental, Invalidez Total y Permanente
 *                                 → pago de capital asegurado (100% o % baremo)
 *   - indemnizatorio_adicional:  Renta Diaria Hospitalaria
 *                                 → monto fijo/día durante internación
 *   - reembolso:                 Gastos Médicos por Accidente, Gastos Funerarios/Traslado
 *                                 → reembolso de gastos reales hasta límite
 */
const ApCoverageNatureEnum = z.enum([
  'indemnizatorio_principal',
  'indemnizatorio_adicional',
  'reembolso',
]);

/**
 * Clasificación de ocupación actuarial.
 * Determina la prima y las exclusiones. Clase más alta = más riesgo = más prima.
 *   - clase_1: Oficinista, profesional sedentario, administrativo
 *   - clase_2: Vendedor externo, técnico de campo sin maquinaria pesada
 *   - clase_3: Obrero, operario de maquinaria, conductor de carga
 *   - clase_4: Trabajos de alto riesgo (minería, alturas, explosivos)
 */
const OcupacionClaseEnum = z.enum([
  'clase_1',
  'clase_2',
  'clase_3',
  'clase_4',
]);

/**
 * Tipo de amparo específico de Accidentes Personales.
 */
const ApAmparoTipoEnum = z.enum([
  'muerte_accidental',                // Pago 100% a beneficiarios
  'invalidez_total_permanente',       // Pago 100% en vida (>50% capacidad perdida)
  'desmembracion_invalidez_parcial',  // Pago % según tabla baremo
  'gastos_medicos_accidente',         // Reembolso urgencias/cirugías del accidente
  'renta_diaria_hospitalizacion',     // Monto fijo/día durante internación
  'gastos_funerarios',                // Auxilio exequias
  'gastos_traslado',                  // Traslado del asegurado
  'enfermedades_tropicales',          // Si ampara (extensión especial)
  'otro',
]);

// ── Sub-schemas ──────────────────────────────────────────────────────────────

/**
 * Amparo / cobertura individual de la póliza de AP.
 * Replica §2 Extracción 1: distingue indemnizatorio de reembolso.
 */
const ApAmparoSchema = z.object({
  nombre: z.string().describe('Nombre del amparo tal como aparece en la póliza'),
  tipo: ApAmparoTipoEnum.describe('Clasificación según ontología AP'),
  naturaleza: ApCoverageNatureEnum.describe(
    'indemnizatorio_principal (muerte/invalidez), indemnizatorio_adicional (renta diaria), reembolso (gastos médicos/funerarios)'
  ),
  limite_asegurado: z.number().nullable().describe(
    'Límite o capital asegurado en moneda. null si no aplica'
  ),
  porcentaje_del_basico: z.number().nullable().describe(
    'Si el límite se expresa como % del amparo básico (muerte accidental). Ej: 20 si es "20% del Básico". null si es monto independiente.'
  ),
  monto_diario: z.number().nullable().describe(
    'Solo para renta_diaria_hospitalizacion: monto fijo por día. null para otros amparos.'
  ),
  dias_maximo: z.number().nullable().describe(
    'Solo para renta_diaria_hospitalizacion: máximo de días. null para otros amparos.'
  ),
  incluido: z.boolean().describe('Si está incluido en la póliza'),
  detalle: z.string().nullable().describe('Condiciones especiales, exclusiones aplicables'),
});

/**
 * Deducible / franquicia de AP.
 * Replica §2 Extracción 2.
 * CRÍTICO: Distingue deducibles económicos (copagos) de franquicias temporales (días de espera).
 */
const ApDeductibleSchema = z.object({
  amparo: z.string().describe(
    'Amparo al que aplica (ej: "Muerte Accidental", "Gastos Médicos", "Renta Diaria")'
  ),
  tipo_deducible: z.enum([
    'sin_deducible',         // 0% — obligatorio para Muerte e Invalidez
    'copago_fijo',           // Monto fijo por evento (ej: $50,000 COP)
    'porcentaje_gasto',      // % del gasto médico (ej: 10%)
    'franquicia_dias',       // Días de espera/carencia antes de pagar
  ]).describe(
    'Tipo: sin_deducible (obligatorio muerte/invalidez), copago_fijo, porcentaje_gasto, franquicia_dias'
  ),
  monto_copago: z.number().nullable().describe(
    'Si tipo = copago_fijo: monto en COP por evento. null para otros tipos.'
  ),
  porcentaje: z.number().nullable().describe(
    'Si tipo = porcentaje_gasto: porcentaje aplicado. null para otros tipos.'
  ),
  franquicia_en_dias: z.number().nullable().describe(
    'Si tipo = franquicia_dias: número de días de espera. Ej: 1 = paga a partir del 2do día. null para otros tipos.'
  ),
  paga_desde_primer_dia: z.boolean().describe(
    'true si no hay franquicia temporal (paga desde el día 1 de hospitalización). Superior para trabajadores independientes.'
  ),
  condicion_textual: z.string().describe(
    'Texto LITERAL extraído del documento'
  ),
});

/**
 * Exclusión relevante de la póliza de AP.
 * §3-B: Auditar exclusiones de motos y deportes extremos.
 */
const ApExclusionSchema = z.object({
  descripcion: z.string().describe('Descripción de la exclusión'),
  categoria: z.enum([
    'motocicleta',           // Excluye accidentes en moto
    'deporte_extremo',       // Excluye deportes de alto riesgo
    'enfermedad',            // No cubre eventos de origen médico
    'ocupacion_no_declarada', // Ocupación real ≠ declarada
    'guerra_terrorismo',     // Exclusiones estándar
    'intoxicacion',          // Alcohol, drogas
    'otra',
  ]).describe('Categoría de la exclusión'),
  impacto: z.string().describe(
    'Impacto práctico para el asegurado (ej: "Si usa moto para desplazarse al trabajo, NO tiene cobertura")'
  ),
});

// ── Schema Raíz ──────────────────────────────────────────────────────────────

/**
 * Esquema raíz de extracción Accidentes Personales.
 * Campos obligatorios sin `.nullable()`.
 */
const AccidentesPersonalesExtractionSchema = z.object({
  // ── Identificación ──
  aseguradora: z.string().describe('Nombre de la compañía aseguradora'),
  numero_poliza: z.string().nullable().describe('Número de póliza'),
  vigencia_desde: z.string().nullable().describe('Fecha inicio vigencia'),
  vigencia_hasta: z.string().nullable().describe('Fecha fin vigencia'),
  moneda: z.string().default('COP').describe('Moneda de la póliza'),

  // ── Tipo de Póliza ──
  es_colectiva: z.boolean().describe(
    'true si es póliza colectiva/grupo (B2B — empleados); false si es individual (B2C)'
  ),
  numero_asegurados: z.number().nullable().describe(
    'En colectivas: número de asegurados del grupo. null si individual.'
  ),

  // ── Ocupación (Input Actuarial) ──
  clase_ocupacion: OcupacionClaseEnum.nullable().describe(
    'Clase de ocupación declarada (clase_1 a clase_4). Determina prima y exclusiones. null si no se especifica.'
  ),
  ocupacion_declarada: z.string().nullable().describe(
    'Ocupación/profesión textual declarada por el asegurado'
  ),
  edades_ingreso_max: z.number().nullable().describe(
    'Edad máxima de ingreso (ej: 65 años). null si no se especifica.'
  ),
  edades_permanencia_max: z.number().nullable().describe(
    'Edad máxima de permanencia (ej: 70 años). null si no se especifica.'
  ),

  // ── Amparos (Indemnizatorios + Reembolso) ──
  amparos: z.array(ApAmparoSchema).describe(
    'Lista de amparos. CRÍTICO: Distinguir indemnizatorios (muerte, invalidez — pago de capital) de reembolso (gastos médicos — reembolso de gastos reales).'
  ),

  // ── Montos principales (acceso rápido) ──
  limite_muerte_accidental: z.number().describe(
    'OBLIGATORIO: Capital asegurado por Muerte Accidental (amparo básico / principal).'
  ),
  limite_invalidez: z.number().nullable().describe(
    'Capital asegurado por Invalidez Total y Permanente. Generalmente = 100% del básico.'
  ),
  limite_gastos_medicos: z.number().nullable().describe(
    'Límite de Gastos Médicos por Accidente. Generalmente expresado como % del básico (ej: 20%).'
  ),
  renta_diaria_monto: z.number().nullable().describe(
    'Monto diario de la Renta Hospitalaria. null si no incluida.'
  ),
  renta_diaria_dias_max: z.number().nullable().describe(
    'Máximo de días de renta diaria. null si no incluida.'
  ),

  // ── Deducibles / Franquicias ──
  deducibles: z.array(ApDeductibleSchema).describe(
    'Estructura de deducibles y franquicias. CRÍTICO: Muerte e Invalidez deben ser Sin Deducible. Buscar franquicias en días para Renta Diaria.'
  ),

  // ── Exclusiones Relevantes ──
  exclusiones: z.array(ApExclusionSchema).describe(
    'Exclusiones identificadas. CRÍTICO: Auditar exclusión de motocicletas, deportes extremos, y enfermedades.'
  ),

  // ── Límite Catastrófico (Solo Colectivas) ──
  limite_catastrofico_acumulado: z.number().nullable().describe(
    'Solo colectivas: Límite Máximo de Acumulación por Evento (catastrófico). Si 10 empleados mueren en un bus, este límite debe ser ≥ suma de todos los capitales individuales. null si individual o no especificado.'
  ),
  limite_catastrofico_suficiente: z.boolean().nullable().describe(
    'Solo colectivas: true si el límite catastrófico ≥ (numero_asegurados × limite_muerte_accidental). false si es insuficiente → penalizar. null si individual.'
  ),

  // ── Económicos ──
  prima_neta: z.number().nullable().describe('Prima neta'),
  iva: z.number().nullable().describe('IVA'),
  prima_total: z.number().nullable().describe('Prima total a pagar'),

  // ── Uso de Motocicleta (Auditoría Específica) ──
  cubre_motocicleta: z.boolean().describe(
    'OBLIGATORIO: true si la póliza cubre accidentes en motocicleta. false si excluye expresamente o no lo menciona. Si false y el asegurado usa moto → ALERTA CRÍTICA.'
  ),

  // ── Baremo / Tabla de Indemnización ──
  tabla_baremo_incluida: z.boolean().describe(
    'true si la póliza incluye tabla baremo (porcentajes de indemnización por tipo de lesión/desmembración). false si no se menciona.'
  ),
});

// ═════════════════════════════════════════════════════════════════════════════
// ACCIDENTES PERSONALES STRATEGY CLASS
// ═════════════════════════════════════════════════════════════════════════════

export class AccidentesPersonalesStrategy implements CategoryStrategy {
  readonly categoryId = 'accidentes_personales' as const;
  readonly categoryLabel = 'Accidentes Personales (Individual / Colectivo)';

  // ── Domain Context (Sección 3: "El Por Qué") ─────────────────────

  getDomainContext(): string {
    return `Estás analizando una póliza de **Accidentes Personales (AP)** — un seguro que ampara la integridad física del asegurado EXCLUSIVAMENTE ante eventos que sean SÚBITOS, IMPREVISTOS, VIOLENTOS, EXTERNOS e INDEPENDIENTES de su voluntad. Puede ser individual (B2C) o colectivo/grupo (B2B para empleados).

**⚠️ DISTINCIÓN FUNDAMENTAL QUE DEBES ACLARAR AL USUARIO:**
- **ACCIDENTE ≠ ENFERMEDAD.** Esta póliza NO cubre enfermedades degenerativas, paros cardíacos espontáneos, cáncer, ACV ni ningún evento de origen médico/orgánico. Si un asegurado sufre un infarto mientras maneja y choca, la causa es médica → NO HAY COBERTURA AP. Este es el motivo #1 de reclamos rechazados.
- Si el cliente busca proteger a su familia "por su salud o por su edad", DEBES recomendar una póliza de **Vida** en su lugar.
- Si el cliente busca protegerse porque "viaja en moto" o "trabaja en campo", AP es el producto CORRECTO.

**REGLAS DE INFERENCIA OBLIGATORIAS PARA ACCIDENTES PERSONALES:**

**A. EXCLUSIÓN DE MOTOCICLETA — ALERTA CRÍTICA (REGLA DE RETICENCIA)**
Muchas pólizas de AP excluyen accidentes ocurridos mientras el asegurado conduce o es pasajero de motocicleta. La IA DEBE:
- Auditar SIEMPRE si la póliza cubre o excluye expresamente el uso de moto.
- Si el brief indica que el asegurado usa moto (por ocupación o declaración) y la póliza excluye motos, emitir: **🚨 ALERTA CRÍTICA: La póliza EXCLUYE accidentes en motocicleta. Si el asegurado usa moto regularmente, esta cobertura es INÚTIL — no pagará en el escenario más probable de accidente.**
- Auditar también exclusiones de deportes extremos (parapente, buceo, alpinismo).

**B. RETICENCIA EN LA PROFESIÓN — RIESGO MORAL (REGLA DE OCUPACIÓN)**
La clasificación de ocupación (Clase 1 a 4) determina la prima y las exclusiones. Si un obrero se declara como oficinista para pagar menos prima, la aseguradora RECHAZARÁ el siniestro por reticencia. La IA DEBE:
- Advertir: *"Verifique que la póliza cubra su ocupación REAL y todos sus medios de transporte habituales; una declaración incorrecta anula la cobertura."*
- Si el brief indica una ocupación de riesgo pero la póliza clasifica al asegurado en Clase 1 (oficinista), alertar discrepancia.

**C. LÍMITE CATASTRÓFICO ACUMULADO — PÓLIZAS COLECTIVAS (REGLA B2B)**
En pólizas colectivas (grupo de empleados), si ocurre un accidente masivo (bus de la empresa se accidenta), la aseguradora paga hasta un "Límite Máximo de Acumulación por Evento". La IA DEBE:
- Verificar que el límite catastrófico ≥ (número de asegurados × capital individual de muerte accidental).
- Si el límite es insuficiente, penalizar: **⚠️ ADVERTENCIA: El Límite Catastrófico Acumulado ($X) es inferior a la suma de capitales individuales ($Y). Si mueren 10+ empleados en un mismo evento, la indemnización a cada familia se reducirá proporcionalmente.**
- En pólizas individuales, este campo no aplica.

**D. FRANQUICIAS TEMPORALES EN RENTA DIARIA (REGLA DE LIQUIDEZ)**
La Renta Diaria Hospitalaria compensa ingresos mientras el asegurado está internado. Las franquicias temporales (días de espera) reducen el beneficio:
- Pólizas que pagan "Desde el primer día" son SUPERIORES.
- Si la franquicia es de 3 días y la hospitalización dura 5, el asegurado solo cobra 2 días.
- Para trabajadores independientes (sin salario fijo), los primeros días son los más críticos económicamente.
- La IA DEBE destacar las pólizas que pagan desde el día 1 y penalizar franquicias largas.

**E. AMPAROS INDEMNIZATORIOS vs. REEMBOLSO — NO CONFUNDIR**
- **Indemnizatorios** (Muerte, Invalidez): pagan un capital fijo sin importar gastos reales. No tienen deducible por ley.
- **Reembolso** (Gastos Médicos): reembolsan gastos REALES hasta un tope, con copagos o deducibles.
- La IA NO debe comparar el límite de Gastos Médicos ($20M) con el de Muerte ($100M) como si fueran equivalentes — son naturalezas distintas.
- Muerte e Invalidez DEBEN tener 0% de deducible (es obligación legal).

**F. EVALUACIÓN CON DATOS DEL BRIEF**
- Comparar los límites solicitados en el brief vs. los ofrecidos en la póliza.
- Si la ocupación del brief no coincide con la clasificación de la póliza → alerta de reticencia.
- Si el brief es colectivo, verificar número de asegurados y cálculo de límite catastrófico.`;
  }

  // ── Analysis Checklist ────────────────────────────────────────────

  getAnalysisChecklist(): string[] {
    return [
      'ACLARAR que AP NO cubre enfermedades — solo eventos súbitos, imprevistos, violentos, externos. Si el cliente busca protección por salud/edad, recomendar Vida',
      'Auditar exclusión de MOTOCICLETA — si excluye y el asegurado usa moto, la póliza es INÚTIL para su escenario más probable',
      'Auditar exclusión de deportes extremos — parapente, buceo, alpinismo, escalada',
      'Verificar clasificación de ocupación (Clase 1–4) y coherencia con la ocupación real del asegurado',
      'Distinguir amparos INDEMNIZATORIOS (Muerte, Invalidez — capital fijo) de REEMBOLSO (Gastos Médicos — gastos reales)',
      'Verificar que Muerte Accidental e Invalidez sean SIN DEDUCIBLE (obligación legal)',
      'Extraer copago de Gastos Médicos por Accidente (monto fijo o % del gasto)',
      'Extraer franquicia en días de Renta Diaria Hospitalaria — pagar desde día 1 es SUPERIOR',
      'En COLECTIVAS: verificar Límite Catastrófico Acumulado ≥ (nº asegurados × capital individual)',
      'Comparar límites del brief vs. póliza — alertar si la póliza ofrece menos de lo solicitado',
    ];
  }

  // ── Infraseguro Rules ─────────────────────────────────────────────

  getInfraseguroRules(): string {
    return `**Reglas de Infraseguro — Accidentes Personales (Integridad Física)**

1. **Póliza Excluye Motos + Asegurado Usa Moto = Cobertura Inútil:** No es un "gap menor" — es la anulación completa del producto para su caso de uso más probable. Equivale a vender un paraguas con agujeros.

2. **Ocupación Real ≠ Ocupación Declarada = Siniestro Rechazado:** Si un conductor de carga (Clase 3) se declaró como oficinista (Clase 1) para pagar menos prima, la aseguradora invocará reticencia y no pagará. Alertar siempre.

3. **Límite Catastrófico Insuficiente en Colectivas:** Si una empresa con 50 empleados tiene capital individual de $100M pero límite catastrófico de $2,000M, solo cubre 20 muertes simultáneas. Con 30 fallecidos, cada familia recibiría $66M en vez de $100M. Penalizar severamente.

4. **Franquicia de 3+ Días en Renta Diaria:** Para un independiente que gana $200,000 diarios, 3 días sin compensación = $600,000 de bolsillo en su momento más vulnerable. Pólizas con pago desde el día 1 son SIGNIFICATIVAMENTE superiores.

5. **Gastos Médicos = 10% del Básico:** Si el capital de muerte es $100M pero los gastos médicos solo cubren $10M, una cirugía de emergencia por accidente puede costar $15M–$20M. Alertar límite insuficiente.

6. **Confundir AP con Vida o Salud:** Si el análisis sugiere que el cliente realmente necesita un seguro de Vida (protección por enfermedad/edad) o de Salud (cobertura médica amplia), la IA DEBE señalarlo explícitamente — vender AP a quien necesita Vida es negligencia.`;
  }

  // ── Regulatory Notes ──────────────────────────────────────────────

  getRegulatoryNotes(): string {
    return `**Notas Regulatorias — Accidentes Personales (Colombia)**
- Los amparos de Muerte Accidental e Invalidez Total y Permanente son indemnizatorios: NO tienen deducible (obligación legal del ramo).
- La tabla baremo (Decreto 2463/2001, actualizado) establece los porcentajes de indemnización por tipo de lesión/desmembración.
- La calificación de invalidez > 50% de pérdida de capacidad laboral se rige por la normativa de la Junta de Calificación de Invalidez.
- En pólizas colectivas, el tomador (empresa) y el asegurado (empleado) son personas distintas — el beneficiario es quien designa el asegurado.
- Las exclusiones de motocicleta deben estar expresamente indicadas en las condiciones particulares (Circular Externa 029 de la SFC).
- El seguro AP es complementario al Sistema General de Riesgos Laborales (ARL) — NO lo sustituye. La ARL cubre accidentes de trabajo; AP cubre accidentes en cualquier momento.
- La reticencia o inexactitud en la declaración de ocupación da derecho a la aseguradora a rescindir el contrato (Art. 1058 del Código de Comercio).`;
  }

  // ── Field Labels (para serialización YAML) ────────────────────────

  getFieldLabels(): FieldLabelMap {
    return {
      limite_muerte_accidental: 'Límite Muerte Accidental (Capital Básico)',
      limite_desmembracion: 'Límite Desmembración / Invalidez Parcial',
      limite_gastos_medicos: 'Límite Gastos Médicos por Accidente',
      limite_renta_hospitalizacion: 'Renta Diaria por Hospitalización',
      ocupacion_asegurado: 'Ocupación / Profesión Declarada',
    };
  }

  // ── PII Classification ────────────────────────────────────────────

  getPiiClassification(): Record<string, PiiClassification> {
    return {
      limite_muerte_accidental: 'safe',        // Monto de cobertura, no dato personal
      limite_desmembracion: 'safe',             // Monto de cobertura
      limite_gastos_medicos: 'safe',            // Monto de cobertura
      limite_renta_hospitalizacion: 'safe',     // Monto de cobertura
      ocupacion_asegurado: 'mask',              // Puede identificar a la persona → se sanitiza
    };
  }

  // ── Extraction Schema (Zod) ───────────────────────────────────────

  getExtractionSchema(): z.ZodType {
    return AccidentesPersonalesExtractionSchema;
  }

  // ── Comparison Priorities ─────────────────────────────────────────

  getComparisonPriorities(): string[] {
    return [
      'Cobertura de motocicleta: incluida vs. excluida (si excluye y usa moto = inútil)',
      'Capital de Muerte Accidental (amparo básico): mayor capital = mejor',
      'Invalidez Total y Permanente: límite y si es 100% del básico',
      'Muerte e Invalidez SIN DEDUCIBLE (obligación legal — castigar si tiene)',
      'Gastos Médicos: límite absoluto y % del básico (mínimo 20% recomendado)',
      'Copago de Gastos Médicos: monto fijo vs. % del gasto',
      'Renta Diaria: monto/día, máximo de días, y si paga desde el día 1 (sin franquicia)',
      'Límite Catastrófico Acumulado (colectivas): ≥ nº asegurados × capital individual',
      'Exclusiones de deportes extremos y actividades de riesgo',
      'Prima total (relación costo/beneficio según clase de ocupación)',
    ];
  }
}

// ── Export Zod schemas for external use (validation, testing) ────────────────

export {
  AccidentesPersonalesExtractionSchema,
  ApAmparoSchema,
  ApDeductibleSchema,
  ApExclusionSchema,
  ApCoverageNatureEnum,
  OcupacionClaseEnum,
  ApAmparoTipoEnum,
};
