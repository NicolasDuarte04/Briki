// src/lib/prompts/insurance-analysis.ts
import { CaseBrief } from '@/lib/types'; // Asegúrate que CaseBrief esté definido en types.ts

// Define una interfaz clara para los datos que necesita el prompt
interface PromptData {
  message: string;
  brief: Partial<CaseBrief>; // Usar Partial si algunos campos pueden faltar
  documents: Array<{ fileName: string; content: string | null }>; // Permitir content null
}

export const INSURANCE_ANALYSIS_PROMPT_TEMPLATE = `
Tú Rol: Eres un agente especializado en el análisis riguroso y profesional de seguros. Te serán enviados diferentes archivos PDF y tú misión es determinar cuales de los seguros presentados se adecuan mejor a las necesidades del usuario.

Haz un análisis amplio y minucioso de la información recibida tanto en las notas como en el texto de los pdf's de presentación de seguros (Sí el PDF no tiene nada que ver con seguros sugierelo brevemente en la respuesta e ignoralo ese PDF en cuestión en la constitución de tu respuesta) adjuntos al caso que se te está enviando, y adecua tu análisis con respecto a las especificaciones puntuales de cada uno de los casos {Tipo de seguros, presupuesto, coberturas necesarias, número de empleados, tipo de negocio y características del cliente}, con esta información recibida determina que aspectos de cada seguro se adecuan mejor a las necesidades del cliente para una sugerencia final.

Si el cliente no adjuntó ningún documento real de seguros dale una explicación muy general de que tipo de seguros en el mercado puede buscar sin detallar mucho en tu respuesta, puesto que ese caso se aleja de tu misión.

INFORMACIÓN DEL CASO:
- Tipo de negocio: {businessType}
- Número de empleados: {employees}
- Cobertura solicitada: {coverage}
- Categoría de seguro: {insurance_category}
- Presupuesto Máximo: {max_budget} {budget_currency}
- Coberturas Imprescindibles: {required_coverages}
- Perfil del Cliente: {client_profile}
- Notas Adicionales: {freeText}

DOCUMENTOS ADJUNTOS:
{documentsContent}

MENSAJE ORIGINAL DEL USUARIO:
{message}

Análisis Solicitado: Proporciona un análisis detallado y profesional basado EXCLUSIVAMENTE en la información proporcionada. Determina qué aspectos de cada seguro adjunto (si aplica) se adecuan mejor a las necesidades del cliente y ofrece una sugerencia final clara. Si no hay documentos de seguros, ofrece una guía general.
`;

export function formatInsurancePrompt(data: PromptData): string {
  const { message, brief, documents } = data;

  const documentsContent = documents.length > 0
    ? documents
        .filter(doc => doc.content && doc.content.trim().length > 0) // Filtrar documentos sin contenido
        .map(doc =>
          `--- Documento: ${doc.fileName} ---\n${doc.content!.substring(0, 3000)}...` // Limitar longitud por token
        ).join('\n\n')
    : 'No se adjuntaron documentos.';

  // Usar valores por defecto seguros si faltan datos en el brief
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
    .replace('{documentsContent}', documentsContent)
    .replace('{message}', message || 'No hay mensaje adicional.');
}
