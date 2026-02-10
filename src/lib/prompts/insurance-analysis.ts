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
 * @version 2.0 - Refactorización Matriz Comparativa Profesional
 * @date Febrero 2026
 */

import { CaseBrief } from '@/lib/types';

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
type OperationMode = 'brief_update' | 'baseline_analysis' | 'comparison' | 'qa' | 'guardrails';

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
    (brief.employees && brief.employees > 1) ||
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
**Tipo de Negocio:** {businessType}
**Empleados:** {employees}
**Categoría de Seguro:** {insurance_category}
**Presupuesto Máximo:** {max_budget} {budget_currency}
**Coberturas Imprescindibles:** {required_coverages}
**Perfil del Cliente:** {client_profile}
**Notas Adicionales:** {freeText}

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
- Breve y ejecutiva (2-4 oraciones máximo)
- Confirmar qué dato se actualizó
- Mencionar el impacto potencial si es relevante
- Sugerir siguiente paso concreto

EJEMPLO:
"He registrado el cambio en la nómina anual a **$X**. Esto impacta el cálculo de prima estimada para RC Empleadores. Te sugiero revisar las cotizaciones en el tab 'Pólizas' para re-validar."

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
**MODO 3: ANÁLISIS COMPARATIVO (CHALLENGER vs BASELINE)**

El usuario quiere comparar propuestas contra la línea base.

TU RESPUESTA DEBE INCLUIR:

📊 **RESUMEN EJECUTIVO**
Indica cuántas opciones se comparan y de qué aseguradoras.

🆚 **MATRIZ COMPARATIVA**

Presenta los datos en formato lista estructurada (NO tablas ASCII):

**1. Aspecto Económico:**
- Póliza Actual: Prima $X [Ver en PDF](#ref:premium:P:ID)
- Propuesta A: Prima $Y [Ver en PDF](#ref:premium:P:ID) → Δ +/-Z%
- Propuesta B: Prima $W [Ver en PDF](#ref:premium:P:ID) → Δ +/-V%

**2. Deducibles (SEMÁFORO):**
- Póliza Actual: 5% 🟢
- Propuesta A: 10% 🔴 (DESVENTAJA: +5 puntos)
- Propuesta B: 5% 🟢 (Igual)

**3. Coberturas Clave:**
- RC General:
  · Actual: $500K [ref]
  · Propuesta A: $750K ✅ [ref] (Ventaja +50%)
  · Propuesta B: $400K ⚠️ [ref] (Inferior -20%)

⚠️ **GAPS Y ADVERTENCIAS**
- Lista diferencias críticas en exclusiones
- Alertar sobre coberturas faltantes vs. requerimientos del brief

📊 **MATRIZ DE DECISIÓN (RESUMEN FINAL)**

Para cada opción presenta:
- **[Aseguradora]:** Prima $X | Deducible Y% | Veredicto: [Recomendada/Con reservas/No recomendada]

💡 **RECOMENDACIÓN FUNDAMENTADA**
Indica cuál propuesta se ajusta mejor al perfil del cliente y POR QUÉ.
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
    comparison: '3 - ANÁLISIS COMPARATIVO',
    qa: '4 - CONSULTA ESPECÍFICA',
    guardrails: '5 - GUARDRAILS'
  };

  console.log(`🎯 [Prompt] Modo detectado: ${operationModeLabels[operationMode]} | Entidad: ${entityType}`);

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
    .replace('{businessType}', brief.businessType || 'No especificado')
    .replace('{employees}', brief.employees?.toString() || 'No especificado')
    .replace('{insurance_category}', brief.insurance_category || 'No especificado')
    .replace('{max_budget}', brief.max_budget?.toString() || 'No especificado')
    .replace('{budget_currency}', brief.budget_currency || 'COP')
    .replace('{required_coverages}', (brief.required_coverages || []).join(', ') || 'Ninguna especificada')
    .replace('{client_profile}', brief.client_profile || 'No especificado')
    .replace('{freeText}', brief.freeText || 'Ninguna')
    .replace('{baselineContent}', baselineContent)
    .replace('{challengersContent}', challengersContent)
    .replace('{referencesContent}', referencesContent)
    .replace('{documentsContent}', documentsContent)
    .replace('{message}', message || 'No hay mensaje adicional.');
}
