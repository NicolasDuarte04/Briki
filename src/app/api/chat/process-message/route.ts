import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { analyzeInsuranceDocuments, AnalysisRequest } from '@/lib/openai';
import { CaseBrief } from '@/lib/types';
import { z } from 'zod';
import {
  logRequest,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-logger';

export const runtime = 'nodejs';

const ROUTE_NAME = '/api/chat/process-message';

// Zod schema for request validation
const ProcessMessageSchema = z.object({
  caseId: z.string().min(1, 'caseId is required'),
  message: z.string().optional().default(''),
  brief: z.object({
    businessType: z.string().optional(),
    employees: z.number().optional(),
    coverage: z.string().optional(),
    freeText: z.string().optional(),
    clientName: z.string().optional(),
    selectedClientId: z.string().nullable().optional(),
    insurance_category: z.string().optional(),
    max_budget: z.number().optional(),
    budget_currency: z.enum(['COP', 'USD', 'MXN', 'EUR']).optional(),
    required_coverages: z.array(z.string()).optional(),
    client_profile: z.string().optional(),
  }).optional().default({}),
});

export async function POST(request: NextRequest) {
  // Generate requestId and start timer
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Log request start
    logRequest({
      requestId,
      route: ROUTE_NAME,
      phase: 'start',
    });

    const { user, currentOrg } = await getCurrentOrg(); // Asegura autenticación y org
    
    // Parse and validate request body
    const body = await request.json();
    const parseResult = ProcessMessageSchema.safeParse(body);
    
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      const validationError = new Error(`Bad request: ${errors}`);
      (validationError as any).status = 400;
      throw validationError;
    }
    
    const { message, brief, caseId } = parseResult.data;

    console.log('🔄 API: Procesando mensaje:', message);
    console.log('📋 API: Brief recibido:', brief);
    console.log('📁 API: Case ID recibido:', caseId);
    
    // 1. Obtener los artefactos (documentos) del caso actual
        const artifacts = await prisma.artifact.findMany({
      where: { 
        caseId: caseId,
        case: {
          orgId: currentOrg.id // Seguridad: Filtra por orgId a través de la relación case
        }
      },
          select: { fileName: true, contentText: true }
        });

    console.log(`📁 ${artifacts.length} documentos disponibles para análisis`);

    // 2. Preparar la solicitud para el servicio OpenAI
    const analysisRequest: AnalysisRequest = {
      message: message || '',
      brief: brief || {}, // Pasar el brief recibido del frontend
      documents: artifacts.map(artifact => ({
        fileName: artifact.fileName || 'Unknown Document',
        content: artifact.contentText // Puede ser null si la extracción falló
      }))
    };

    // 3. Llamar al servicio de OpenAI para obtener el análisis
    const analysisResult = await analyzeInsuranceDocuments(analysisRequest);

    console.log('✅ API: Análisis completado con OpenAI');

    // 4. Devolver la respuesta generada por OpenAI
    return createSuccessResponse(
      requestId,
      {
        response: analysisResult,
        caseId: caseId,
      },
      ROUTE_NAME,
      startTime,
      user.id,
      currentOrg.id
    );

  } catch (error: any) {
    // Use structured error handler that:
    // - Extracts proper HTTP status from error (especially OpenAI SDK errors)
    // - Logs with requestId and timing
    // - Returns safe error message without leaking secrets
    return createErrorResponse(
      requestId,
      error,
      ROUTE_NAME,
      startTime,
      // Try to get user/org if available (might not be if auth failed)
      (error as any).user?.id,
      (error as any).currentOrg?.id
    );
  }
}