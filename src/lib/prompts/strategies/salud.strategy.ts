// src/lib/prompts/strategies/salud.strategy.ts
/**
 * Salud Strategy — Gastos Médicos Mayores (B2C Familiar)
 *
 * Estrategia especializada para pólizas de Salud / GMM que protegen
 * el patrimonio familiar frente a costos catastróficos derivados de
 * enfermedades graves, cirugías o accidentes.
 *
 * Ontología codificada:
 *   - Perfil biométrico: edad por tramos quinquenales, cuestionario médico
 *   - Coberturas In-Patient (hospitalización, cirugía, UCI, prótesis)
 *   - Coberturas Out-Patient (ambulatorio, maternidad, catastróficas, internacional)
 *   - Participación económica GRANULAR:
 *       · Copago ambulatorio (monto fijo por consulta)
 *       · Deducible (anual_acumulable vs. por_evento) — diferencia crítica
 *       · Coaseguro (% a cargo del asegurado)
 *       · Stop-Loss (tope máximo del coaseguro) — si falta = cheque en blanco
 *   - Red Cerrada (pago directo) vs. Red Abierta (reembolso — impacto liquidez)
 *   - Carencias (periodos de espera) y Certificado de Continuidad
 *   - Maternidad con tope o al 100%
 *
 * Fuente de dominio: docs/knowledge/salud-rules.md
 *
 * @module prompts/strategies/salud.strategy
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
 * Tipo de deducible — diferencia financiera BRUTAL.
 * §3-A: "Deducible por Evento" de $3M = paga $3M por apendicitis Y OTROS
 * $3M si se fractura. "Anual" = una vez paga $3M, el resto del año sale al 100%.
 */
const DeducibleTipoEnum = z.enum([
  'anual_acumulable',   // Paga una sola vez al año — SUPERIOR
  'por_evento',         // Paga cada vez que hay un evento mayor — INFERIOR
  'desconocido',        // No se puede determinar del documento
]);

/**
 * Tipo de red hospitalaria.
 *   - cerrada:    Pago directo en clínicas aliadas. Solo copago.
 *   - abierta:    Libre elección pero con REEMBOLSO (impacto liquidez).
 *   - mixta:      Red preferente con opción de reembolso fuera de red.
 */
const RedHospitalariaEnum = z.enum([
  'cerrada',
  'abierta',
  'mixta',
]);

/**
 * Tipo de habitación hospitalaria.
 */
const HabitacionEnum = z.enum([
  'compartida',
  'individual',
  'suite',
]);

/**
 * Tipo de cobertura médica.
 */
const SaludCoberturaTipoEnum = z.enum([
  // In-Patient
  'hospitalizacion',           // Habitación, UCI, cuidados
  'cirugia',                   // Derechos de sala, anestesia
  'honorarios_medicos',        // Cirujanos, especialistas
  'insumos_protesis',          // Medicamentos, osteosíntesis, marcapasos
  // Out-Patient
  'ambulatorio_consultas',     // Consultas directas con especialistas
  'ambulatorio_diagnostico',   // TAC, Resonancias, exámenes
  'ambulatorio_terapias',      // Fisioterapia, rehabilitación
  'maternidad',                // Parto, cesárea, complicaciones, recién nacido
  'enfermedades_catastroficas', // Quimio, radio, diálisis
  'asistencia_internacional',  // Urgencias viaje, redes mundiales
  'dental',                    // Odontología
  'optica',                    // Lentes, optometría
  'medicamentos_ambulatorios', // Medicamentos fuera de hospitalización
  'otro',
]);

// ── Sub-schemas ──────────────────────────────────────────────────────────────

/**
 * Cobertura individual de la póliza de salud.
 */
const SaludCoverageSchema = z.object({
  nombre: z.string().describe('Nombre de la cobertura'),
  tipo: SaludCoberturaTipoEnum.describe('Clasificación según ontología de salud'),
  incluido: z.boolean().describe('Si está incluido'),
  limite: z.string().nullable().describe(
    'Límite o condición textual (ej: "$1,000,000,000 anual", "Ilimitado", "$10M tope maternidad")'
  ),
  requiere_carencia: z.boolean().nullable().describe(
    'true si la cobertura tiene periodo de espera/carencia. null si no se menciona.'
  ),
  carencia_meses: z.number().nullable().describe(
    'Meses de carencia/espera. null si no aplica o sin carencia.'
  ),
  detalle: z.string().nullable().describe('Condiciones especiales, exclusiones'),
});

/**
 * Participación económica del asegurado — GRANULARIDAD MÁXIMA.
 * §2 Extracción 2: Copago, Deducible, Coaseguro, Stop-Loss.
 * El LLM confunde estos tres términos. Su extracción independiente es OBLIGATORIA.
 */
const ParticipacionEconomicaSchema = z.object({
  // ── Copagos (Eventos Menores) ──
  copagos_ambulatorios: z.number().nullable().describe(
    'Monto fijo en COP por cada consulta médica o examen ambulatorio. Ej: $50,000. null si sin copago ambulatorio.'
  ),
  copagos_urgencias: z.number().nullable().describe(
    'Copago por atención de urgencias. null si sin copago o si no se diferencia del ambulatorio.'
  ),

  // ── Deducible (Eventos Mayores) — DIFERENCIA CRÍTICA ──
  deducible_tipo: DeducibleTipoEnum.describe(
    'OBLIGATORIO: anual_acumulable (paga UNA vez/año, luego 100%) vs. por_evento (paga CADA hospitalización). Si no se puede determinar: desconocido.'
  ),
  deducible_valor: z.number().nullable().describe(
    'Valor del deducible en COP. Ej: $2,000,000. null si no tiene deducible.'
  ),
  deducible_aplica_a: z.string().nullable().describe(
    'A qué aplica el deducible (ej: "Hospitalización", "Todos los eventos mayores", "Fuera de red"). null si general.'
  ),

  // ── Coaseguro (Riesgo Compartido) ──
  coaseguro_porcentaje: z.number().nullable().describe(
    'Porcentaje a cargo del asegurado en reembolsos/eventos mayores. Ej: 10, 20. null si sin coaseguro.'
  ),
  coaseguro_aplica_a: z.string().nullable().describe(
    'Contexto del coaseguro (ej: "Reembolsos fuera de red", "Todos los eventos", "Solo ambulatorio"). null si general.'
  ),

  // ── Stop-Loss (Tope del Coaseguro) — PROTECCIÓN CATASTRÓFICA ──
  coaseguro_stop_loss_valor: z.number().nullable().describe(
    'Tope máximo anual del coaseguro en COP. Ej: $5,000,000. Si hay coaseguro pero NO hay stop-loss → la familia queda expuesta sin límite. null si no hay coaseguro o si no se especifica tope.'
  ),
  tiene_stop_loss: z.boolean().describe(
    'true si existe cláusula de Stop-Loss / Tope de Coaseguro. Si hay coaseguro > 0% y tiene_stop_loss = false → PENALIZAR SEVERAMENTE.'
  ),

  // ── Texto original ──
  condicion_textual: z.string().describe(
    'Texto LITERAL extraído del documento describiendo la participación económica completa.'
  ),
});

/**
 * Periodo de carencia/espera para coberturas específicas.
 * §3-C: Cáncer y Maternidad no se cubren el Día 1.
 */
const CarenciaSchema = z.object({
  cobertura: z.string().describe(
    'Cobertura que tiene carencia (ej: "Maternidad", "Enfermedades Catastróficas", "Preexistencias")'
  ),
  meses_espera: z.number().describe(
    'Meses de espera antes de que la cobertura sea efectiva.'
  ),
  condicion_textual: z.string().describe('Texto literal extraído'),
});

// ── Schema Raíz ──────────────────────────────────────────────────────────────

/**
 * Esquema raíz de extracción Salud / Gastos Médicos Mayores.
 * Campos obligatorios sin `.nullable()`.
 */
const SaludExtractionSchema = z.object({
  // ── Identificación ──
  aseguradora: z.string().describe('Nombre de la compañía aseguradora'),
  numero_poliza: z.string().nullable().describe('Número de póliza'),
  vigencia_desde: z.string().nullable().describe('Fecha inicio vigencia'),
  vigencia_hasta: z.string().nullable().describe('Fecha fin vigencia'),
  moneda: z.string().default('COP').describe('Moneda de la póliza (COP o USD)'),

  // ── Límite Global ──
  limite_maximo_asegurado: z.string().describe(
    'OBLIGATORIO: Límite máximo asegurado (ej: "$1,000,000,000 Anual", "Ilimitado", "USD $2,000,000"). Extraer textualmente.'
  ),
  limite_maximo_numerico: z.number().nullable().describe(
    'Valor numérico del límite. null si "Ilimitado".'
  ),
  es_ilimitado: z.boolean().describe(
    'true si el límite máximo es ilimitado. false si tiene tope.'
  ),

  // ── Red y Acceso ──
  red_hospitalaria: RedHospitalariaEnum.describe(
    'OBLIGATORIO: cerrada (pago directo, solo copago), abierta (libre elección, reembolso), mixta (preferente + reembolso fuera de red).'
  ),
  habitacion_tipo: HabitacionEnum.nullable().describe(
    'Tipo de habitación: compartida, individual, suite. null si no se especifica.'
  ),

  // ── Coberturas ──
  coberturas: z.array(SaludCoverageSchema).describe(
    'Lista de coberturas identificadas (in-patient + out-patient).'
  ),

  // ── Maternidad (campo de acceso rápido) ──
  maternidad_incluida: z.boolean().describe(
    'true si incluye cobertura de maternidad (parto, cesárea, recién nacido).'
  ),
  maternidad_limite: z.string().nullable().describe(
    'Límite de maternidad: textual (ej: "$10,000,000 tope", "100% del facturado"). null si no incluida.'
  ),
  maternidad_carencia_meses: z.number().nullable().describe(
    'Meses de carencia para maternidad. null si sin carencia o no incluida.'
  ),

  // ═══════════════════════════════════════════════════════════════════
  // PARTICIPACIÓN ECONÓMICA — GRANULARIDAD MÁXIMA (OBLIGATORIO)
  // ═══════════════════════════════════════════════════════════════════
  participacion_economica: ParticipacionEconomicaSchema.describe(
    'OBLIGATORIO: Estructura granular de Copagos + Deducible + Coaseguro + Stop-Loss. El LLM DEBE extraer cada concepto de forma INDEPENDIENTE.'
  ),

  // ── Carencias / Periodos de Espera ──
  carencias: z.array(CarenciaSchema).describe(
    'Periodos de espera por cobertura. Maternidad y enfermedades catastróficas tipicamente tienen carencias.'
  ),

  // ── Enfermedades Catastróficas ──
  cubre_catastroficas: z.boolean().describe(
    'true si cubre enfermedades catastróficas (quimio, radio, diálisis).'
  ),

  // ── Asistencia Internacional ──
  asistencia_internacional: z.boolean().describe(
    'true si incluye cobertura internacional (urgencias viaje o acceso a redes mundiales).'
  ),

  // ── Preexistencias ──
  cubre_preexistencias: z.boolean().nullable().describe(
    'true si la póliza cubre preexistencias declaradas (con o sin carencia). false si las excluye. null si no se menciona.'
  ),
  preexistencias_con_carencia: z.boolean().nullable().describe(
    'Si cubre preexistencias: true si tienen periodo de espera adicional. null si no aplica.'
  ),

  // ── Económicos ──
  prima_neta: z.number().nullable().describe('Prima neta anual'),
  iva: z.number().nullable().describe('IVA'),
  prima_total: z.number().nullable().describe('Prima total a pagar'),
  prima_por_persona: z.number().nullable().describe(
    'Prima por persona/asegurado (si grupo familiar). null si no se desglosa.'
  ),
});

// ═════════════════════════════════════════════════════════════════════════════
// SALUD STRATEGY CLASS
// ═════════════════════════════════════════════════════════════════════════════

export class SaludStrategy implements CategoryStrategy {
  readonly categoryId = 'salud' as const;
  readonly categoryLabel = 'Salud / Gastos Médicos Mayores';

  // ── Domain Context (Sección 3: "El Por Qué") ─────────────────────

  getDomainContext(): string {
    return `Estás analizando una póliza de **Salud / Gastos Médicos Mayores** — un seguro B2C que protege el patrimonio familiar frente a costos CATASTRÓFICOS derivados de enfermedades graves, cirugías o accidentes. La suscripción depende del perfil biológico (edad, estado de salud), no de los activos financieros.

**⚠️ ADVERTENCIA DE AUDITORÍA MÉDICA:**
Tu rol NO es solo leer un PDF — es hacer **auditoría médica financiera**. Cada parámetro que extraigas tiene impacto directo en la liquidez de una familia ante una emergencia de salud.

**REGLAS DE INFERENCIA OBLIGATORIAS PARA SALUD:**

**A. DEDUCIBLE ANUAL ACUMULABLE vs. DEDUCIBLE POR EVENTO (REGLA CRÍTICA)**
Esta es la diferencia financiera MÁS IMPORTANTE del ramo. La IA DEBE extraer y clasificar:
- **Deducible Anual Acumulable:** El cliente paga los primeros $X del AÑO (ej: $2,000,000). Una vez cubiertas, TODAS las hospitalizaciones restantes del año salen al 100%. SUPERIOR.
- **Deducible Por Evento:** El cliente paga $X POR CADA HOSPITALIZACIÓN. Si tiene apendicitis ($3M deducible) y un mes después se fractura ($3M más), pagó $6M de su bolsillo. INFERIOR.
- Ejemplo comparativo: Con deducible anual de $3M, una familia paga máximo $3M/año. Con deducible por evento de $3M y dos hospitalizaciones, paga $6M. La diferencia puede ser de MILLONES.
La IA DEBE calificar **exponencialmente mejor** las pólizas con Deducible Anual Acumulable. Si el tipo no se puede determinar, clasificar como "desconocido" y advertir al usuario que pregunte.

**B. RED CERRADA vs. RED ABIERTA — IMPACTO EN LIQUIDEZ (REGLA DE FLUJO DE CAJA)**
- **Red Cerrada (Pago Directo):** El cliente va a clínicas aliadas, presenta su carnet, y solo paga el copago ($50,000). La aseguradora paga directamente al hospital. CERO impacto en liquidez.
- **Red Abierta (Reembolso):** El cliente elige su médico/clínica libremente, PERO debe pagar la cirugía de su bolsillo (ej: $50,000,000) y luego pedir reembolso (que puede tardar 30–60 días). IMPACTO MASIVO en liquidez.
- **Red Mixta:** Red preferente con pago directo + opción de reembolso fuera de red (con coaseguro).
La IA DEBE advertir: *"La póliza usa Red Abierta con reembolso. Esto significa que para una cirugía de $50M, la familia debe pagar de su bolsillo y esperar hasta 60 días el reembolso. Evalúe si tiene la liquidez para esto."*

**C. CARENCIAS Y CERTIFICADO DE CONTINUIDAD (REGLA DE TRANSICIÓN ENTRE PÓLIZAS)**
Cáncer, Maternidad y enfermedades catastróficas NO se cubren desde el Día 1 — tienen periodos de espera (carencias). La IA DEBE:
- Extraer todas las carencias por cada cobertura.
- **Si el contexto es COMPARACIÓN entre una póliza actual (Baseline) y una nueva (Challenger):** OBLIGATORIAMENTE recomendar: **📋 RECOMENDACIÓN CRÍTICA: Solicite un Certificado de Continuidad a la aseguradora actual. Sin este documento, al cambiar de póliza perderá la antigüedad acumulada, volverá a tener carencias (10+ meses para maternidad, 12+ para catastróficas) y perderá la cobertura de preexistencias ya reconocidas.**
- Sin Certificado de Continuidad, cambiar de póliza puede ser PEOR que quedarse con la actual, incluso si la nueva es más barata.

**D. EL STOP-LOSS — PROTECCIÓN CONTRA QUIEBRA FAMILIAR (REGLA CATASTRÓFICA)**
Si la póliza cobra Coaseguro (ej: 10% a cargo del asegurado), la IA DEBE buscar la cláusula de Stop-Loss (Tope máximo del coaseguro):
- **Con Stop-Loss:** El asegurado paga el 10% PERO máximo hasta $5M en el año. Después de $5M, la aseguradora paga el 100%.
- **Sin Stop-Loss:** El 10% de un tratamiento de cáncer de $500M = $50M a cargo de la familia. Esto es QUIEBRA.
- Si hay coaseguro > 0% y NO hay Stop-Loss, emitir: **🚨 ALERTA SEVERA: La póliza cobra Coaseguro del X% SIN tope de Stop-Loss. En un evento catastrófico ($200M+), la familia podría pagar $20M+ de su bolsillo sin límite. Esto es un cheque en blanco contra el patrimonio familiar. Penalizar severamente.**

**E. MATERNIDAD — TOPE vs. 100%**
- Evaluar si la maternidad tiene tope (ej: $10,000,000) o cubre el 100% del valor facturado.
- Un parto normal puede costar $5M–$15M. Una cesárea con complicaciones puede superar $30M.
- Si el tope es bajo y la familia planea hijos, alertar.
- Verificar carencia de maternidad (típico: 10 meses).

**F. EVALUACIÓN CON DATOS DEL BRIEF**
- Si el brief indica preexistencias médicas, verificar si la póliza las cubre o excluye.
- Si el brief indica edades del grupo familiar, evaluar si la prima es coherente con los tramos quinquenales.
- Si el brief indica que tiene seguro actual (nivel de acceso), recomendar Certificado de Continuidad.`;
  }

  // ── Analysis Checklist ────────────────────────────────────────────

  getAnalysisChecklist(): string[] {
    return [
      'Extraer y CLASIFICAR tipo de deducible: Anual Acumulable (superior) vs. Por Evento (inferior) vs. Desconocido — calificar exponencialmente mejor las anuales',
      'Extraer Red Hospitalaria: Cerrada (pago directo, sin impacto liquidez) vs. Abierta (reembolso, impacto masivo) vs. Mixta — advertir sobre flujo de caja en Red Abierta',
      'Buscar cláusula de STOP-LOSS: si hay coaseguro > 0% y NO hay stop-loss → Alerta Severa (cheque en blanco contra la familia)',
      'Extraer participación económica GRANULAR: copagos ambulatorios, deducible (tipo + valor), coaseguro (% + stop-loss) — cada concepto por separado',
      'Auditar CARENCIAS por cobertura: maternidad (típico 10 meses), catastróficas (12 meses), preexistencias — SI ES COMPARACIÓN, recomendar Certificado de Continuidad',
      'Extraer límite de MATERNIDAD: tope fijo vs. 100% del facturado — evaluar si el tope cubre cesárea con complicaciones ($30M+)',
      'Verificar cobertura de enfermedades CATASTRÓFICAS (quimio, radio, diálisis) — impacto financiero máximo',
      'Evaluar tipo de habitación: compartida vs. individual vs. suite — impacto en experiencia hospitalaria',
      'Verificar si cubre PREEXISTENCIAS declaradas (con o sin carencia) — si excluye, alertar',
      'Comparar límite máximo asegurado: $1,000M puede ser insuficiente para cáncer prolongado; Ilimitado es superior',
    ];
  }

  // ── Infraseguro Rules ─────────────────────────────────────────────

  getInfraseguroRules(): string {
    return `**Reglas de Infraseguro — Salud / Gastos Médicos Mayores (Patrimonio Familiar en Riesgo Médico)**

1. **Coaseguro Sin Stop-Loss = Cheque en Blanco:** Si cobran 10% de coaseguro y NO hay Stop-Loss, el 10% de un cáncer de $500M son $50M. Esto quiebra a una familia de clase media-alta. PENALIZAR SEVERAMENTE.

2. **Deducible Por Evento con Familia Grande:** Si el deducible es "por evento" ($3M) y la familia tiene 4 miembros, en un mal año pueden pagar $12M+ en deducibles (cada uno con un evento). Con deducible anual del mismo monto, pagarían $3M máximo.

3. **Red Abierta Sin Liquidez:** Si la póliza es Red Abierta y la familia debe pagar $50M de bolsillo por una cirugía antes del reembolso (30–60 días), muchas familias no tienen esa liquidez. Alertar siempre.

4. **Maternidad con Tope de $10M:** Un parto normal cuesta $5M–$15M. Una cesárea con complicaciones neonatales (UCI neonatal) puede superar $30M. Si el tope es $10M, la familia paga $20M+ de diferencia.

5. **Pérdida de Antigüedad por Cambio de Póliza:** Si el cliente cambia de aseguradora SIN Certificado de Continuidad, pierde: cobertura de preexistencias, antigüedad para carencias, y toda progresión. Puede estar PEOR que antes incluso con póliza más barata.

6. **Límite Máximo de $1,000M:** Un tratamiento oncológico completo (quimioterapia + radioterapia + cirugía + post-operatorio) puede superar $800M–$1,200M. Si el límite es $1,000M, queda corto. Pólizas ilimitadas o > $2,000M son preferibles.`;
  }

  // ── Regulatory Notes ──────────────────────────────────────────────

  getRegulatoryNotes(): string {
    return `**Notas Regulatorias — Salud / Gastos Médicos Mayores (Colombia)**
- El POS (Plan Obligatorio de Salud) / PBS (Plan de Beneficios en Salud) cubre servicios básicos a través de EPS. La póliza de salud privada opera como COMPLEMENTO o SUPLEMENTO del POS.
- La Ley Estatutaria de Salud (Ley 1751/2015) garantiza el derecho fundamental a la salud, pero los servicios no incluidos en PBS requieren cobertura privada o tutela.
- Las preexistencias declaradas en el cuestionario médico son cubiertas con carencia; las NO declaradas dan derecho a la aseguradora a rescindir el contrato (Art. 1058 Código de Comercio — reticencia).
- El Certificado de Continuidad (Circular 049/2012 de la Superfinanciera) permite transferir antigüedad entre aseguradoras sin reiniciar carencias ni perder cobertura de preexistencias.
- Las primas se calculan por tramos quinquenales de edad (0–4, 5–9, ..., 60–64, 65+). La prima del tramo 60–64 puede ser 3x–5x la del tramo 30–34.
- Maternidad tiene carencia legal mínima de 10 meses en la mayoría de aseguradoras.
- Los deducibles y coaseguros deben estar expresamente indicados en las condiciones particulares (Circular Externa 029 SFC).`;
  }

  // ── Field Labels (para serialización YAML) ────────────────────────

  getFieldLabels(): FieldLabelMap {
    return {
      edades_grupo_familiar: 'Edades del Grupo Familiar',
      preexistencias_medicas: 'Preexistencias Médicas Declaradas',
      nivel_acceso_medico: 'Nivel de Acceso Médico Deseado',
    };
  }

  // ── PII Classification ────────────────────────────────────────────

  getPiiClassification(): Record<string, PiiClassification> {
    return {
      edades_grupo_familiar: 'mask',   // Puede contener nombres junto a edades → sanitizar
      preexistencias_medicas: 'redact', // Datos médicos sensibles → MÁXIMO nivel PII, redactar completamente
      nivel_acceso_medico: 'safe',      // Preferencia de acceso (nacional/internacional)
    };
  }

  // ── Extraction Schema (Zod) ───────────────────────────────────────

  getExtractionSchema(): z.ZodType {
    return SaludExtractionSchema;
  }

  // ── Comparison Priorities ─────────────────────────────────────────

  getComparisonPriorities(): string[] {
    return [
      'Deducible: Anual Acumulable (superior) vs. Por Evento (inferior) — calificar exponencialmente mejor las anuales',
      'Stop-Loss: si hay coaseguro y NO hay stop-loss → cheque en blanco, penalizar severamente',
      'Red Hospitalaria: Cerrada/pago directo (sin impacto liquidez) vs. Abierta/reembolso (impacto masivo)',
      'Participación económica total: copagos + deducible + coaseguro — calcular el costo real para la familia en un escenario catastrófico',
      'Límite máximo asegurado: Ilimitado > $2,000M > $1,000M — evaluar si cubre tratamiento oncológico completo',
      'Maternidad: 100% del facturado vs. tope fijo — evaluar si el tope cubre cesárea complicada ($30M+)',
      'Carencias: si es comparación → RECOMENDAR Certificado de Continuidad obligatoriamente',
      'Cobertura de preexistencias: incluidas (con/sin carencia) vs. excluidas',
      'Enfermedades catastróficas: quimio, radio, diálisis cubiertas o no',
      'Prima total anual por persona y por grupo familiar (relación costo/beneficio)',
    ];
  }
}

// ── Export Zod schemas for external use (validation, testing) ────────────────

export {
  SaludExtractionSchema,
  SaludCoverageSchema,
  ParticipacionEconomicaSchema,
  CarenciaSchema,
  DeducibleTipoEnum,
  RedHospitalariaEnum,
  HabitacionEnum,
  SaludCoberturaTipoEnum,
};
