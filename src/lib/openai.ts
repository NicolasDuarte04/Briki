// src/lib/openai.ts
import OpenAI from 'openai';
import { CaseBrief } from '@/lib/types';
import { formatInsurancePrompt } from '@/lib/prompts/insurance-analysis';
import { serverEnv } from '@/lib/env';

// Función para obtener el cliente OpenAI (inicialización lazy)
function getOpenAIClient(): OpenAI {
  // Environment validation is handled by env.ts on module load
  // No need for additional checks here
  return new OpenAI({
    apiKey: serverEnv.OPENAI_API_KEY,
  });
}

// Interfaz para la solicitud de análisis, reutilizando CaseBrief
export interface AnalysisRequest {
  message: string;
  brief: Partial<CaseBrief>;
  documents: Array<{ fileName: string; content: string | null }>; // Permitir content null
}

export async function analyzeInsuranceDocuments(request: AnalysisRequest): Promise<string> {
  // Obtener el cliente OpenAI (inicialización lazy)
  const openai = getOpenAIClient();

  const model = serverEnv.OPENAI_MODEL;
  const maxTokens = serverEnv.OPENAI_MAX_TOKENS;
  const formattedPrompt = formatInsurancePrompt(request);

  console.log('🤖 OpenAI: Iniciando análisis con modelo:', model);
  console.log('📝 OpenAI: Prompt length:', formattedPrompt.length);

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'user', content: formattedPrompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.5, // Ajustar para respuestas más consistentes
    });

    const result = response.choices[0]?.message?.content || 'No se pudo generar un análisis. Intenta de nuevo.';
    console.log('✅ OpenAI: Análisis completado, longitud de respuesta:', result.length);
    
    return result;

  } catch (error: any) {
    console.error('ERROR [OpenAI Service]: API call failed -', error);
    
    // Preserve the original error for proper status code propagation
    // OpenAI SDK errors already have status and code properties
    if (error.status || error.code) {
      // Re-throw with original error properties intact
      throw error;
    }
    
    // For unknown errors, wrap them appropriately
    const wrappedError: any = new Error('El servicio de análisis no está disponible en este momento.');
    wrappedError.status = 503; // Service Unavailable
    wrappedError.code = 'service_unavailable';
    throw wrappedError;
  }
}
