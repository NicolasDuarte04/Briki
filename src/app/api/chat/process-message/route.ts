import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { message, brief, caseId } = await request.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('🔄 API: Procesando mensaje:', message);
    console.log('📋 API: Brief recibido:', brief);
    console.log('📁 API: Case ID recibido:', caseId);
    
    // Construir lista de documentos (sin mostrar todo el texto)
    let documentsInfo = "";
    
    if (caseId) {
      try {
        const artifacts = await prisma.artifact.findMany({
          where: { caseId: caseId },
          select: { fileName: true, contentText: true }
        });

        if (artifacts.length > 0) {
          const filesList = artifacts
            .map(a => `📄 ${a.fileName}`)
            .join('\n');
          
          documentsInfo = `\n\nDocumentos cargados:\n${filesList}`;
          
          console.log(`📁 ${artifacts.length} documentos disponibles para análisis`);
          // El contentText está disponible aquí para el LLM
          // artifacts.forEach(a => console.log(`Texto disponible: ${a.contentText?.length || 0} caracteres`));
        }
      } catch (error) {
        console.error("Error al obtener artifacts del caso:", caseId, error);
      }
    }
    
    // Lógica del agente (Placeholder - Aquí se conectaría el LLM)
    // El LLM recibiría artifacts[].contentText para análisis interno
    // Pero la respuesta mostrada al usuario es limpia
    const agentResponse = `${message}${documentsInfo}\n\nEstoy analizando esta información para proporcionarte una respuesta detallada sobre tus seguros.`;
    
    console.log('✅ API: Mensaje procesado con contexto');
    
    return NextResponse.json({
      response: agentResponse,
      caseId: caseId // Devolver el caseId para mantener el estado
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}