import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let caseId: string | undefined;
  try {
    const { user, currentOrg } = await getCurrentOrg();
    const { id } = await params;
    caseId = id;

    if (!caseId) {
      return NextResponse.json({ error: 'Case ID is required' }, { status: 400 });
    }

    // 1. Verificar que el caso existe Y pertenece a la organización del usuario
    const caseExists = await prisma.case.findFirst({
      where: {
        id: caseId,
        orgId: currentOrg.id // RLS check
      },
      select: { id: true } // Solo necesitamos saber si existe
    });

    if (!caseExists) {
      console.warn(`[API/CASES/${caseId}/MESSAGES] GET: Case not found or access denied for org ${currentOrg.id}`);
      return NextResponse.json({ error: 'Case not found or access denied' }, { status: 404 });
    }

    // 2. Obtener mensajes ordenados por fecha de creación
    const messages = await prisma.message.findMany({
      where: {
        caseId: caseId
      },
      orderBy: {
        createdAt: 'asc' // Orden cronológico
      },
      // Seleccionar solo los campos necesarios para la UI
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
        metadata: true // Opcional, si la UI lo necesita
      }
    });

    console.log(`✅ API: Cargados ${messages.length} mensajes para caso ${caseId}`);
    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error(`❌ [API/CASES/${caseId || 'unknown'}/MESSAGES] GET:`, error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let caseId: string | undefined;
  try {
    const { user, currentOrg } = await getCurrentOrg();
    const { id } = await params;
    caseId = id;

    if (!caseId) {
      return NextResponse.json({ error: 'Case ID is required' }, { status: 400 });
    }

    // Verificar que el caso pertenece a la organización del usuario
    const caseExists = await prisma.case.findFirst({
      where: {
        id: caseId,
        orgId: currentOrg.id
      }
    });

    if (!caseExists) {
      return NextResponse.json({ error: 'Case not found or access denied' }, { status: 404 });
    }

    const { role, content, metadata } = await request.json();

    if (!role || !content) {
      return NextResponse.json({ error: 'Role and content are required' }, { status: 400 });
    }

    // Crear mensaje
    const newMessage = await prisma.message.create({
      data: {
        caseId: caseId,
        role: role,
        content: content,
        metadata: metadata || {}
      }
    });

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error: any) {
    console.error(`❌ [API/CASES/${caseId || 'unknown'}/MESSAGES] POST:`, error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}
