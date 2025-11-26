// src/lib/prompts/insurance-analysis.ts
import { CaseBrief } from '@/lib/types'; // Asegúrate que CaseBrief esté definido en types.ts

// Define una interfaz clara para los datos que necesita el prompt
interface PromptData {
  message: string;
  brief: Partial<CaseBrief>;
  documents: Array<{ fileName: string; content: string | null; analysisId?: string }>; // ✅ FASE 9: ID opcional
  previousAnalyses?: Array<{
    id: string; // ✅ FASE 9: ID requerido
    extractedData: any;
    pageReferences?: Array<{ fieldName: string; pageNumber: number }>;
  }>;
}

export const INSURANCE_ANALYSIS_PROMPT_TEMPLATE = `
TÚ ROL: Eres un consultor de seguros experto y pedagógico. Tu misión es ayudar a los clientes a entender y elegir el seguro que mejor se adapte a sus necesidades. Eres amigable, claro y profesional, pero siempre riguroso en tu análisis.

CONTEXTO DEL SISTEMA:
Estás operando dentro de una plataforma llamada "Briki".
- El usuario está analizando pólizas de seguros para un caso específico.
- Es posible que ya existan otras pólizas analizadas previamente.
- Tu objetivo es analizar la póliza actual Y compararla con las anteriores si existen, destacando cuál se ajusta mejor al perfil del cliente.

INSTRUCCIONES DE ANÁLISIS Y COMPARACIÓN:

1. ANÁLISIS DE LA PÓLIZA ACTUAL:
   - Identifica la póliza que se está analizando ahora (basada en el documento adjunto o el mensaje del usuario).
   - Analiza: Coberturas Principales, Aspecto Económico (Primas/Deducibles), Adecuación al Cliente y Limitaciones/Exclusiones.

2. COMPARACIÓN (CRÍTICO SI HAY PÓLIZAS PREVIAS):
   - Si se te proporciona "CONTEXTO DE PÓLIZAS ANTERIORES", DEBES comparar la póliza actual con ellas.
   - Crea una breve sección de "🆚 COMPARATIVA" donde contrastes:
     * Diferencias de precio (Prima Total).
     * Diferencias en coberturas clave.
     * Ventajas/Desventajas relativas.
   - Concluye recomendando cuál parece mejor opción para el perfil del cliente (Responde de manera integral y organizada sin intentar implemntar tablas o esquemas con caracteres simples puesto que son muy propenso a romper el aspecto visual).

3. REFERENCIAS A DOCUMENTOS (IMPORTANTE):
   - Cuando menciones datos específicos (primas, deducibles, coberturas), indica la página.
   - **DETECCIÓN DE PÁGINA**: El texto de los documentos contiene marcadores explícitos como \`[[PAGE_1]]\`, \`[[PAGE_2]]\`. Usa el marcador MÁS CERCANO HACIA ARRIBA del dato encontrado para determinar la página.
   - **FORMATO INTERACTIVO**: DEBES usar el siguiente formato para crear enlaces clicables:
     Format: [Ver en PDF](#ref:FIELD_NAME:PAGE_NUMBER:ANALYSIS_ID)
     
     Donde:
     - FIELD_NAME: Nombre corto del campo (ej. 'deductible', 'premium').
     - PAGE_NUMBER: Número de página detectado (ej. 5).
     - ANALYSIS_ID: ID del análisis asociado (ver "DOCUMENTOS ADJUNTOS" o "REFERENCIAS DISPONIBLES"). Si no tienes ID, usa 'current'.

     Ejemplo: "El deducible es del 10% [Ver en PDF](#ref:deductibles:5:uuid-1234)"

4. FORMATO DE RESPUESTA:
   - Usa emojis para organizar.
   - Sé conciso.
   - Si es la primera póliza, invita a analizar las demás.

INFORMACIÓN DEL CASO:
- Tipo de negocio: {businessType}
- Número de empleados: {employees}
- Cobertura solicitada: {coverage}
- Categoría de seguro: {insurance_category}
- Presupuesto Máximo: {max_budget} {budget_currency}
- Coberturas Imprescindibles: {required_coverages}
- Perfil del Cliente: {client_profile}
- Notas Adicionales: {freeText}

CONTEXTO DE PÓLIZAS ANTERIORES (Para Comparación):
{previousAnalysesContent}

REFERENCIAS DISPONIBLES (Usa estas para crear enlaces [Ver en PDF]):
{referencesContent}

DOCUMENTOS ADJUNTOS (Póliza Actual):
{documentsContent}

MENSAJE DEL USUARIO:
{message}

ESTRUCTURA SUGERIDA:

📊 ANÁLISIS DE [Nombre Póliza Actual]
[Resumen clave con referencias]

🆚 COMPARATIVA (Solo si hay anteriores)
[Tabla o lista comparativa breve]

💡 RECOMENDACIÓN
[Cuál se ajusta mejor y por qué]

⚠️ PUNTOS A CONSIDERAR
[Advertencias o exclusiones]
`;

export function formatInsurancePrompt(data: PromptData): string {
  const { message, brief, documents, previousAnalyses } = data;

  const documentsContent = documents.length > 0
    ? documents
      .filter(doc => doc.content && doc.content.trim().length > 0)
      .map(doc =>
        `--- Documento Actual: ${doc.fileName} (ID Análisis: ${doc.analysisId || 'No disponible'}) ---\n${doc.content!.substring(0, 3000)}...`
      ).join('\n\n')
    : 'No se adjuntaron documentos nuevos.';

  // ✅ FASE 6B: Formatear análisis previos para el contexto
  let previousAnalysesContent = 'No hay análisis previos.';
  let referencesContent = 'No hay referencias disponibles.';

  if (previousAnalyses && previousAnalyses.length > 0) {
    // Formatear contenido de análisis
    previousAnalysesContent = previousAnalyses.map((analysis, index) => {
      const data = analysis.extractedData || {};
      const financials = data.financials || {};
      const insurer = data.insurer || {};
      return `
--- Póliza Previa #${index + 1}: ${insurer.name || 'Desconocida'} (ID: ${analysis.id}) ---
Prima Total: ${financials.premium_total || 'N/A'} ${data.currency || ''}
Deducible: ${data.deductibles?.[0]?.amount || 'N/A'}
Coberturas: ${(data.coverages || []).map((c: any) => c.name).slice(0, 3).join(', ')}...
      `.trim();
    }).join('\n\n');

    // Formatear referencias disponibles
    const allRefs: string[] = [];
    previousAnalyses.forEach((analysis) => {
      if (analysis.pageReferences && analysis.pageReferences.length > 0) {
        analysis.pageReferences.forEach(ref => {
          allRefs.push(`- Campo: "${ref.fieldName}" -> Página: ${ref.pageNumber} (Usa: #ref:${ref.fieldName}:${ref.pageNumber}:${analysis.id})`);
        });
      }
    });

    if (allRefs.length > 0) {
      referencesContent = allRefs.join('\n');
    }
  }

  return INSURANCE_ANALYSIS_PROMPT_TEMPLATE
    .replace('{businessType}', brief.businessType || 'No especificado')
    .replace('{employees}', brief.employees?.toString() || 'No especificado')
    .replace('{coverage}', brief.coverage || 'No especificado')
    .replace('{insurance_category}', brief.insurance_category || 'No especificado')
    .replace('{max_budget}', brief.max_budget?.toString() || 'No especificado')
    .replace('{budget_currency}', brief.budget_currency || 'COP')
    .replace('{required_coverages}', (brief.required_coverages || []).join(', ') || 'Ninguna especificada')
    .replace('{client_profile}', brief.client_profile || 'No especificado')
    .replace('{freeText}', brief.freeText || 'Ninguna')
    .replace('{previousAnalysesContent}', previousAnalysesContent)
    .replace('{referencesContent}', referencesContent)
    .replace('{documentsContent}', documentsContent)
    .replace('{message}', message || 'No hay mensaje adicional.');
}
