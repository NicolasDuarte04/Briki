// src/lib/prompts/insurance-analysis.ts
/**
 * Sistema de Análisis de Riesgos Corporativos y Personales
 * 
 * ARQUITECTURA: Máquina de Estados con 5 Modos de Operación
 * - MODO 1: Actualización de Brief (Case Edit)
 * - MODO 2: Análisis de Línea Base (Baseline Analysis)
 * - MODO 3: Análisis Comparativo (Challenger Comparison)
 * - MODO 4: Consultas Específicas (Q&A Natural)
 * - MODO 5: Guardrails (Fuera de Contexto)
 * 
 * @version 3.0 - Dispatcher & Strategy Pattern (Category-Specific Analysis)
 * @date Febrero 2026
 */

import { CaseBrief } from '@/lib/types';
import { getCategoryDef } from '@/lib/insurance-categories';
import {
  resolveStrategy,
  ANALYSIS_REASON_CONTEXTS,
  sanitizeCategoryData,
  serializeBriefDataToYaml,
  summarizeBriefData,
} from './strategies';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface PromptData {
  message: string;
  brief: Partial<CaseBrief>;
  documents: Array<{ 
    fileName: string; 
    content: string | null; 
    analysisId?: string;
    documentRole?: 'baseline' | 'challenger';
  }>;
  previousAnalyses?: Array<{
    id: string;
    extractedData: any;
    artifact?: { fileName: string };
    documentRole?: 'baseline' | 'challenger';
    pageReferences?: Array<{
      fieldName: string;
      pageNumber: number;
      fieldValue?: string | null;
      confidence?: number | string | object;
    }>;
  }>;
}

type EntityType = 'empresa' | 'persona';
type OperationMode = 'brief_update' | 'baseline_analysis' | 'comparison' | 'qa' | 'guardrails' | 'individual_analysis';

// ============================================================================
// HELPERS DE INFERENCIA
// ============================================================================

/**
 * Infiere si el caso es de una Empresa o Persona basándose en los datos del brief
 */
function inferEntityType(brief: Partial<CaseBrief>): EntityType {
  // Criterio 1: subjectType explícito
  if (brief.subjectType === 'company') return 'empresa';
  if (brief.subjectType === 'client') return 'persona';
  
  // Criterio 2: Indicadores de empresa
  const hasCompanyIndicators = 
    (brief.businessType && /empresa|corporat|sas|s\.a\.|ltda|industri|comerci/i.test(brief.businessType)) ||
    (brief.selectedCompanyId !== undefined && brief.selectedCompanyId !== null);
  
  if (hasCompanyIndicators) return 'empresa';
  
  // Default: persona
  return 'persona';
}

/**
 * Infiere el rol del documento (baseline o challenger) basándose en el nombre del archivo
 */
function inferDocumentRole(fileName: string): 'baseline' | 'challenger' {
  const lowerName = fileName.toLowerCase();
  
  // Keywords que indican póliza actual/vigente (baseline)
  const baselineKeywords = ['actual', 'vigente', 'vencida', 'renovar', 'existente', 'current', 'base'];
  
  // Keywords que indican cotización/propuesta (challenger)
  const challengerKeywords = ['cotizacion', 'cotización', 'propuesta', 'nueva', 'oferta', 'quote', 'proposal'];
  
  for (const keyword of baselineKeywords) {
    if (lowerName.includes(keyword)) return 'baseline';
  }
  
  for (const keyword of challengerKeywords) {
    if (lowerName.includes(keyword)) return 'challenger';
  }
  
  // Default: challenger (nueva propuesta es más común)
  return 'challenger';
}

/**
 * Detecta el modo de operación basándose en el contexto
 */
function detectOperationMode(
  message: string,
  documents: PromptData['documents'],
  previousAnalyses: PromptData['previousAnalyses']
): OperationMode {
  const lowerMessage = message.toLowerCase().trim();
  
  // MODO 5: Guardrails - Detectar fuera de contexto
  const offTopicPatterns = [
    /receta|cocina|comida|ingrediente/i,
    /chiste|broma|gracioso/i,
    /clima|temperatura|lluvia/i,
    /película|serie|netflix/i,
    /^(escribe|redacta|genera|crea)\s+(un|una)\s+(poema|canción|historia|cuento)/i,
  ];
  
  for (const pattern of offTopicPatterns) {
    if (pattern.test(lowerMessage)) return 'guardrails';
  }
  
  // MODO 1: Brief Update - Mensajes con tag explícito [BRIEF_UPDATE] desde CaseBriefForm
  // ✅ FIX DEFECTO B: Priorizar detección por tag, independientemente de documentos cargados
  if (lowerMessage.includes('[brief_update]')) {
    return 'brief_update';
  }
  
  // MODO 6: Individual Analysis - Tag explícito [POLICY_ANALYSIS] desde Policies.tsx
  // Se activa al hacer clic en "Analizar PDF" o "Cargar Análisis" — resumen individual, sin comparar
  if (lowerMessage.includes('[policy_analysis]')) {
    return 'individual_analysis';
  }
  
  // MODO 1 (alternativo): Brief Update - Patrones de texto sobre actualización de formulario
  const briefUpdatePatterns = [
    /actualic[eé]|cambi[eé]|modifiqu[eé]/i,
    /el presupuesto|los empleados|el negocio/i,
    /nuevo valor|nueva cantidad/i,
  ];
  
  // Solo aplica si NO hay documentos nuevos con contenido
  if (documents.length === 0 || documents.every(d => !d.content)) {
    for (const pattern of briefUpdatePatterns) {
      if (pattern.test(lowerMessage)) return 'brief_update';
    }
  }
  
  // Detectar documentos nuevos con contenido
  const hasNewDocuments = documents.some(d => d.content && d.content.trim().length > 100);
  const hasPreviousAnalyses = previousAnalyses && previousAnalyses.length > 0;
  
  // Detectar baseline vs challengers
  const baselineDoc = documents.find(d => {
    const role = d.documentRole || inferDocumentRole(d.fileName);
    return role === 'baseline' && d.content;
  });
  
  const challengerDocs = documents.filter(d => {
    const role = d.documentRole || inferDocumentRole(d.fileName);
    return role === 'challenger' && d.content;
  });
  
  // MODO 3: Comparison - Hay challengers O análisis previos para comparar
  if (challengerDocs.length > 0 && (baselineDoc || hasPreviousAnalyses)) {
    return 'comparison';
  }
  
  // MODO 2: Baseline Analysis - Solo documento baseline sin challengers
  if (hasNewDocuments && !hasPreviousAnalyses) {
    return 'baseline_analysis';
  }
  
  // MODO 4: Q&A - Pregunta específica sin documentos nuevos
  const questionPatterns = [
    /\?$/,
    /^(qué|cuál|cómo|cuánto|dónde|por qué|explica|explícame)/i,
    /cubre|incluye|excluye|deducible|prima|límite/i,
  ];
  
  for (const pattern of questionPatterns) {
    if (pattern.test(lowerMessage)) return 'qa';
  }
  
  // Default: Q&A conversacional
  return 'qa';
}

// ============================================================================
// PROMPT TEMPLATE - SISTEMA DE ANÁLISIS PROFESIONAL
// ============================================================================

export const INSURANCE_ANALYSIS_PROMPT_TEMPLATE = `
═══════════════════════════════════════════════════════════════════════════════
⛔ DIRECTIVA DE PRIVACIDAD (PII PROTECTION) - LEE PRIMERO
═══════════════════════════════════════════════════════════════════════════════

NUNCA reproduzcas en tus respuestas:
- Listados de nombres propios de socios, empleados o beneficiarios individuales
- Números de identificación personal completos (CC, NIT completo, pasaportes)
- Direcciones físicas completas de personas
- Números de teléfono o correos electrónicos personales

SUSTITUYE siempre por:
- "Grupo Asegurado (X miembros)" en lugar de listar nombres
- "ID terminado en ***XXX" si debes referenciar un documento
- "Representante Legal: [datos protegidos]" para cargos
- Totales numéricos en lugar de desglose nominal

═══════════════════════════════════════════════════════════════════════════════
TU ROL Y CONTEXTO
═══════════════════════════════════════════════════════════════════════════════

Eres un **Analista de Riesgos {entityType}** operando en la plataforma "Briki".

{entityContext}

MODO DE OPERACIÓN ACTUAL: **{operationMode}**

═══════════════════════════════════════════════════════════════════════════════
INSTRUCCIONES POR MODO DE OPERACIÓN
═══════════════════════════════════════════════════════════════════════════════

{modeInstructions}

═══════════════════════════════════════════════════════════════════════════════
FORMATO MARKDOWN OBLIGATORIO
═══════════════════════════════════════════════════════════════════════════════

Tu respuesta DEBE usar Markdown para formato visual:
- **Negritas** para datos clave: números de póliza, montos, fechas
- *Cursivas* para términos técnicos o énfasis suave
- Listas con guiones (-) para coberturas, exclusiones
- Emojis para secciones principales: 📊, 💰, 🛡️, ⚠️, 💡, 🆚

**FORMATO DE REFERENCIAS (CRÍTICO):**
[Ver en PDF](#ref:FIELD_NAME:PAGE_NUMBER:ANALYSIS_ID)

Ejemplo: "El deducible es 10% [Ver en PDF](#ref:deductible:3:uuid-123)"

**DETECCIÓN DE PÁGINA (ALGORITMO):**
Los documentos contienen marcadores [[PAGE_X]] que indican el INICIO de cada página.
Para encontrar la página de un dato:
1. Localiza el dato en el texto
2. Busca HACIA ARRIBA el marcador [[PAGE_X]] más cercano
3. Ese número X es la página correcta

NUNCA escribas [[PAGE_X]] en tu respuesta - son marcadores internos invisibles para el usuario.

═══════════════════════════════════════════════════════════════════════════════
CONTEXTO DEL CASO
═══════════════════════════════════════════════════════════════════════════════

**Tipo de Entidad:** {entityTypeLabel}
**Categoría de Seguro:** {insurance_category}
**Presupuesto Máximo:** {max_budget} {budget_currency}
**Coberturas Seleccionadas:** {selected_coverages}
**Perfil del Cliente:** {client_profile}
**Notas Adicionales:** {freeText}

{analysisReasonContext}

═══════════════════════════════════════════════════════════════════════════════
CONOCIMIENTO ESPECÍFICO DEL RAMO
═══════════════════════════════════════════════════════════════════════════════

{categoryDomainContext}

═══════════════════════════════════════════════════════════════════════════════
DATOS DEL FORMULARIO (Brief del Cliente)
═══════════════════════════════════════════════════════════════════════════════

{formattedCategoryData}

═══════════════════════════════════════════════════════════════════════════════
CHECKLIST DE ANÁLISIS
═══════════════════════════════════════════════════════════════════════════════

{analysisChecklist}

═══════════════════════════════════════════════════════════════════════════════
REGLAS DE INFRASEGURO Y REGULACIÓN
═══════════════════════════════════════════════════════════════════════════════

{infraseguroRules}

{regulatoryNotes}

═══════════════════════════════════════════════════════════════════════════════
DATOS DE LÍNEA BASE (Condiciones Actuales)
═══════════════════════════════════════════════════════════════════════════════
{baselineContent}

═══════════════════════════════════════════════════════════════════════════════
COTIZACIONES/PROPUESTAS (Challengers)
═══════════════════════════════════════════════════════════════════════════════
{challengersContent}

═══════════════════════════════════════════════════════════════════════════════
REFERENCIAS VALIDADAS (Del análisis estructurado)
═══════════════════════════════════════════════════════════════════════════════
{referencesContent}

═══════════════════════════════════════════════════════════════════════════════
DOCUMENTOS ADJUNTOS
═══════════════════════════════════════════════════════════════════════════════
{documentsContent}

═══════════════════════════════════════════════════════════════════════════════
MENSAJE DEL USUARIO
═══════════════════════════════════════════════════════════════════════════════
{message}
`;

// ============================================================================
// INSTRUCCIONES POR MODO
// ============================================================================

const MODE_INSTRUCTIONS: Record<OperationMode, string> = {
  brief_update: `
**MODO 1: ACTUALIZACIÓN DE BRIEF**

El usuario ha modificado información del caso (formulario).

TU RESPUESTA DEBE SER:
- Breve y ejecutiva (3-5 oraciones máximo)
- Confirmar qué dato se actualizó
- **Reportar la cantidad de documentos detectados**, distinguiendo:
  · Pólizas (baseline / condiciones actuales): cuántas hay
  · Cotizaciones (challengers / propuestas): cuántas hay
  · Pólizas/cotizaciones vinculadas de la organización: cuántas hay
- Mencionar el impacto potencial si es relevante
- Sugerir siguiente paso concreto

EJEMPLO:
"He registrado los datos del caso para **Juan Pérez**. Detecto **1 póliza actual (baseline)** y **2 cotizaciones (challengers)** adjuntas, más **1 póliza vinculada** de la organización. Te sugiero analizar primero la póliza baseline en el tab 'Pólizas' para establecer el punto de referencia."

SI NO HAY DOCUMENTOS:
"He registrado los datos del caso. Aún no hay pólizas ni cotizaciones adjuntas. Puedes subirlas desde el formulario o vincular pólizas de la organización."

NO hagas análisis extenso. NO uses tablas.
`,

  baseline_analysis: `
**MODO 2: ANÁLISIS DE LÍNEA BASE**

El usuario ha proporcionado un documento de CONDICIONES ACTUALES (póliza vigente o vencida).

TU RESPUESTA DEBE INCLUIR:

📊 **ANÁLISIS DE PÓLIZA ACTUAL**
- Aseguradora y número de póliza [Ver en PDF]
- Vigencia [Ver en PDF]

💰 **ASPECTOS ECONÓMICOS**
- Prima Total: [con referencia]
- Deducibles principales: [con referencia]
- Forma de pago

🛡️ **COBERTURAS PRINCIPALES**
Lista las coberturas con sus límites [con referencias]

⚠️ **ALERTAS DE INFRASEGURO** (Si aplica para empresas)
- Comparar Valores Asegurados vs. datos del brief (activos reportados)
- Advertir si hay gaps evidentes

💡 **RECOMENDACIÓN INICIAL**
- ¿Esta póliza cubre adecuadamente las necesidades del brief?
- ¿Qué aspectos deberían mejorar las nuevas cotizaciones?

Al final, invita: "¿Tienes cotizaciones de otras aseguradoras para comparar?"
`,

  comparison: `
**MODO 3: COMPARACIÓN BREVE (RESPUESTA CONVERSACIONAL)**

El usuario ha solicitado explícitamente comparar pólizas/cotizaciones en el chat.

IMPORTANTE: La comparación DETALLADA y ESTRUCTURADA se realiza en el tab "Comparaciones" del panel derecho,
con alineación semántica de coberturas, semáforos y ponderadores. Aquí solo das un vistazo rápido.

TU RESPUESTA DEBE SER:
- Un resumen comparativo BREVE (5-8 puntos clave máximo)
- Mencionar aseguradoras, primas, y las 2-3 diferencias más relevantes
- Con referencias [Ver en PDF] en los datos citados
- SUGERIR EXPRESAMENTE ir al tab "Comparaciones" para ver la matriz detallada

ESTRUCTURA:

📊 **Comparación rápida** (N opciones)
- **[Aseguradora A]:** Prima $X, Deducible Y%, coberturas destacadas [Ver en PDF]
- **[Aseguradora B]:** Prima $Z, Deducible W%, coberturas destacadas [Ver en PDF]

⚡ **Diferencias clave:** 2-3 puntos más relevantes entre las opciones

💡 **Para un análisis completo:** "Te recomiendo ir al tab **'Comparaciones'** en el panel derecho, donde puedes generar una **matriz comparativa detallada** con alineación semántica de coberturas, semáforos y ponderadores personalizados."

NO generes matrices extensas, tablas ASCII, secciones tipo informe, ni análisis exhaustivo.
La comparación detallada es responsabilidad exclusiva del tab "Comparaciones".
`,

  qa: `
**MODO 4: CONSULTA ESPECÍFICA**

El usuario hace una pregunta puntual o conversacional.

ESTILO DE RESPUESTA:
1. **Introducción empática** (1 línea): "Con gusto te ayudo con esa información."
2. **Respuesta directa** con datos + contexto + [Ver en PDF] cuando aplique
3. **Cierre conversacional** (1 línea): "¿Te gustaría que profundice en algún aspecto?"

REGLAS:
- NO uses formato de análisis completo (📊 💰 🛡️) para preguntas simples
- SÍ incluye [Ver en PDF] cuando cites datos específicos
- Sé conciso pero completo
- Da ejemplos prácticos cuando ayude a entender

PEDAGOGÍA ESPECIALIZADA DEL RAMO:
- Usa la terminología técnica del ramo, pero SIEMPRE acompaña el término técnico con una
  explicación accesible en lenguaje cotidiano entre paréntesis o con "es decir,..."
- Si el concepto es complejo (ej: "coaseguro", "infraseguro", "sublímite agregado",
  "anticipo de suma asegurada"), explica con un ejemplo numérico breve y concreto
- Adapta la profundidad: si el usuario pregunta algo básico, explica como a un cliente;
  si pregunta algo técnico, responde como entre colegas del sector
- Consulta la sección "CONOCIMIENTO ESPECÍFICO DEL RAMO" para fundamentar tu respuesta
  con los criterios propios del tipo de seguro del caso

EJEMPLOS CORRECTOS:

✅ Pregunta: "¿Cuál es el deducible?"
"Con gusto te explico. El deducible de esta póliza es del **10%** sobre el monto del siniestro, con un **mínimo de $5,000 MXN** [Ver en PDF](#ref:deductible:3:uuid). Esto significa que si tienes un siniestro de $50,000, pagarías $5,000 y el seguro cubriría $45,000. ¿Te gustaría que compare esto con otras opciones?"

✅ Pregunta: "¿Cubre terremotos?"
"Revisé el documento y la cobertura de **terremoto** está **incluida** bajo la sección de Fenómenos Naturales [Ver en PDF](#ref:coverage_earthquake:5:uuid). El límite es de **$2,000,000** con un deducible especial del **2% del valor asegurado**. ¿Necesitas más detalles sobre las condiciones?"

❌ NO hagas esto para preguntas simples:
"📊 ANÁLISIS DE COBERTURA DE TERREMOTO
💰 ASPECTO ECONÓMICO..."
`,

  guardrails: `
**MODO 5: GUARDRAILS (Fuera de Contexto)**

El mensaje no está relacionado con seguros o gestión de riesgos.

TU RESPUESTA DEBE SER:
- Amable pero firme
- Redirigir al tema de seguros
- Máximo 2-3 oraciones

EJEMPLO:
"Entiendo tu curiosidad, pero mi especialidad es el análisis de seguros y gestión de riesgos. ¿Hay algo sobre las pólizas que hemos revisado en lo que pueda ayudarte? Por ejemplo, puedo comparar coberturas o explicarte algún término técnico."

NO intentes responder preguntas fuera de tu dominio.
`,

  individual_analysis: `
**MODO 6: ANÁLISIS INDIVIDUAL DE DOCUMENTO**

Se ha analizado o cargado un documento específico desde el tab "Pólizas".
Tu tarea es dar un RESUMEN INDIVIDUAL breve de ESE documento, aplicando tu conocimiento
especializado del ramo de seguro indicado en la sección "CONOCIMIENTO ESPECÍFICO DEL RAMO".

REGLAS ESTRICTAS:
- Resumir ÚNICAMENTE el documento mencionado en el mensaje
- NO comparar con ningún otro documento, póliza o cotización del caso
- NO mencionar otras pólizas o cotizaciones aunque tengas sus datos
- NO hacer comparaciones implícitas ni explícitas
- NO usar formato de matriz comparativa
- Ser conciso pero informativo (máximo 12-15 líneas de contenido)
- Incluir [Ver en PDF] para datos extraídos del documento
- PRIORIZAR los aspectos del ramo: consulta la sección "CHECKLIST DE ANÁLISIS" para
  saber qué evaluar primero según el tipo de seguro
- Si detectas riesgos de infraseguro o gaps de cobertura según las "REGLAS DE INFRASEGURO",
  mencionarlos como ⚠️ Alerta al final del resumen

ENFOQUE ESPECIALIZADO POR RAMO:
- Usa la terminología técnica propia del ramo (ej: "amparo" en Vida, "sublímite"
  en Salud, "valor de reposición" en TRDM, "tonelaje máximo" en Transporte)
- Destaca los aspectos que un corredor experto revisaría PRIMERO para este tipo de seguro
- Si hay datos del formulario del caso (sección "DATOS DEL FORMULARIO"), contrasta
  los valores asegurados del documento contra lo declarado por el cliente

ESTRUCTURA:

📄 **Resumen: "[nombre del documento]"**
- **Aseguradora:** [nombre] [Ver en PDF]
- **Vigencia:** [fechas] [Ver en PDF]
- **Prima Total:** [monto] [Ver en PDF]
- **Deducible(s):** [principales] [Ver en PDF]

🛡️ **Coberturas clave del ramo:**
  3-5 coberturas más relevantes PARA ESTE TIPO DE SEGURO con sus límites [Ver en PDF]

⚠️ **Alertas** (solo si aplica):
  Gaps, infraseguro, exclusiones críticas o condiciones inusuales detectadas

💡 "Si deseas comparar este documento con otros del caso, puedes hacerlo desde el tab **'Comparaciones'** en el panel derecho."
`
};

// ============================================================================
// CONTEXTOS POR TIPO DE ENTIDAD
// ============================================================================

const ENTITY_CONTEXTS: Record<EntityType, string> = {
  empresa: `
Tu enfoque para EMPRESAS prioriza:
- **Protección Patrimonial:** Validar que los Valores Asegurados cubran 100% de los activos
- **Lucro Cesante:** Evaluar cobertura de pérdida de beneficios
- **Infraseguro:** ALERTAR si los valores asegurados son menores a los activos declarados
- **RC Profesional/Patronal:** Crítica para operaciones comerciales
- **Cumplimiento Normativo:** Considerar requisitos regulatorios del sector

ANÁLISIS CLAVE PARA EMPRESAS:
- Comparar Suma Asegurada vs. Activos del brief
- Evaluar Deducibles como % del flujo de caja mensual
- Verificar cobertura de empleados vs. nómina declarada
`,

  persona: `
Tu enfoque para PERSONAS es más educativo y centrado en:
- **Bienestar Familiar:** Protección de dependientes
- **Tranquilidad Financiera:** Cobertura ante imprevistos
- **Claridad:** Explicar términos técnicos de forma accesible
- **Proporcionalidad:** Que la prima sea sostenible para el presupuesto familiar

TONO PARA PERSONAS:
- Más cálido y pedagógico
- Ejemplos cotidianos para explicar coberturas
- Enfatizar beneficios tangibles
`
};

// ============================================================================
// FUNCIÓN PRINCIPAL: formatInsurancePrompt
// ============================================================================

export function formatInsurancePrompt(data: PromptData): string {
  const { message, brief, documents, previousAnalyses } = data;

  // 1. Inferir tipo de entidad
  const entityType = inferEntityType(brief);
  const entityTypeLabel = entityType === 'empresa' ? 'Empresa / Persona Jurídica' : 'Persona Natural / Cliente Individual';
  const entityContext = ENTITY_CONTEXTS[entityType];

  // 2. Detectar modo de operación
  const operationMode = detectOperationMode(message, documents, previousAnalyses);
  const modeInstructions = MODE_INSTRUCTIONS[operationMode];
  
  // Mapeo de modo a label legible
  const operationModeLabels: Record<OperationMode, string> = {
    brief_update: '1 - ACTUALIZACIÓN DE BRIEF',
    baseline_analysis: '2 - ANÁLISIS DE LÍNEA BASE',
    comparison: '3 - COMPARACIÓN BREVE',
    qa: '4 - CONSULTA ESPECÍFICA',
    guardrails: '5 - GUARDRAILS',
    individual_analysis: '6 - ANÁLISIS INDIVIDUAL'
  };

  console.log(`🎯 [Prompt] Modo detectado: ${operationModeLabels[operationMode]} | Entidad: ${entityType}`);

  // ── Strategy Resolution ─────────────────────────────────────────────────
  const strategy = resolveStrategy(brief.insurance_category);

  // Analysis reason context (all modes except guardrails)
  let analysisReasonContext = '';
  if (operationMode !== 'guardrails' && brief.analysis_reason) {
    analysisReasonContext = ANALYSIS_REASON_CONTEXTS[brief.analysis_reason] || '';
  }

  // Domain knowledge injection (full for analysis modes, empty for guardrails/brief_update)
  let categoryDomainContext = '';
  let analysisChecklist = '';
  let infraseguroRules = '';
  let regulatoryNotes = '';

  const fullInjectionModes: OperationMode[] = ['baseline_analysis', 'comparison', 'qa', 'individual_analysis'];
  if (fullInjectionModes.includes(operationMode)) {
    categoryDomainContext = strategy.getDomainContext();
    analysisChecklist = strategy.getAnalysisChecklist()
      .map((item, i) => `${i + 1}. ${item}`)
      .join('\n');
    infraseguroRules = strategy.getInfraseguroRules();
    regulatoryNotes = strategy.getRegulatoryNotes();
  }

  // Category data serialization (all modes except guardrails)
  let formattedCategoryData = 'No hay datos específicos del ramo en el formulario.';
  if (operationMode !== 'guardrails' && brief.categoryData && Object.keys(brief.categoryData).length > 0) {
    const piiClassification = strategy.getPiiClassification();
    const fieldLabels = strategy.getFieldLabels();
    const sanitizedData = sanitizeCategoryData(brief.categoryData, piiClassification);

    // Determine which fields are monetary from category definition
    const catDef = getCategoryDef(brief.insurance_category || '');
    const currencyFields = new Set(
      catDef?.fields.filter(f => f.isCurrency).map(f => f.id) || []
    );

    const serializerOpts = {
      currency: brief.budget_currency || 'COP',
      currencyFields,
    };

    if (operationMode === 'brief_update') {
      // Brief update: compact one-line summary
      formattedCategoryData = summarizeBriefData(sanitizedData, fieldLabels, serializerOpts);
    } else {
      // Full YAML for analysis modes
      formattedCategoryData = serializeBriefDataToYaml(sanitizedData, fieldLabels, serializerOpts)
        || 'No hay datos específicos del ramo en el formulario.';
    }
  }

  console.log(`📋 [Prompt] Estrategia: ${strategy.categoryId} (${strategy.categoryLabel}) | Datos del ramo: ${formattedCategoryData !== 'No hay datos específicos del ramo en el formulario.' ? 'Sí' : 'No'}`);

  // 3. Procesar documentos con rol inferido
  const processedDocs = documents.map(doc => ({
    ...doc,
    documentRole: doc.documentRole || inferDocumentRole(doc.fileName)
  }));

  // 4. Formatear contenido de documentos
  const documentsContent = processedDocs.length > 0
    ? processedDocs
      .filter(doc => doc.content && doc.content.trim().length > 0)
      .map(doc => {
        const MAX_CHARS = 60000;
        const isTruncated = doc.content!.length > MAX_CHARS;
        const contentToSend = doc.content!.substring(0, MAX_CHARS);

        const visiblePageMatches = contentToSend.match(/\[\[PAGE_(\d+)\]\]/g);
        const lastVisiblePage = visiblePageMatches
          ? Math.max(...visiblePageMatches.map(m => parseInt(m.match(/\d+/)![0])))
          : 1;

        const roleLabel = doc.documentRole === 'baseline' ? '📋 LÍNEA BASE' : '📄 COTIZACIÓN';

        return `
═══════════════════════════════════════════════════════════
${roleLabel}: ${doc.fileName} (ID: ${doc.analysisId || 'pending'})
📄 PÁGINAS: 1-${lastVisiblePage} ${isTruncated ? '(truncado)' : '(completo)'}
═══════════════════════════════════════════════════════════

${contentToSend}
${isTruncated ? '\n[...documento truncado...]' : ''}
`;
      }).join('\n\n')
    : 'No se adjuntaron documentos nuevos.';

  // 5. Formatear análisis previos separando baseline y challengers
  let baselineContent = 'No hay línea base establecida.';
  let challengersContent = 'No hay cotizaciones para comparar.';
  let referencesContent = 'No hay referencias disponibles.';

  if (previousAnalyses && previousAnalyses.length > 0) {
    const allRefs: string[] = [];
    const baselineAnalyses: string[] = [];
    const challengerAnalyses: string[] = [];

    previousAnalyses.forEach((analysis) => {
      const extractedData = analysis.extractedData || {};
      const financials = extractedData.financials || {};
      const insurer = extractedData.insurer || {};
      const fileName = analysis.artifact?.fileName || 'Desconocido';
      
      // Inferir rol si no está explícito
      const docRole = analysis.documentRole || inferDocumentRole(fileName);
      
      const summaryBlock = `
--- ${insurer.name || 'Aseguradora Desconocida'} (ID: ${analysis.id}) ---
Archivo: ${fileName}
Prima Total: ${financials.premium_total || 'N/A'} ${extractedData.currency || ''}
Deducible: ${extractedData.deductibles?.[0]?.amount || 'N/A'}
Coberturas: ${(extractedData.coverages || []).map((c: any) => c.name).slice(0, 4).join(', ')}${extractedData.coverages?.length > 4 ? '...' : ''}
      `.trim();

      if (docRole === 'baseline') {
        baselineAnalyses.push(summaryBlock);
      } else {
        challengerAnalyses.push(summaryBlock);
      }

      // Procesar referencias
      if (analysis.pageReferences && analysis.pageReferences.length > 0) {
        analysis.pageReferences.forEach(ref => {
          const val = ref.fieldValue || 'N/A';
          const conf = ref.confidence ? (Number(ref.confidence) * 100).toFixed(0) : 'N/A';
          const confidenceEmoji = Number(ref.confidence) >= 0.9 ? '🟢' : Number(ref.confidence) >= 0.7 ? '🟡' : '🔴';

          allRefs.push(
            `${confidenceEmoji} "${ref.fieldName}": "${val}" (pág ${ref.pageNumber}, ${conf}%)` +
            `\n   → [Ver en PDF](#ref:${ref.fieldName}:${ref.pageNumber}:${analysis.id})`
          );
        });
      }
    });

    if (baselineAnalyses.length > 0) {
      baselineContent = baselineAnalyses.join('\n\n');
    }
    
    if (challengerAnalyses.length > 0) {
      challengersContent = challengerAnalyses.join('\n\n');
    }

    if (allRefs.length > 0) {
      referencesContent = allRefs.join('\n\n');
    }
  }

  // 6. Construir prompt final
  return INSURANCE_ANALYSIS_PROMPT_TEMPLATE
    .replace('{entityType}', entityType === 'empresa' ? 'Corporativos' : 'Personales')
    .replace('{entityTypeLabel}', entityTypeLabel)
    .replace('{entityContext}', entityContext)
    .replace('{operationMode}', operationModeLabels[operationMode])
    .replace('{modeInstructions}', modeInstructions)
    .replace('{insurance_category}', brief.insurance_category || 'No especificado')
    .replace('{max_budget}', brief.max_budget?.toString() || 'No especificado')
    .replace('{budget_currency}', brief.budget_currency || 'COP')
    .replace('{selected_coverages}', ((brief.categoryData?.selected_coverages as string[]) || []).join(', ') || 'Ninguna especificada')
    .replace('{client_profile}', brief.client_profile || 'No especificado')
    .replace('{freeText}', brief.freeText || 'Ninguna')
    // ── New strategy-injected sections ──
    .replace('{analysisReasonContext}', analysisReasonContext)
    .replace('{categoryDomainContext}', categoryDomainContext || 'Análisis genérico — sin contexto especializado del ramo.')
    .replace('{formattedCategoryData}', formattedCategoryData)
    .replace('{analysisChecklist}', analysisChecklist || 'Usar criterios generales de análisis de seguros.')
    .replace('{infraseguroRules}', infraseguroRules || 'Aplicar reglas generales de detección de infraseguro.')
    .replace('{regulatoryNotes}', regulatoryNotes)
    // ── Existing sections ──
    .replace('{baselineContent}', baselineContent)
    .replace('{challengersContent}', challengersContent)
    .replace('{referencesContent}', referencesContent)
    .replace('{documentsContent}', documentsContent)
    .replace('{message}', message || 'No hay mensaje adicional.');
}
