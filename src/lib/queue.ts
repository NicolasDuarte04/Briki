/**
 * @fileoverview Servicio de cola de trabajos con QStash
 * 
 * QStash es un servicio de mensajería serverless de Upstash que permite
 * ejecutar trabajos en background sin preocuparse por timeouts de Vercel.
 * 
 * Flujo:
 * 1. UI llama a /api/jobs/analyze → Crea CaseActivity + publica en QStash
 * 2. QStash llama a /api/webhooks/analyze → Procesa el análisis
 * 3. UI hace polling a /api/jobs/[id]/status → Ve el progreso
 * 
 * @see https://upstash.com/docs/qstash
 */

import { Client } from '@upstash/qstash';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════

const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const QSTASH_CURRENT_SIGNING_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY;
const QSTASH_NEXT_SIGNING_KEY = process.env.QSTASH_NEXT_SIGNING_KEY;

// URL base de la aplicación (para webhooks)
// ✅ FIX: Corregir precedencia de operadores - priorizar NEXT_PUBLIC_APP_URL
function getAppUrl(): string {
  // 1. Prioridad: Variable explícita de la app
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // 2. Fallback: URL de Vercel (para previews)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // 3. Default: Localhost para desarrollo
  return 'http://localhost:3000';
}

const APP_URL = getAppUrl();

// Log para debug (solo en servidor, no expone secrets)
console.log('[QStash] APP_URL configurada:', APP_URL);

// ═══════════════════════════════════════════════════════════════════════════
// CLIENTE QSTASH
// ═══════════════════════════════════════════════════════════════════════════

let qstashClient: Client | null = null;

/**
 * Obtiene el cliente QStash (singleton)
 */
export function getQStashClient(): Client | null {
  if (!QSTASH_TOKEN) {
    console.warn('[QStash] QSTASH_TOKEN no configurado - jobs en background deshabilitados');
    return null;
  }
  
  if (!qstashClient) {
    qstashClient = new Client({ token: QSTASH_TOKEN });
  }
  
  return qstashClient;
}

/**
 * Verifica si QStash está disponible
 */
export function isQStashAvailable(): boolean {
  return !!QSTASH_TOKEN;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface AnalyzeJobPayload {
  jobId: string;         // ID del CaseActivity
  caseId: string;        // ID del caso
  artifactId: string;    // ID de la póliza a analizar
  userId: string;        // Usuario que inició
  fileId: string;        // fileId en storage
  fileName: string;      // Nombre del archivo
  contentType: string;   // Tipo MIME
}

export interface JobResult {
  success: boolean;
  analysisId?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE COLA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Encola un trabajo de análisis de póliza
 * 
 * @param payload - Datos del trabajo
 * @returns ID del mensaje en QStash o null si no está disponible
 */
export async function enqueueAnalyzeJob(payload: AnalyzeJobPayload): Promise<string | null> {
  const client = getQStashClient();
  
  if (!client) {
    console.warn('[QStash] Cliente no disponible, el análisis se ejecutará síncronamente');
    return null;
  }
  
  const webhookUrl = `${APP_URL}/api/webhooks/analyze`;
  
  console.log('[QStash] Encolando trabajo de análisis:', {
    jobId: payload.jobId,
    artifactId: payload.artifactId,
    webhookUrl,
  });
  
  try {
    const response = await client.publishJSON({
      url: webhookUrl,
      body: payload,
      // Configuración de reintentos
      retries: 2,
      // Callback cuando termine (opcional, para notificaciones)
      // callback: `${APP_URL}/api/webhooks/job-complete`,
    });
    
    console.log('[QStash] Trabajo encolado:', response.messageId);
    return response.messageId;
    
  } catch (error) {
    console.error('[QStash] Error al encolar trabajo:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICACIÓN DE FIRMA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifica que una request viene de QStash (autenticación)
 * 
 * QStash firma todas las requests con HMAC-SHA256.
 * Debemos verificar la firma para evitar llamadas no autorizadas.
 * 
 * @param signature - Header 'upstash-signature'
 * @param body - Body de la request (string)
 * @returns true si la firma es válida
 */
export async function verifyQStashSignature(
  signature: string | null,
  body: string
): Promise<boolean> {
  // En desarrollo, permitir sin firma
  if (process.env.NODE_ENV === 'development' && !QSTASH_CURRENT_SIGNING_KEY) {
    console.warn('[QStash] Verificación de firma omitida en desarrollo');
    return true;
  }
  
  if (!signature) {
    console.error('[QStash] Falta header upstash-signature');
    return false;
  }
  
  if (!QSTASH_CURRENT_SIGNING_KEY) {
    console.error('[QStash] QSTASH_CURRENT_SIGNING_KEY no configurada');
    return false;
  }
  
  try {
    // QStash usa el Receiver para verificar
    const { Receiver } = await import('@upstash/qstash');
    
    const receiver = new Receiver({
      currentSigningKey: QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: QSTASH_NEXT_SIGNING_KEY || QSTASH_CURRENT_SIGNING_KEY,
    });
    
    const isValid = await receiver.verify({
      signature,
      body,
    });
    
    return isValid;
    
  } catch (error) {
    console.error('[QStash] Error verificando firma:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const queue = {
  isAvailable: isQStashAvailable,
  enqueueAnalyzeJob,
  verifySignature: verifyQStashSignature,
};

export default queue;
