// src/lib/openai.ts
import OpenAI from 'openai';
import { CaseBrief } from '@/lib/types';
import { formatInsurancePrompt } from '@/lib/prompts/insurance-analysis';

// Función para obtener el cliente OpenAI (inicialización lazy)
function getOpenAIClient(): OpenAI {
  // --- VALIDACIÓN ROBUSTA DE ENTORNO ---
  if (!process.env.OPENAI_API_KEY) {
    console.error('CRITICAL ERROR: OPENAI_API_KEY is not configured in the environment variables.');
    console.error('Please check your .env.local file and ensure OPENAI_API_KEY is set.');
    throw new Error('OpenAI service is not configured. Please check the server environment.');
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Interfaz para la solicitud de análisis, reutilizando CaseBrief
export interface AnalysisRequest {
  message: string;
  brief: Partial<CaseBrief>;
  documents: Array<{ fileName: string; content: string | null }>; // Permitir content null
  previousAnalyses?: any[]; // ✅ FASE 6B: Contexto de análisis previos para comparación
}

export async function analyzeInsuranceDocuments(request: AnalysisRequest): Promise<string> {
  // Obtener el cliente OpenAI (inicialización lazy)
  const openai = getOpenAIClient();

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '4000', 10);
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

    // Manejo específico de errores de OpenAI
    if (error.code === 'insufficient_quota') {
      throw new Error('Cuota de OpenAI agotada. Por favor, verifica tu plan de facturación.');
    } else if (error.code === 'invalid_api_key') {
      throw new Error('Clave de API de OpenAI inválida. Por favor, verifica la configuración.');
    } else if (error.code === 'rate_limit_exceeded') {
      throw new Error('Límite de velocidad excedido. Por favor, intenta de nuevo en unos momentos.');
    }

    throw new Error('El servicio de análisis no está disponible en este momento.');
  }
}
