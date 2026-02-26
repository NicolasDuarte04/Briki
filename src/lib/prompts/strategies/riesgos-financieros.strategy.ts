// src/lib/prompts/strategies/riesgos-financieros.strategy.ts
/**
 * Riesgos Financieros Strategy — Manejo Global / Crime Manager
 *
 * Estrategia especializada para pólizas de riesgos financieros
 * que protegen contra pérdidas por actos fraudulentos o deshonestos.
 * Codifica la ontología completa del ramo incluyendo:
 *   - Dualidad Fidelidad (fraude interno) vs. Crime (interno + externo + ciber)
 *   - Sublímites críticos: Empleados No Identificados, Firmas Temporales
 *   - Coberturas Crime modernas: Fraude por Computador, Ingeniería Social (Phishing)
 *   - Garantías estrictas (KYC): auditorías, antecedentes penales
 *   - Deducibles escalonados por tipo de amparo
 *   - Campos obligatorios: garantias_exigidas + cubre_ingenieria_social
 *
 * Fuente de dominio: docs/knowledge/riesgos-financieros-rules.md
 *
 * @module prompts/strategies/riesgos-financieros.strategy
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
 * Naturaleza del límite dentro de la estructura de la póliza.
 *
 *   - global:    límite máximo agregado de la póliza
 *   - al_100:    cobertura al 100% del límite global (no lo erosiona)
 *   - sublimite: porcentaje o monto fijo que RESTA del global
 */
const RfLimitNatureEnum = z.enum([
  'global',
  'al_100',
  'sublimite',
]);

/**
 * Tipo de estructura de la póliza — determina la profundidad de cobertura.
 *
 *   - fidelidad:     solo fraude INTERNO (empleados del asegurado)
 *   - crime_manager: fraude interno + externo + cibernético
 *   - mixta:         estructura combinada
 */
const PolicyStructureEnum = z.enum([
  'fidelidad',
  'crime_manager',
  'mixta',
]);

/**
 * Línea de la estructura de límites asegurados.
 * Replica la tabla §2 Extracción 1.
 */
const RfLimitLineSchema = z.object({
  amparo: z.string().describe(
    'Nombre del amparo (ej: Manejo Global, Fraude por Computador, Empleados No Identificados, Ingeniería Social)'
  ),
  limite_valor: z.number().nullable().describe(
    'Límite o valor asegurado en moneda'
  ),
  naturaleza: RfLimitNatureEnum.describe(
    'Tipo de límite: global (tope máximo), al_100 (sin erosionar global), sublimite (% o monto que resta del global)'
  ),
  porcentaje_del_global: z.number().nullable().describe(
    'Para sublímites: porcentaje respecto al límite global (ej: 20 para 20%). Null si es global o al_100'
  ),
});

/**
 * Deducible de riesgos financieros.
 * Replica la tabla §2 Extracción 2.
 * Los deducibles son escalonados por tipo de amparo (más alto para crime/ingeniería social).
 */
const RfDeductibleSchema = z.object({
  cobertura: z.string().describe(
    'Amparo al que aplica (ej: Amparo Básico Identificados, Empleados No Identificados, Ingeniería Social)'
  ),
  porcentaje_perdida: z.number().nullable().describe(
    'Porcentaje sobre el valor de la pérdida (ej: 10, 15, 20). Null si es monto fijo'
  ),
  minimo_smmlv: z.number().nullable().describe(
    'Mínimo en SMMLV. Null si se expresa en moneda o no aplica'
  ),
  minimo_valor: z.number().nullable().describe(
    'Mínimo en moneda. Null si se expresa en SMMLV'
  ),
  condicion_textual: z.string().describe(
    'Texto LITERAL extraído del documento describiendo la condición del deducible'
  ),
});

/**
 * Cobertura/amparo individual de riesgos financieros.
 */
const RfCoverageSchema = z.object({
  nombre: z.string().describe('Nombre del amparo'),
  tipo: z.enum([
    'hurto_calificado',          // Sustracción con violencia por empleado
    'abuso_confianza',           // Apropiación indebida
    'falsedad',                  // Alteración de documentos
    'estafa',                    // Engaño con provecho ilícito
    'no_identificados',          // Pérdida sin culpable identificado
    'personal_temporal',         // Empleados de outsourcing / vigilantes
    'fraude_computador',         // Hackeo/desvío de fondos electrónico
    'falsificacion_titulos',     // Falsificación de cheques/títulos
    'ingenieria_social',         // Phishing / engaño a empleados
    'otro',
  ]).describe('Clasificación del amparo según ontología de riesgos financieros'),
  incluido: z.boolean().describe('Si está incluido en la póliza'),
  detalle: z.string().nullable().describe('Condiciones especiales o restricciones'),
});

/**
 * Esquema raíz de extracción Riesgos Financieros — con campos OBLIGATORIOS
 * para garantías y cobertura de ingeniería social.
 */
const RfExtractionSchema = z.object({
  // Identificación
  aseguradora: z.string().describe('Nombre de la compañía aseguradora'),
  numero_poliza: z.string().nullable().describe('Número de póliza'),
  vigencia_desde: z.string().nullable().describe('Fecha inicio vigencia'),
  vigencia_hasta: z.string().nullable().describe('Fecha fin vigencia'),
  moneda: z.string().default('COP').describe('Moneda de la póliza'),

  // Estructura de la póliza
  estructura_poliza: PolicyStructureEnum.describe(
    'OBLIGATORIO: Clasificar si es Fidelidad (solo fraude interno), Crime Manager (interno + externo + ciber), o Mixta'
  ),

  // Límite global
  limite_global: z.number().nullable().describe(
    'Límite máximo agregado de la póliza (Manejo Global o Límite Crime)'
  ),

  // Estructura de límites (global + sublímites)
  limites: z.array(RfLimitLineSchema).describe(
    'Estructura de límites por amparo. CRÍTICO: identificar si es global, al_100 o sublimite (con % del global)'
  ),

  // Coberturas
  coberturas: z.array(RfCoverageSchema).describe(
    'Lista de amparos identificados en la póliza, clasificados por tipo'
  ),

  // Deducibles (escalonados por tipo)
  deducibles: z.array(RfDeductibleSchema).describe(
    'Estructura de deducibles por amparo. Nota: Ingeniería Social suele tener el deducible más alto (~20%)'
  ),

  // Económicos
  prima_neta: z.number().nullable().describe('Prima neta'),
  iva: z.number().nullable().describe('IVA'),
  prima_total: z.number().nullable().describe('Prima total a pagar'),

  // ═══════════════════════════════════════════════════════════════════
  // CAMPOS OBLIGATORIOS DE RIESGOS FINANCIEROS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * GARANTÍAS EXIGIDAS — controles operativos que la aseguradora
   * exige como condición para mantener la cobertura.
   * Sin cumplimiento → siniestro rechazado.
   * Ejemplos: "Auditorías externas anuales", "Verificación de antecedentes
   * penales de empleados", "Arqueos de caja sorpresivos", "Segregación de funciones".
   */
  garantias_exigidas: z.array(z.string()).describe(
    'OBLIGATORIO: Lista de TODAS las garantías/condiciones exigidas. Ej: auditorías externas, antecedentes penales, arqueos de caja, segregación de funciones, controles de acceso a sistemas. Array vacío si no se encuentran.'
  ),

  /**
   * ¿Cubre Ingeniería Social (Phishing)?
   * Determina si la póliza protege contra el fraude moderno por engaño
   * electrónico a empleados. Este es el diferenciador clave entre
   * Fidelidad tradicional y Crime Manager.
   */
  cubre_ingenieria_social: z.boolean().describe(
    'OBLIGATORIO: ¿La póliza incluye cobertura de Ingeniería Social (Phishing/Spoofing)? true = sí, false = no aparece o está excluida explícitamente.'
  ),

  // Campos opcionales (pueden faltar en pólizas básicas de solo Fidelidad)
  periodo_descubrimiento: z.string().nullable().optional().describe(
    'Plazo después del vencimiento para descubrir y reportar pérdidas. Típicamente 12-24 meses. Null si no especificado'
  ),
  retroactividad: z.string().nullable().optional().describe(
    'Fecha o condición de retroactividad. Null si no aplica'
  ),
  numero_empleados_cubiertos: z.number().nullable().optional().describe(
    'Cantidad de empleados amparados si la póliza lo especifica'
  ),
  coaseguro: z.string().nullable().optional().describe(
    'Detalle de coaseguro si aplica'
  ),
});

// ═════════════════════════════════════════════════════════════════════════════
// RIESGOS FINANCIEROS STRATEGY CLASS
// ═════════════════════════════════════════════════════════════════════════════

export class RiesgosFinancierosStrategy implements CategoryStrategy {
  readonly categoryId = 'riesgos_financieros' as const;
  readonly categoryLabel = 'Riesgos Financieros (Manejo / Crime)';

  // ── Domain Context (Sección 3: "El Por Qué") ─────────────────────

  getDomainContext(): string {
    return `Estás analizando una póliza de **Riesgos Financieros** — protege el patrimonio de la empresa contra pérdidas por actos fraudulentos o deshonestos. Existen dos estructuras radicalmente distintas que DEBES identificar primero:
- **Fidelidad / Manejo Global:** SOLO cubre fraude INTERNO (empleados del asegurado — hurto, abuso de confianza, falsedad, estafa).
- **Crime Manager:** Cubre fraude interno + EXTERNO + CIBERNÉTICO (hackeo, falsificación de títulos, Ingeniería Social/Phishing).

**REGLAS DE INFERENCIA OBLIGATORIAS PARA RIESGOS FINANCIEROS:**

**A. FIDELIDAD TRADICIONAL vs. CRIME — LA BRECHA DIGITAL (REGLA FUNDAMENTAL)**
Hoy los mayores robos corporativos son por Phishing e Ingeniería Social: un empleado es engañado para transferir dinero a un estafador externo. Una póliza de "Fidelidad" pura lo NEGARÁ porque el estafador NO es empleado. DEBES:
1. Clasificar la póliza como "fidelidad", "crime_manager" o "mixta".
2. Si es solo Fidelidad, advertir explícitamente: *"⚠️ Esta póliza NO cubre fraude externo ni cibernético. Los ataques de Phishing/Ingeniería Social — hoy la causa #1 de pérdidas — están EXCLUIDOS."*
3. Al comparar: ponderar MEJOR las estructuras Crime Manager por su cobertura integral.

**B. LA TRAMPA PROBATORIA: EMPLEADOS NO IDENTIFICADOS (REGLA CRÍTICA)**
El sublímite de "Empleados No Identificados" es la cobertura más usada en la práctica: cuando hay faltantes de caja pero no se puede probar cuál empleado fue responsable. La aseguradora limita este amparo porque no puede subrogar (demandar al culpable). DEBES:
1. Extraer el sublímite exacto como porcentaje del global (ej: 20%).
2. PENALIZAR propuestas con sublímite de No Identificados menor al 20% del global — dan falsa sensación de seguridad.
3. Resaltar este sublímite con prominencia en el análisis porque es el escenario más frecuente de reclamación.

**C. GARANTÍAS ESTRICTAS — AUDITORÍA KYC OBLIGATORIA**
Este ramo está plagado de garantías previas (controles que la empresa debe tener antes del siniestro). Si la empresa no cumple → la aseguradora rechaza el reclamo. DEBES:
1. Extraer CADA garantía: auditorías externas anuales, verificación de antecedentes penales, arqueos de caja, segregación de funciones, controles de acceso a sistemas.
2. Cruzar con el brief: si el cliente indica "NO tiene auditorías" y la póliza las exige como garantía, emitir **⚠️ ALERTA CRÍTICA: Garantía incumplida — siniestro será rechazado**.
3. Al comparar: la póliza con garantías más alcanzables es preferible operativamente.

**D. TRDM (SUSTRACCIÓN) NO ES SUSTITUTO**
La cobertura de "Sustracción" del TRDM NUNCA paga un hurto cometido por un empleado ni un hurto sin violencia. Si el brief corresponde a una empresa de retail, manejo de valores o con muchos empleados en contacto con dinero/mercancía, y NO tiene póliza de Riesgos Financieros, señalarlo como gap crítico.

**E. EVALUACIÓN CON DATOS DEL BRIEF**
- Si el brief indica un número alto de empleados con manejo de dinero, verificar que el límite global sea proporcional al riesgo (regla general: al menos $50M COP por cada 5 empleados de manejo).
- Si el brief indica que NO tiene auditorías, cruzar contra las garantías exigidas y alertar incompatibilidad.`;
  }

  // ── Analysis Checklist ────────────────────────────────────────────

  getAnalysisChecklist(): string[] {
    return [
      'Clasificar la estructura de la póliza: Fidelidad (solo interno), Crime Manager (interno + externo + ciber), o Mixta',
      'Extraer el Límite Global (Manejo Global / Crime) y cada sublímite como porcentaje del global',
      'Auditar el sublímite de "Empleados No Identificados" — alertar si es menor al 20% del global',
      'Verificar si incluye cobertura de Ingeniería Social/Phishing — advertir prominentemente si no la tiene',
      'Extraer TODAS las Garantías exigidas (auditorías, antecedentes, arqueos, segregación, controles de acceso)',
      'Cruzar garantías vs. brief: si el cliente indica NO tiene auditorías y la póliza las exige → alerta crítica',
      'Extraer deducibles escalonados por tipo de amparo — notar que Ingeniería Social suele tener el más alto (~20%)',
      'Verificar cobertura de Personal Temporal / Firmas de Outsourcing si la empresa usa terceros',
      'Evaluar período de descubrimiento (plazo post-vencimiento para reportar pérdidas)',
      'Comparar límite global vs. número de empleados con manejo de dinero del brief',
    ];
  }

  // ── Infraseguro Rules ─────────────────────────────────────────────

  getInfraseguroRules(): string {
    return `**Reglas de Infraseguro — Riesgos Financieros (Sublímites y Gaps)**

1. **Sublímite de No Identificados < 20%:** Si el sublímite para "Empleados No Identificados" es menor al 20% del límite global, la póliza ofrece protección insuficiente para el escenario más frecuente de reclamación. Alertar como "falsa sensación de seguridad".

2. **Sin Cobertura Crime/Ciber:** Si la póliza es puramente de Fidelidad y la empresa tiene operaciones digitales o bancarias, hay un gap crítico para fraude externo (hackeo, phishing). Recomendar migración a Crime Manager.

3. **Límite Global vs. Exposición:** Para empresas con más de 10 empleados manejando dinero, un límite global inferior a $500M COP es potencialmente insuficiente. Para más de 50 empleados, evaluar límites de al menos $1,000M.

4. **Deducible de Ingeniería Social > 25%:** Deducibles de Ingeniería Social superiores al 25% son excesivos — el empleado víctima del engaño ya asumió el error, y un deducible alto desincentiva la reclamación.

5. **Garantía de Auditoría Incumplible:** Si la póliza exige auditoría externa anual y el brief indica que la empresa NO realiza auditorías, toda la póliza está en riesgo de ser objetada — prioridad máxima de alerta.`;
  }

  // ── Regulatory Notes ──────────────────────────────────────────────

  getRegulatoryNotes(): string {
    return `**Notas Regulatorias — Riesgos Financieros (Colombia)**
- Las conductas cubiertas están tipificadas en el Código Penal (Art. 239-246: hurto, estafa, abuso de confianza, falsedad).
- La subrogación contra el empleado culpable se rige por el Art. 1096 del Código de Comercio.
- Las pólizas Crime con cobertura de fraude informático deben considerar la Ley 1273 de 2009 (delitos informáticos).
- El período de descubrimiento (discovery period) es una extensión contractual no regulada — varía según negociación.
- Superintendencia Financiera exige controles de lavado de activos (SARLAFT) — algunas pólizas incluyen garantía de cumplimiento SARLAFT.
- Empresas del sector financiero regulado tienen obligatoriedad de este seguro bajo circular básica jurídica de la SFC.`;
  }

  // ── Field Labels (para serialización YAML) ────────────────────────

  getFieldLabels(): FieldLabelMap {
    return {
      limite_indemnizacion: 'Límite de Indemnización Solicitado',
      empleados_manejo_dinero: 'Empleados con Manejo de Dinero/Valores',
      tiene_auditorias: '¿Realiza Auditorías Externas Periódicas?',
    };
  }

  // ── PII Classification ────────────────────────────────────────────

  getPiiClassification(): Record<string, PiiClassification> {
    return {
      limite_indemnizacion: 'safe',
      empleados_manejo_dinero: 'safe',
      tiene_auditorias: 'safe',
    };
  }

  // ── Extraction Schema (Zod) ───────────────────────────────────────

  getExtractionSchema(): z.ZodType {
    return RfExtractionSchema;
  }

  // ── Comparison Priorities ─────────────────────────────────────────

  getComparisonPriorities(): string[] {
    return [
      'Estructura de la póliza: Fidelidad vs. Crime Manager (Crime es estrictamente superior)',
      'Cobertura de Ingeniería Social / Phishing (presente o ausente)',
      'Sublímite de Empleados No Identificados (porcentaje del global — ≥ 20% recomendado)',
      'Límite Global y sublímites por amparo',
      'Garantías exigidas: cantidad y viabilidad operativa (menos onerosas = mejor)',
      'Deducible de Ingeniería Social (el más alto de todos — comparar entre cotizaciones)',
      'Cobertura de Fraude por Computador (hackeo/desvío electrónico)',
      'Cobertura de Personal Temporal / Firmas de Outsourcing',
      'Prima total y relación prima/límite global',
      'Período de descubrimiento (más largo = más seguro para el asegurado)',
    ];
  }
}

// ── Export Zod schemas for external use (validation, testing) ────────────────

export {
  RfExtractionSchema,
  RfLimitLineSchema,
  RfDeductibleSchema,
  RfCoverageSchema,
  RfLimitNatureEnum,
  PolicyStructureEnum,
};
