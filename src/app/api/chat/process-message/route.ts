import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { analyzeInsuranceDocuments, AnalysisRequest } from '@/lib/openai';
import { CaseBrief } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { user, currentOrg } = await getCurrentOrg(); // Asegura autenticación y org
    const { message, brief, caseId } = await request.json();
    
    if (!caseId) {
      return NextResponse.json({ error: 'Case ID is required' }, { status: 400 });
    }

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

    // 3. Guardar mensaje del usuario en la tabla messages
    try {
      await prisma.message.create({
        data: {
          caseId: caseId,
          role: 'user',
          content: message,
          metadata: { timestamp: new Date().toISOString() }
        }
      });
      console.log(`✅ API: Mensaje de usuario para caso ${caseId} guardado.`);
    } catch (dbError) {
      console.error(`❌ API: Error guardando mensaje de usuario para caso ${caseId}:`, dbError);
      // Continuar pero loguear el error
    }

    // 4. Llamar al servicio de OpenAI para obtener el análisis
    const analysisResult = await analyzeInsuranceDocuments(analysisRequest);

    console.log('✅ API: Análisis completado con OpenAI');

    // 5. Guardar respuesta del asistente en la tabla messages
    try {
      await prisma.message.create({
        data: {
          caseId: caseId,
          role: 'assistant',
          content: analysisResult,
          metadata: { timestamp: new Date().toISOString(), agent: 'sourcing' }
        }
      });
      console.log(`✅ API: Respuesta de agente para caso ${caseId} guardada.`);
    } catch (dbError) {
      console.error(`❌ API: Error guardando respuesta de agente para caso ${caseId}:`, dbError);
      // Fallar aquí podría ser problemático si OpenAI ya respondió. Loguear es crucial.
    }

    // 6. Devolver la respuesta generada por OpenAI
    return NextResponse.json({
      response: analysisResult,
      caseId: caseId
    });

  } catch (error: any) {
    console.error('ERROR [API/CHAT/PROCESS-MESSAGE]:', error);
    const errorMessage = error.message || 'Failed to process message';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}