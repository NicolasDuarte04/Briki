// src/lib/prompts/strategies/vida.strategy.ts
/**
 * Vida Individual Strategy — Protección Financiera a Largo Plazo
 *
 * Estrategia especializada para pólizas de Vida Individual que garantizan
 * la estabilidad económica de los dependientes ante fallecimiento prematuro,
 * invalidez total o diagnóstico de enfermedades graves.
 *
 * Ontología codificada:
 *   - Riesgo biométrico: edad actuarial, tabaco, ocupación, estado de salud
 *   - Amparos base: Muerte Cualquier Causa, ITP, Enfermedades Graves, Funerario
 *   - Modalidad de pago del amparo: Anticipo (agota el básico) vs.
 *     Adicional (no agota) vs. Independiente — diferencia catastrófica
 *   - Modalidades estructurales: Term Life (YRT), Vida Entera (Whole Life),
 *     Vida con Ahorro (Universal / VUL)
 *   - Prima Nivelada vs. Prima Renovable Anualmente (YRT):
 *     nivelada = costo congelado; YRT = barata a 30, insostenible a 60
 *   - Edades límite: ingreso, terminación básico, terminación amparos adicionales
 *   - Periodo de carencia: Enfermedades Graves (tipico 90 días)
 *   - Periodo de disputabilidad: 2 años (reticencia)
 *   - Designación de beneficiarios: libre de embargos, fuera de sucesión
 *
 * Fuente de dominio: docs/knowledge/vida-rules.md
 *
 * @module prompts/strategies/vida.strategy
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
 * Modalidad de pago del amparo — diferencia CATASTRÓFICA.
 * §3-A: "Anticipo" agota el básico (ITP en vida → póliza cancelada → familia sin nada).
 *        "Adicional" no agota (recibe en vida Y familia recibe al fallecer).
 *        "Independiente" es capital propio sin relación al básico.
 */
const AmparoModalidadPagoEnum = z.enum([
  'anticipo',       // Consume el capital básico — la póliza se agota al pagar
  'adicional',      // Se suma al básico — la cobertura de muerte PERMANECE
  'independiente',  // Capital propio, sin relación con el básico
  'desconocido',    // No se puede determinar del documento
]);

/**
 * Tipo de amparo / cobertura de vida.
 */
const VidaAmparoTipoEnum = z.enum([
  'muerte_cualquier_causa',     // Básico: fallecimiento natural o accidental
  'muerte_accidental',          // Doble indemnización por accidente
  'incapacidad_total_permanente', // ITP: pérdida >50% capacidad de trabajar
  'enfermedades_graves',        // Cáncer, Infarto, ACV, etc.
  'exencion_primas',            // Liberación de pago de primas por invalidez
  'auxilio_funerario',          // Monto rápido para exequias
  'renta_por_invalidez',        // Renta mensual por invalidez
  'desmembracion',              // Pérdida de miembros
  'hospitalizacion',            // Renta diaria por hospitalización
  'otro',
]);

/**
 * Modalidad estructural de la póliza de vida.
 * §1.3: Term Life (riesgo puro) vs. Whole Life (vitalicia) vs. Universal/VUL (ahorro).
 */
const VidaModalidadEstructuralEnum = z.enum([
  'vida_riesgo_term',   // Term Life: plazo definido, sin retorno, más económica
  'vida_entera',        // Whole Life: vitalicia, prima nivelada más alta
  'vida_con_ahorro',    // Universal / VUL: parte de prima va a fondo de inversión
  'desconocido',
]);

/**
 * Comportamiento proyectado de la prima.
 * §3-B: Prima Nivelada (congelada) vs. YRT (renovable anualmente — insostenible a largo plazo).
 */
const PrimaTipoEnum = z.enum([
  'prima_nivelada',         // Costo congelado en el tiempo — SUPERIOR a largo plazo
  'prima_renovable_yrt',    // Yearly Renewable Term — sube cada año con la edad
  'desconocido',
]);

// ── Sub-schemas ──────────────────────────────────────────────────────────────

/**
 * Amparo individual de la póliza de vida.
 * Cada amparo DEBE tener su modalidad de pago clasificada.
 */
const VidaAmparoSchema = z.object({
  nombre: z.string().describe('Nombre del amparo tal como aparece en el documento'),
  tipo: VidaAmparoTipoEnum.describe('Clasificación según ontología de vida'),
  capital_asegurado: z.number().nullable().describe(
    'Capital asegurado del amparo en COP. null si no se especifica monto.'
  ),
  tipo_pago: AmparoModalidadPagoEnum.describe(
    'OBLIGATORIO: anticipo (agota el básico, la póliza se cancela al pagar) vs. adicional (se suma, la cobertura de muerte permanece) vs. independiente (capital propio). Si no se puede determinar: desconocido.'
  ),
  incluido: z.boolean().describe('true si el amparo está incluido en la póliza'),
  detalle: z.string().nullable().describe(
    'Condiciones especiales, exclusiones, sublímites'
  ),
});

/**
 * Edades límite y condiciones de permanencia.
 * §2 Extracción 2: La póliza de Vida tiene caducidad por edad.
 */
const EdadesLimiteSchema = z.object({
  edad_maxima_ingreso: z.number().nullable().describe(
    'Edad máxima para ingresar a la póliza (ej: 65 años). null si no se especifica.'
  ),
  edad_terminacion_basico: z.number().nullable().describe(
    'Edad en la que la cobertura básica (muerte) cesa automáticamente (ej: 80 años). null si vitalicia.'
  ),
  edad_terminacion_amparos_adicionales: z.number().nullable().describe(
    'Edad en la que cesan ITP, Enfermedades Graves y otros amparos adicionales (ej: 65 años). Típicamente ANTES que el básico. null si no se especifica.'
  ),
  es_vitalicia: z.boolean().describe(
    'true si la cobertura básica es vitalicia (sin edad de terminación). Solo aplica a Vida Entera.'
  ),
});

/**
 * Tabla de beneficiarios (protección legal).
 * §3-D: Fuera del patrimonio hereditario, libre de embargos.
 */
const BeneficiarioSchema = z.object({
  nombre_o_relacion: z.string().describe(
    'Nombre o relación del beneficiario (ej: "Esposa", "Hijo Mayor", "María Pérez")'
  ),
  porcentaje: z.number().nullable().describe(
    'Porcentaje de participación (ej: 50). null si no se especifica.'
  ),
});

// ── Schema Raíz ──────────────────────────────────────────────────────────────

/**
 * Esquema raíz de extracción Vida Individual.
 */
const VidaExtractionSchema = z.object({
  // ── Identificación ──
  aseguradora: z.string().describe('Nombre de la compañía aseguradora'),
  numero_poliza: z.string().nullable().describe('Número de póliza'),
  vigencia_desde: z.string().nullable().describe('Fecha inicio vigencia'),
  vigencia_hasta: z.string().nullable().describe('Fecha fin vigencia'),
  plazo_cobertura: z.string().nullable().describe(
    'Plazo de la cobertura (ej: "1 Año Renovable", "20 Años", "Vitalicio"). null si no se especifica.'
  ),

  // ── Modalidad Estructural ──
  modalidad_estructural: VidaModalidadEstructuralEnum.describe(
    'OBLIGATORIO: vida_riesgo_term (plazo definido, sin retorno), vida_entera (vitalicia, nivelada), vida_con_ahorro (con fondo de inversión). Si no se puede determinar: desconocido.'
  ),

  // ── Asegurado ──
  edad_asegurado: z.number().nullable().describe('Edad del asegurado al momento de emisión'),
  genero_biologico: z.string().nullable().describe('Género biológico (masculino/femenino)'),
  fumador: z.boolean().nullable().describe(
    'true si el asegurado es fumador declarado. Impacta severamente la prima y aceptación.'
  ),
  ocupacion: z.string().nullable().describe(
    'Ocupación declarada. Deportes extremos o trabajos peligrosos generan extraprimas.'
  ),

  // ── Capital Básico (Suma Asegurada) ──
  suma_asegurada_basico: z.number().nullable().describe(
    'Capital asegurado del amparo básico (Muerte por Cualquier Causa) en COP.'
  ),

  // ═══════════════════════════════════════════════════════════════════
  // AMPAROS — CON MODALIDAD DE PAGO OBLIGATORIA
  // ═══════════════════════════════════════════════════════════════════
  amparos: z.array(VidaAmparoSchema).describe(
    'Lista de TODOS los amparos. Cada uno DEBE tener tipo_pago clasificado: anticipo (agota el básico) vs. adicional (se suma) vs. independiente.'
  ),

  // ── Edades Límite (§2 Extracción 2) ──
  edades_limite: EdadesLimiteSchema.describe(
    'OBLIGATORIO: Edades de ingreso máximo, terminación del básico y terminación de amparos adicionales. La póliza de vida CADUCA por edad.'
  ),

  // ── Prima ──
  prima_tipo: PrimaTipoEnum.describe(
    'OBLIGATORIO: prima_nivelada (costo congelado — superior a largo plazo) vs. prima_renovable_yrt (sube con la edad — insostenible a 60+). Si no se puede determinar: desconocido.'
  ),
  prima_neta: z.number().nullable().describe('Prima neta anual en COP'),
  iva: z.number().nullable().describe('IVA'),
  prima_total: z.number().nullable().describe('Prima total anual a pagar'),

  // ── Carencias y Disputabilidad ──
  periodo_carencia_enfermedades_graves: z.number().nullable().describe(
    'Días de carencia para cobertura de Enfermedades Graves desde inicio de vigencia (típico: 90 días). null si sin carencia o no aplica.'
  ),
  periodo_disputabilidad_meses: z.number().nullable().describe(
    'Meses del periodo de disputabilidad/contestabilidad (típico: 24 meses). Después de este periodo la aseguradora no puede anular por reticencia. null si no se especifica.'
  ),

  // ── Valor de Rescate (solo aplica a Vida con Ahorro) ──
  tiene_valor_rescate: z.boolean().describe(
    'true si la póliza acumula valor de rescate (componente de ahorro/inversión).'
  ),
  valor_rescate_anio_actual: z.number().nullable().describe(
    'Valor de rescate proyectado al año actual. null si no aplica.'
  ),

  // ── Beneficiarios ──
  beneficiarios: z.array(BeneficiarioSchema).describe(
    'Lista de beneficiarios designados. Si no se especifican, reportar array vacío.'
  ),
  designacion_nominal: z.boolean().nullable().describe(
    'true si los beneficiarios están designados nominalmente (nombre + %). false si son "herederos legales" genéricos. null si no se menciona.'
  ),

  // ── Exclusiones relevantes ──
  exclusiones_relevantes: z.array(z.string()).describe(
    'Exclusiones clave extraídas (ej: suicidio primeros 2 años, deportes extremos, actos ilegales). Array vacío si no se identifican.'
  ),
});

// ═════════════════════════════════════════════════════════════════════════════
// VIDA STRATEGY CLASS
// ═════════════════════════════════════════════════════════════════════════════

export class VidaStrategy implements CategoryStrategy {
  readonly categoryId = 'vida' as const;
  readonly categoryLabel = 'Vida Individual';

  // ── Domain Context (Sección 3: "El Por Qué") ─────────────────────

  getDomainContext(): string {
    return `Estás analizando una póliza de **Vida Individual** — un seguro B2C de protección financiera a largo plazo que garantiza la estabilidad económica de los dependientes ante fallecimiento prematuro, o protege al propio asegurado en caso de invalidez total o diagnóstico de enfermedad grave.

La suscripción depende 100% del perfil biológico: edad actuarial, estado de salud, hábito de fumar, ocupación. Ocultar condiciones preexistentes es motivo de NULIDAD contractual.

**⚠️ ADVERTENCIA DE AUDITORÍA FINANCIERA FAMILIAR:**
Tu rol NO es solo leer un PDF — es hacer **auditoría de protección patrimonial familiar a largo plazo**. Cada parámetro que extraigas determina si una familia queda protegida o desprotegida financieramente ante la muerte o invalidez del titular.

**REGLAS DE INFERENCIA OBLIGATORIAS PARA VIDA INDIVIDUAL:**

**A. ANTICIPO vs. COBERTURA ADICIONAL / INDEPENDIENTE (REGLA CATASTRÓFICA)**
Esta es la diferencia financiera MÁS PELIGROSA del ramo Vida. La IA DEBE extraer y clasificar para CADA amparo su modalidad de pago:
- **Anticipo del Básico:** Al activarse el amparo (ej: ITP, Enfermedades Graves), el asegurado recibe el capital en vida, PERO la póliza se CANCELA. Al fallecer después, la familia NO RECIBE NADA. El seguro quedó agotado.
  Ejemplo: Juan tiene póliza de $500M. Le diagnostican cáncer → recibe $500M por Enfermedades Graves como "Anticipo". La póliza se cancela. Juan fallece 3 años después → su familia recibe $0.
- **Cobertura Adicional:** El asegurado recibe el capital por Enfermedades Graves ($250M adicionales) Y la cobertura de Muerte ($500M) SIGUE VIGENTE.
  Ejemplo: Juan recibe $250M por cáncer → sigue asegurado. Fallece 3 años después → su familia recibe $500M.
- **Independiente:** Capital completamente separado, sin interacción con el básico.
La IA DEBE calificar **inmensamente mejor** las pólizas con amparos "Adicionales" o "Independientes". Si un amparo es "Anticipo" → **🚨 ALERTA: Este amparo agota el capital básico. Si se activa, la familia pierde la cobertura de fallecimiento.** Si no se puede determinar la modalidad → clasificar como "desconocido" y ADVERTIR al usuario que pregunte a la aseguradora antes de firmar.

**B. PRIMA NIVELADA vs. PRIMA RENOVABLE ANUALMENTE — YRT (REGLA DE SOSTENIBILIDAD)**
- **Prima Nivelada:** El costo de la póliza queda CONGELADO en el tiempo. Si la prima es $5M/año a los 35, será $5M/año a los 60. Es más cara al inicio pero garantiza sostenibilidad.
- **Prima Renovable Anualmente (YRT — Yearly Renewable Term):** Póliza "Term" a 1 año que se renueva cada año con recálculo. Será barata a los 30 ($1.5M) pero puede llegar a $15M+ a los 60, volviéndose INSOSTENIBLE justo cuando más se necesita.
- Si el BRIEF indica que el cliente busca protección a LARGO PLAZO (>10 años horizonte), o si la edad actual > 45 años:
  → **RECOMENDAR Prima Nivelada** y penalizar YRT con: *"Esta póliza usa Prima Renovable Anualmente. A los 60 años el costo puede ser 5x–10x el actual, volviéndose insostenible justo cuando el riesgo de fallecimiento es mayor."*
- Si el cliente es joven (<35) y busca cobertura temporal (1–5 años), YRT puede ser adecuada y económica.

**C. PERIODO DE CARENCIA Y DISPUTABILIDAD (REGLA DE PROTECCIÓN TEMPORAL)**
- **Carencia de Enfermedades Graves:** Típicamente 90 días desde inicio de vigencia. Si al asegurado le diagnostican cáncer el Día 30, NO COBRA.
  → Penalizar pólizas con carencias >90 días. Alertar: *"Esta póliza tiene carencia de X días para Enfermedades Graves. Si hay diagnóstico dentro de ese periodo, no habrá cobertura."*
- **Periodo de Disputabilidad (Contestabilidad):** Típicamente 24 meses. Si el asegurado omitió preexistencias y fallece dentro de los 2 primeros años, la aseguradora puede negar el pago.
  → SIEMPRE recordar al usuario: *"Declare TODAS las preexistencias en el cuestionario médico. Omitir condiciones da derecho a la aseguradora a anular el contrato durante el periodo de disputabilidad."*

**D. DESIGNACIÓN DE BENEFICIARIOS — PROTECCIÓN LEGAL (REGLA JURÍDICA)**
La póliza de vida es un activo FUERA del patrimonio hereditario (Código de Comercio, Art. 1141–1142):
- Se paga libre de embargos e impuestos de sucesión.
- NO entra a juicio de sucesión si hay designación nominal.
- La IA DEBE sugerir: *"Designe beneficiarios NOMINALMENTE con porcentajes claros (ej: Esposa 50%, Hijo 25%, Hija 25%). Sin designación nominal, el seguro puede entrar a juicio de sucesión y demorarse años."*
- Si los beneficiarios son "Herederos Legales" genéricos → advertir que pierde la ventaja de celeridad.

**E. EDADES LÍMITE — EL RELOJ BIOLÓGICO DE LA PÓLIZA**
La póliza de vida tiene CADUCIDAD POR EDAD:
- Edad de terminación del básico (ej: 80 años): la cobertura de muerte cesa automáticamente.
- Edad de terminación de amparos adicionales (ej: 65 años): ITP y Enfermedades Graves pueden cesar ANTES que el básico.
  → Alertar: *"Los amparos de ITP y Enfermedades Graves terminan a los 65 años, 15 años ANTES que el básico. A partir de los 65, solo tendrá cobertura de fallecimiento."*
- Evaluar coherencia con la edad actual del asegurado. Si tiene 60 y el ITP termina a 65 → solo 5 años de cobertura.

**F. EVALUACIÓN CON DATOS DEL BRIEF**
- **Edad del asegurado:** Evaluar coherencia con edades límite y tipo de prima (YRT a >50 = alerta).
- **Fumador:** Si el brief indica fumador, verificar que la prima refleje la extraprima por tabaco.
- **Valor asegurado vs. Ingresos:** La suma asegurada debería ser 5x–10x el ingreso anual para proteger adecuadamente a los dependientes. Si es menor → infraseguro.
- **Amparos adicionales solicitados:** Verificar que cada amparo solicitado en el brief esté incluido Y que su modalidad no sea "Anticipo" sin que el cliente lo sepa.`;
  }

  // ── Analysis Checklist ────────────────────────────────────────────

  getAnalysisChecklist(): string[] {
    return [
      'Clasificar CADA amparo como Anticipo (agota el básico) vs. Adicional (se suma) vs. Independiente — alertar severamente si ITP o Enfermedades Graves son "Anticipo"',
      'Identificar tipo de prima: Nivelada (congelada, superior a largo plazo) vs. Renovable YRT (insostenible a 60+) — si horizonte >10 años o edad >45, recomendar nivelada',
      'Extraer EDADES LÍMITE: ingreso, terminación básico, terminación amparos adicionales — alertar si amparos cesan ANTES que el básico',
      'Extraer periodo de carencia para Enfermedades Graves (típico 90 días) — penalizar si >90 días',
      'Verificar la modalidad estructural: Term Life vs. Vida Entera vs. Vida con Ahorro — coherencia con necesidad del cliente',
      'Auditar designación de beneficiarios: nominal (protegida) vs. herederos legales genéricos (riesgo sucesión)',
      'Recordar SIEMPRE declarar preexistencias — reticencia puede anular el contrato en periodo de disputabilidad (24 meses)',
      'Evaluar si la suma asegurada es 5x–10x el ingreso anual del cliente — si es menor, alertar infraseguro',
      'Verificar si la póliza incluye valor de rescate (ahorro) y su proyección',
      'Extraer exclusiones relevantes (suicidio primeros 2 años, deportes extremos, actos ilegales)',
    ];
  }

  // ── Infraseguro Rules ─────────────────────────────────────────────

  getInfraseguroRules(): string {
    return `**Reglas de Infraseguro — Vida Individual (Protección Patrimonial Familiar)**

1. **Suma Asegurada < 5x Ingreso Anual = Infraseguro:** Si el titular gana $120M/año y la póliza cubre $300M, la familia solo tiene 2.5 años de reemplazo de ingresos. Con dependientes menores, necesita mínimo $600M–$1,200M (5x–10x). ALERTAR.

2. **ITP como "Anticipo" = Doble Desprotección:** Si ITP es Anticipo del Básico por $500M, al activarse la familia pierde la cobertura de fallecimiento. Si el asegurado queda inválido y luego fallece → agotó el seguro en vida, familia sin protección. PEOR escenario posible.

3. **YRT a >50 Años = Bomba de Tiempo:** Prima renovable anualmente a los 50 puede costar $5M. A los 65 puede ser $20M+. El cliente probablemente abandone la póliza justo cuando más la necesita (mayor probabilidad de fallecimiento). Alertar siempre.

4. **Amparos Adicionales que Cesan a los 65 con Asegurado de 60:** Si ITP y Enfermedades Graves terminan a los 65 y el cliente tiene 60, solo tendrá 5 años de cobertura de estos amparos. Evaluar si vale la prima adicional por esos 5 años.

5. **Fumador Sin Extraprima Declarada:** Si el brief indica "fumador: sí" pero la póliza no refleja extraprima por tabaco, hay riesgo de que al momento del siniestro la aseguradora investigue y niegue el pago por reticencia. ALERTAR.

6. **Beneficiarios como "Herederos Legales":** Sin designación nominal, el seguro gana la sucesión: años de demora, posibles embargos y gastos legales. Una familia en duelo no necesita un juez decidiendo el pago del seguro.`;
  }

  // ── Regulatory Notes ──────────────────────────────────────────────

  getRegulatoryNotes(): string {
    return `**Notas Regulatorias — Vida Individual (Colombia)**
- El Código de Comercio (Arts. 1141–1160) regula el contrato de seguro de vida. El beneficiario designado tiene derecho propio al seguro, independiente del patrimonio del asegurado.
- Art. 1141: El seguro de vida NO forma parte del patrimonio hereditario del asegurado. Se paga directamente al beneficiario designado, libre de embargos e impuestos de sucesión.
- Art. 1058 (Deber de Declaración): La reticencia o inexactitud en la declaración puede dar lugar a nulidad relativa del contrato. En seguro de vida, si el asegurado fallece dentro del periodo de disputabilidad (típicamente 2 años), la aseguradora puede investigar y negar.
- Art. 1054 (Riesgo Asegurable): Solamente fallecimiento, supervivencia e invalidez del asegurado. No se puede asegurar la vida de un tercero sin consentimiento.
- Circular Externa 029/2014 SFC: Las condiciones particulares de la póliza deben especificar claramente la modalidad de pago de cada amparo (anticipo, adicional, independiente).
- La extraprima por tabaquismo debe reflejarse en las condiciones particulares. La Superfinanciera ha sancionado aseguradoras por rechazar siniestros sin investigación adecuada de reticencia.
- Pólizas con componente de ahorro (Universal/VUL) están reguladas adicionalmente por la Circular Básica Jurídica (CBJ) en lo relativo a valor de rescate y rendimientos.`;
  }

  // ── Field Labels (para serialización YAML) ────────────────────────

  getFieldLabels(): FieldLabelMap {
    return {
      valor_asegurado_fallecimiento: 'Suma Asegurada por Fallecimiento (COP)',
      edad_asegurado: 'Edad del Asegurado',
      genero_biologico: 'Género Biológico',
      fumador: 'Fumador Declarado',
      amparos_adicionales: 'Amparos Adicionales Solicitados',
    };
  }

  // ── PII Classification ────────────────────────────────────────────

  getPiiClassification(): Record<string, PiiClassification> {
    return {
      valor_asegurado_fallecimiento: 'safe', // Monto de seguro — dato financiero genérico
      edad_asegurado: 'safe',                // Edad — dato demográfico genérico
      genero_biologico: 'safe',              // Género — sin identificación personal
      fumador: 'mask',                       // Hábito de salud — dato sensible pero no identificante → mask
      amparos_adicionales: 'safe',           // Descripción de coberturas deseadas
    };
  }

  // ── Extraction Schema (Zod) ───────────────────────────────────────

  getExtractionSchema(): z.ZodType {
    return VidaExtractionSchema;
  }

  // ── Comparison Priorities ─────────────────────────────────────────

  getComparisonPriorities(): string[] {
    return [
      'Modalidad de pago de amparos: Adicional/Independiente (cobertura de muerte PERMANECE) >>> Anticipo (agota el básico, familia sin protección)',
      'Tipo de prima: Nivelada (costo congelado) vs. Renovable YRT (insostenible a 60+) — si horizonte >10 años, nivelada es SUPERIOR',
      'Edades límite: edad de terminación del básico y de amparos adicionales — evaluar brecha entre ambas',
      'Periodo de carencia Enfermedades Graves: ≤90 días aceptable, >90 días penalizar',
      'Suma asegurada vs. ingresos declarados: mínimo 5x–10x para protección adecuada',
      'Modalidad estructural: Term Life (económica, temporal) vs. Vida Entera (vitalicia, nivelada) vs. Universal (ahorro)',
      'Valor de rescate proyectado (si aplica): rendimiento del componente de ahorro',
      'Designación de beneficiarios: nominal con porcentajes >>> herederos legales genéricos',
      'Exclusiones relevantes: suicidio, deportes extremos, ocupación peligrosa',
      'Prima total anual: relación costo/beneficio considerando edad y horizonte',
    ];
  }
}

// ── Export Zod schemas for external use (validation, testing) ────────────────

export {
  VidaExtractionSchema,
  VidaAmparoSchema,
  EdadesLimiteSchema,
  BeneficiarioSchema,
  AmparoModalidadPagoEnum,
  VidaAmparoTipoEnum,
  VidaModalidadEstructuralEnum,
  PrimaTipoEnum,
};
