// src/lib/prompts/strategies/hogar.strategy.ts
/**
 * Hogar Strategy — Multiriesgo Residencial (B2C Familiar)
 *
 * Estrategia especializada para pólizas de Hogar que protegen la
 * vivienda (contenedor) y los bienes personales (contenido) frente
 * a eventos accidentales, naturales y antrópicos.
 *
 * Ontología codificada:
 *   - Desglose obligatorio: Edificio (reconstrucción) vs. Contenidos vs. EEE
 *   - El "Error Inmobiliario": valor comercial incluye terreno → sobreseguro
 *   - Propietario vs. Arrendatario (el inquilino NO asegura el edificio)
 *   - RC Familiar: mascotas, empleados domésticos, hijos menores
 *   - Hurto Fuera del Predio: extensión especial para atraco en la calle
 *   - Asistencias Domiciliarias: plomería, electricidad, cerrajería (topes)
 *   - Deducibles diferenciados: naturaleza (2% valor) vs. accidentales (copago fijo)
 *
 * Fuente de dominio: docs/knowledge/hogar-rules.md
 *
 * @module prompts/strategies/hogar.strategy
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
 * Tipo de vivienda asegurada.
 */
const TipoViviendaEnum = z.enum([
  'casa',
  'apartamento',
]);

/**
 * Estatus de tenencia del asegurado sobre el inmueble.
 *   - propietario:   asegura Edificio + Contenidos + RC
 *   - arrendatario:  asegura SOLO Contenidos + RC Arrendatario (NO edificio)
 */
const EstadoTenenciaEnum = z.enum([
  'propietario',
  'arrendatario',
]);

/**
 * Categoría de ítem asegurable dentro de la póliza de hogar.
 * §1.1: El cliente no asegura un "límite global", debe declarar valores exactos.
 */
const ItemAsegurableEnum = z.enum([
  'edificio',                    // Estructura física — valor de RECONSTRUCCIÓN
  'contenidos',                  // Muebles, ropa, electrodomésticos
  'equipo_electrico_electronico', // TVs, computadores, consolas
  'objetos_valor',               // Joyería, arte (requieren avalúo)
  'alojamiento_temporal',        // Sublímite para vivienda temporal post-siniestro
]);

/**
 * Tipo de evento/cobertura de hogar.
 * §1.2 + §1.3: Naturaleza, Accidentales, Antrópicos, EEE, RC, Asistencias.
 */
const HogarCoberturaTipoEnum = z.enum([
  'incendio',                    // Accidental
  'terremoto',                   // Naturaleza
  'inundacion',                  // Naturaleza
  'vientos',                     // Naturaleza
  'danios_agua',                 // Rotura de tuberías (accidental)
  'sustraccion_con_violencia',   // Robo en el hogar (antrópico)
  'hurto_fuera_del_predio',      // Extensión especial — atraco en la calle
  'danios_eee',                  // Cortocircuitos, variaciones de voltaje
  'rc_familiar',                 // RC por mascotas, hijos, empleados domésticos
  'rc_arrendatario',             // RC específica del inquilino hacia el propietario
  'asistencia_domiciliaria',     // Plomería, electricidad, cerrajería
  'alojamiento_temporal',        // Gastos de vivienda temporal post-siniestro
  'otro',
]);

// ── Sub-schemas ──────────────────────────────────────────────────────────────

/**
 * Valor asegurado por ítem (Edificio, Contenidos, EEE, etc.).
 * Replica §2 Extracción 1.
 * CRÍTICO: Edificio debe ser valor de RECONSTRUCCIÓN, no comercial.
 */
const HogarValorAseguradoSchema = z.object({
  item: ItemAsegurableEnum.describe(
    'Tipo de ítem: edificio, contenidos, equipo_electrico_electronico, objetos_valor, alojamiento_temporal'
  ),
  valor_asegurado: z.number().nullable().describe(
    'Valor asegurado en moneda. Para Edificio: DEBE ser valor de reconstrucción (SIN incluir terreno).'
  ),
  es_valor_reconstruccion: z.boolean().nullable().describe(
    'Solo para Edificio: true si explícitamente indica "valor de reconstrucción". false si parece incluir valor del terreno/comercial. null para otros ítems.'
  ),
  nota: z.string().nullable().describe(
    'Nota adicional (ej: "Sublímite Max. 6 meses" para alojamiento temporal)'
  ),
});

/**
 * Cobertura individual de la póliza de hogar.
 */
const HogarCoverageSchema = z.object({
  nombre: z.string().describe('Nombre de la cobertura'),
  tipo: HogarCoberturaTipoEnum.describe('Clasificación según ontología de hogar'),
  incluido: z.boolean().describe('Si está incluido'),
  limite: z.string().nullable().describe(
    'Límite o condición textual (ej: "$500,000,000", "Sublímite $15M")'
  ),
  aplica_a: z.enum(['edificio', 'contenidos', 'ambos']).nullable().describe(
    'A qué ítem aplica la cobertura. null si es RC o asistencia.'
  ),
  detalle: z.string().nullable().describe('Condiciones especiales'),
});

/**
 * Deducible residencial por cobertura.
 * Replica §2 Extracción 2.
 * Diferencia deducibles amigables (accidentales) de los severos (naturaleza).
 */
const HogarDeductibleSchema = z.object({
  cobertura: z.string().describe(
    'Cobertura aplicable (ej: "Incendio", "Terremoto", "Sustracción", "RC Familiar")'
  ),
  tipo_deducible: z.enum([
    'sin_deducible',         // Sin copago — ideal para incendio y RC
    'copago_fijo',           // Monto fijo por evento (ej: $50,000)
    'porcentaje_valor',      // % del valor asegurable del ítem afectado (terremoto: 2%)
    'porcentaje_perdida',    // % de la pérdida (sustracción: 10%)
  ]).describe(
    'Tipo: sin_deducible, copago_fijo, porcentaje_valor (naturaleza), porcentaje_perdida (sustracción)'
  ),
  monto_copago: z.number().nullable().describe(
    'Si tipo = copago_fijo: monto en COP. null para otros tipos.'
  ),
  porcentaje: z.number().nullable().describe(
    'Si tipo = porcentaje_valor o porcentaje_perdida: porcentaje aplicado. null para otros.'
  ),
  minimo_smmlv: z.number().nullable().describe(
    'Mínimo en SMMLV. null si no aplica.'
  ),
  condicion_textual: z.string().describe(
    'Texto LITERAL extraído del documento'
  ),
});

/**
 * Asistencia domiciliaria con tope económico.
 * §3-D: La plomería se usa más que la cobertura de terremoto.
 * La IA DEBE comparar topes entre cotizaciones.
 */
const AsistenciaDomiciliariaSchema = z.object({
  servicio: z.enum([
    'plomeria',
    'electricidad',
    'cerrajeria',
    'vidrieria',
    'fumigacion',
    'linea_blanca',      // Reparación de electrodomésticos
    'otro',
  ]).describe('Tipo de asistencia domiciliaria'),
  tope_por_evento: z.number().nullable().describe(
    'Tope máximo en COP por evento de asistencia. null si ilimitado o no especificado.'
  ),
  eventos_por_anio: z.number().nullable().describe(
    'Número máximo de eventos por año. null si ilimitado.'
  ),
  condicion_textual: z.string().describe(
    'Texto extraído (ej: "$500,000 por evento, máx 4 eventos/año")'
  ),
});

// ── Schema Raíz ──────────────────────────────────────────────────────────────

/**
 * Esquema raíz de extracción Hogar / Multiriesgo Residencial.
 * Campos obligatorios sin `.nullable()`.
 */
const HogarExtractionSchema = z.object({
  // ── Identificación ──
  aseguradora: z.string().describe('Nombre de la compañía aseguradora'),
  numero_poliza: z.string().nullable().describe('Número de póliza'),
  vigencia_desde: z.string().nullable().describe('Fecha inicio vigencia'),
  vigencia_hasta: z.string().nullable().describe('Fecha fin vigencia'),
  moneda: z.string().default('COP').describe('Moneda de la póliza'),

  // ── Inmueble ──
  tipo_vivienda: TipoViviendaEnum.nullable().describe(
    'Tipo de vivienda: casa o apartamento. null si no se especifica.'
  ),
  estado_tenencia: EstadoTenenciaEnum.nullable().describe(
    'Estatus de tenencia: propietario o arrendatario. null si no se especifica. CRÍTICO: Si arrendatario, NO debería asegurar el edificio.'
  ),
  direccion_inmueble: z.string().nullable().describe(
    'Dirección del inmueble asegurado. null si no se menciona.'
  ),

  // ── Valores Asegurados por Ítem (Desglose Obligatorio) ──
  valores_asegurados: z.array(HogarValorAseguradoSchema).describe(
    'Desglose de valores por ítem. CRÍTICO: Edificio debe ser valor de reconstrucción (SIN terreno). Si el valor parece comercial, alertar sobre Error Inmobiliario.'
  ),

  // ── Acceso rápido: montos principales ──
  valor_edificio: z.number().nullable().describe(
    'Valor asegurado del Edificio (reconstrucción). null si el asegurado es arrendatario.'
  ),
  valor_contenidos: z.number().nullable().describe(
    'Valor asegurado de Contenidos (muebles + enseres + ropa).'
  ),
  valor_eee: z.number().nullable().describe(
    'Valor asegurado de Equipo Eléctrico y Electrónico. null si no se desglosa.'
  ),

  // ── RC Familiar ──
  rc_familiar_limite: z.number().nullable().describe(
    'Límite de Responsabilidad Civil Familiar (daños a terceros por mascotas, hijos, empleados domésticos).'
  ),
  rc_familiar_sin_deducible: z.boolean().describe(
    'true si la RC Familiar es Sin Deducible. Estándar del mercado = true.'
  ),

  // ── Coberturas ──
  coberturas: z.array(HogarCoverageSchema).describe(
    'Lista de coberturas identificadas en la póliza de hogar.'
  ),

  // ── Deducibles ──
  deducibles: z.array(HogarDeductibleSchema).describe(
    'Estructura de deducibles. Eventos accidentales deben tener deducibles amigables. Naturaleza (terremoto) tipicamente 2% del valor.'
  ),

  // ── Hurto Fuera del Predio (extensión especial) ──
  cubre_hurto_fuera_del_predio: z.boolean().describe(
    'OBLIGATORIO: true si la póliza incluye extensión de "Hurto fuera del predio" / "Atraco en la calle". Si false, la laptop robada en un café NO está cubierta. La IA DEBE destacar esta cláusula.'
  ),

  // ── Asistencias Domiciliarias (topes económicos) ──
  asistencias_destacadas: z.array(AsistenciaDomiciliariaSchema).describe(
    'OBLIGATORIO: Servicios de asistencia domiciliaria con sus topes. La plomería se usa más que la cobertura de terremoto — comparar topes entre cotizaciones.'
  ),

  // ── Alojamiento Temporal ──
  alojamiento_temporal_limite: z.number().nullable().describe(
    'Sublímite de gastos de alojamiento temporal post-siniestro. null si no incluido.'
  ),
  alojamiento_temporal_meses: z.number().nullable().describe(
    'Máximo de meses de alojamiento temporal. null si no especificado.'
  ),

  // ── Económicos ──
  prima_neta: z.number().nullable().describe('Prima neta anual'),
  iva: z.number().nullable().describe('IVA'),
  prima_total: z.number().nullable().describe('Prima total a pagar'),
});

// ═════════════════════════════════════════════════════════════════════════════
// HOGAR STRATEGY CLASS
// ═════════════════════════════════════════════════════════════════════════════

export class HogarStrategy implements CategoryStrategy {
  readonly categoryId = 'hogar' as const;
  readonly categoryLabel = 'Hogar / Multiriesgo Residencial';

  // ── Domain Context (Sección 3: "El Por Qué") ─────────────────────

  getDomainContext(): string {
    return `Estás analizando una póliza de **Hogar / Multiriesgo Residencial** — un seguro B2C que protege la vivienda (contenedor) y los bienes personales (contenido) de una familia frente a eventos accidentales, naturales y antrópicos. También incluye RC Familiar y asistencias domiciliarias.

**REGLAS DE INFERENCIA OBLIGATORIAS PARA HOGAR:**

**A. EL "ERROR INMOBILIARIO" — SOBRESEGURO POR INCLUIR EL TERRENO (REGLA CRÍTICA)**
Este es el error más costoso y frecuente en seguros de hogar. El Edificio se asegura por su **valor de RECONSTRUCCIÓN** (costo de volver a levantar los ladrillos, puertas, ventanas), NO por el valor comercial inmobiliario (que incluye el precio del terreno/suelo).

Ejemplo práctico: Un apartamento vale comercialmente $1,000,000,000. De esos, $400,000,000 es el valor del terreno/suelo. El terreno NO se quema, NO se inunda, NO se lo roban. Si el cliente asegura $1,000,000,000, está pagando prima sobre $400M que la aseguradora JAMÁS le indemnizará (porque el terreno sigue ahí). Esto es **sobreseguro** y la familia está regalando dinero.

La IA DEBE:
- Si el valor de edificio de la póliza parece incluir el valor comercial completo (ej: coincide con el avalúo catastral o precio de compraventa), emitir: **🚨 ALERTA: Posible Error Inmobiliario — el valor asegurado del edificio ($X) parece incluir el terreno. El valor correcto es el de RECONSTRUCCIÓN (solo ladrillos), que típicamente es 40–60% del valor comercial. La familia podría estar pagando prima innecesaria sobre $Y.**
- Si el brief declara un valor de edificación y la póliza lo replica sin ajuste, alertar que probablemente incluye terreno.

**B. PROPIETARIO vs. ARRENDATARIO — ADAPTAR EL ANÁLISIS (REGLA DE TENENCIA)**
La cobertura cambia radicalmente según quién es el asegurado:
- **Propietario:** Asegura Edificio + Contenidos + RC Familiar. El Edificio es su patrimonio.
- **Arrendatario (Inquilino):** Asegura SOLO Contenidos + RC Arrendatario. El edificio le pertenece al dueño, NO al inquilino. Si la IA detecta que le cobran prima de Edificio a un arrendatario, DEBE emitir: **⚠️ ERROR: El asegurado es arrendatario pero la póliza incluye cobertura de Edificio. El inquilino NO debe pagar prima sobre una estructura que no le pertenece — solo necesita Contenidos y RC Arrendatario.**
- Si el brief indica "arrendatario" pero la póliza cubre edificio → marcar como error de cotización.

**C. HURTO FUERA DEL PREDIO — LA FALSA EXPECTATIVA (REGLA DE COBERTURA EXTENDIDA)**
El cliente promedio cree que su laptop está cubierta si se la roban en un café o en la calle. Esto es FALSO a menos que la póliza incluya expresamente la extensión "Hurto fuera del predio" o "Atraco en vía pública". La IA DEBE:
- Buscar explícitamente esta cláusula.
- Si NO la encuentra, advertir: *"La póliza cubre sustracción DENTRO del hogar, pero NO cubre robo/atraco fuera del domicilio. Si el asegurado necesita proteger equipos portátiles fuera de casa, debe confirmar esta extensión."*
- Si la encuentra, destacarla como diferenciador positivo.

**D. ASISTENCIAS DOMICILIARIAS — EL BENEFICIO MÁS USADO (REGLA DE VALOR PRÁCTICO)**
El servicio que más usa una familia NO es la cobertura de terremoto (ojala nunca), sino la asistencia de plomería, electricidad y cerrajería. La IA DEBE:
- Extraer los topes económicos por evento de cada asistencia.
- Comparar entre cotizaciones: $500,000/evento en plomería es SUPERIOR a $100,000/evento.
- Priorizar pólizas con ALTOS topes asistenciales — esto impacta directamente la satisfacción del cliente.

**E. DEDUCIBLES DIFERENCIADOS POR TIPO DE EVENTO**
- **Incendio / Accidentales:** Deducible amigable (sin deducible o copago fijo bajo = $50,000).
- **Terremoto / Naturaleza:** Deducible severo (típico: 2% del valor asegurable del ítem afectado). Esto es estándar del mercado — no es un defecto.
- **Sustracción (Robo):** Deducible intermedio (10% de la pérdida, mín 1 SMMLV).
- **RC Familiar:** Sin deducible.
La IA debe explicar estas diferencias al usuario para evitar falsas expectativas.

**F. EVALUACIÓN CON DATOS DEL BRIEF**
- Si el brief indica "arrendatario" pero la póliza cubre edificio → error.
- Si el brief declara valor de edificación y la póliza difiere significativamente → alertar.
- Si el brief indica "casa" pero la póliza dice "apartamento" (o viceversa) → gap de identificación.
- Cruzar valor de muebles/enseres del brief vs. contenidos de la póliza.`;
  }

  // ── Analysis Checklist ────────────────────────────────────────────

  getAnalysisChecklist(): string[] {
    return [
      'AUDITAR EL "ERROR INMOBILIARIO": ¿El valor del Edificio parece incluir el terreno? Si coincide con valor comercial, alertar sobreseguro y calcular la prima desperdiciada',
      'Verificar PROPIETARIO vs. ARRENDATARIO: si es inquilino, NO debe tener cobertura de Edificio — solo Contenidos + RC Arrendatario',
      'Buscar extensión de "Hurto fuera del predio" / Atraco en vía pública — si no la tiene, advertir la falsa expectativa de cobertura portátil',
      'Extraer topes de asistencias domiciliarias (plomería, electricidad, cerrajería) — comparar montos entre cotizaciones; $500K > $100K por evento',
      'Extraer desglose de valores asegurados: Edificio (reconstrucción), Contenidos, EEE, Objetos de Valor — NO deben ser un "límite global"',
      'Extraer límite de RC Familiar — verificar que sea Sin Deducible',
      'Extraer deducible de Terremoto/Naturaleza (típico: 2% del valor asegurable) — explicar al usuario que es estándar',
      'Verificar deducible de Sustracción (robo): típico 10% de la pérdida, mín 1 SMMLV',
      'Buscar sublímite de Alojamiento Temporal (gastos de vivienda post-siniestro) — verificar monto y plazo máximo',
      'Comparar valores del brief (edificación + muebles) vs. valores asegurados de la póliza — alertar discrepancias',
    ];
  }

  // ── Infraseguro Rules ─────────────────────────────────────────────

  getInfraseguroRules(): string {
    return `**Reglas de Infraseguro — Hogar / Multiriesgo Residencial (Patrimonio Familiar)**

1. **Error Inmobiliario (Sobreseguro):** Si el valor asegurado del Edificio incluye el terreno, la familia paga prima sobre dinero que la aseguradora JAMÁS indemnizará. El terreno no se quema ni se inunda. Valor correcto = reconstrucción (40–60% del valor comercial). Alertar y cuantificar la prima desperdiciada.

2. **Arrendatario Asegurando Edificio:** Si el asegurado es inquilino y la póliza cubre el Edificio, está pagando por un patrimonio ajeno. Solo necesita Contenidos + RC Arrendatario. Marcar como error de cotización.

3. **Sin Hurto Fuera del Predio:** Si la familia tiene laptops, celulares, cámaras y la póliza NO cubre hurto fuera del domicilio, esos bienes NO están protegidos en la calle. Alertar la falsa expectativa.

4. **Asistencias con Topes Bajos:** Si la plomería tiene tope de $100,000 por evento y una visita de plomero en 2026 cuesta $200,000+, la asistencia es cosmética. Priorizar pólizas con topes reales (≥ $400,000).

5. **Contenidos Subdeclarados:** Las familias suelen subestimar el valor de sus muebles, ropa y electrodomésticos. Si el brief declara $30M pero la realidad de un hogar promedio es $80M+, alertar posible subseguro de contenidos.

6. **Objetos de Valor No Declarados:** Joyería, arte y colecciones requieren avalúo y declaración expresa. Si no están declarados, NO están cubiertos, sin importar la cobertura de contenidos.`;
  }

  // ── Regulatory Notes ──────────────────────────────────────────────

  getRegulatoryNotes(): string {
    return `**Notas Regulatorias — Hogar / Multiriesgo Residencial (Colombia)**
- El valor de reconstrucción se calcula por metro cuadrado según estándares constructivos locales (Camacol), no por el valor de compraventa del inmueble.
- La responsabilidad civil por mascotas potencialmente peligrosas (Ley 746/2002) puede exceder los límites de RC Familiar — verificar límites adecuados.
- El régimen de Propiedad Horizontal (Ley 675/2001) establece que áreas comunes están cubiertas por la póliza del edificio/conjunto, no por la individual del propietario.
- Terremoto es un riesgo catastrófico asumido por el Pool de Reaseguro colombiano — los deducibles de 2% son estándar por imposición del reasegurador.
- La Superintendencia Financiera exige que la póliza de hogar incluya cláusula de proporcionalidad (regla proporcional) cuando hay subseguro.
- En arrendamiento, el arrendatario tiene responsabilidad civil sobre daños al inmueble durante la tenencia (Art. 2005 del Código Civil).`;
  }

  // ── Field Labels (para serialización YAML) ────────────────────────

  getFieldLabels(): FieldLabelMap {
    return {
      valor_edificacion: 'Valor Edificación (Declarado por el Usuario)',
      valor_muebles_enseres: 'Valor Muebles y Enseres (Declarado)',
      ubicacion_inmueble: 'Ubicación del Inmueble',
      tipo_vivienda: 'Tipo de Vivienda',
      estado_tenencia: 'Estatus de Tenencia',
    };
  }

  // ── PII Classification ────────────────────────────────────────────

  getPiiClassification(): Record<string, PiiClassification> {
    return {
      valor_edificacion: 'safe',       // Valor del bien, no dato personal
      valor_muebles_enseres: 'safe',   // Valor del bien
      ubicacion_inmueble: 'mask',      // Dirección identifica al asegurado → sanitizar
      tipo_vivienda: 'safe',           // Tipo genérico (casa/apto)
      estado_tenencia: 'safe',         // Estatus de tenencia (propietario/arrendatario)
    };
  }

  // ── Extraction Schema (Zod) ───────────────────────────────────────

  getExtractionSchema(): z.ZodType {
    return HogarExtractionSchema;
  }

  // ── Comparison Priorities ─────────────────────────────────────────

  getComparisonPriorities(): string[] {
    return [
      'Error Inmobiliario: ¿El valor del Edificio incluye terreno? Alertar sobreseguro y calcular prima desperdiciada',
      'Propietario vs. Arrendatario: si es inquilino, NO debe tener cobertura de Edificio',
      'Hurto fuera del predio: ¿Incluye extensión de atraco en la calle? Destacar como diferenciador',
      'Asistencias domiciliarias: topes por evento de plomería, electricidad, cerrajería — $500K > $100K',
      'RC Familiar: límite adecuado y Sin Deducible',
      'Deducible de Terremoto/Naturaleza: típico 2% del valor — explicar que es estándar',
      'Deducible de Sustracción (robo): 10% mín 1 SMMLV es estándar',
      'Alojamiento Temporal: sublímite y plazo máximo (ej: $15M / 6 meses)',
      'Valores Asegurados: desglose Edificio vs. Contenidos vs. EEE (no global)',
      'Prima total anual (relación costo/beneficio con cobertura ajustada a tenencia)',
    ];
  }
}

// ── Export Zod schemas for external use (validation, testing) ────────────────

export {
  HogarExtractionSchema,
  HogarValorAseguradoSchema,
  HogarCoverageSchema,
  HogarDeductibleSchema,
  AsistenciaDomiciliariaSchema,
  TipoViviendaEnum,
  EstadoTenenciaEnum,
  ItemAsegurableEnum,
  HogarCoberturaTipoEnum,
};
