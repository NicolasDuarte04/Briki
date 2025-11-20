import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { encryptMessageContent, decryptMessages } from '@/lib/helpers/messageEncryption';

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
    const messagesRaw = await prisma.message.findMany({
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
        content: true, // Buffer encriptado (BYTEA)
        createdAt: true,
        metadata: true // Opcional, si la UI lo necesita
      }
    });

    // 3. Desencriptar todos los mensajes
    const messages = await decryptMessages(messagesRaw);

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

    // 1. Encriptar el contenido del mensaje antes de guardarlo
    const encryptedContent = await encryptMessageContent(content);

    // 2. Verificar si existe mensaje duplicado (últimos 5 segundos)
    // NOTA: La verificación de duplicados ahora compara contenido encriptado
    // Esto es menos eficiente pero necesario para mantener la funcionalidad
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const existingMessages = await prisma.message.findMany({
      where: {
        caseId: caseId,
        role: role,
        createdAt: {
          gte: fiveSecondsAgo // Últimos 5 segundos
        }
      },
      orderBy: {
        createdAt: 'desc' // El más reciente primero
      },
      select: {
        id: true,
        content: true, // Para comparar contenido encriptado
        role: true,
        createdAt: true,
        metadata: true
      }
    });

    // Desencriptar mensajes existentes para comparar contenido
    const decryptedExisting = await decryptMessages(existingMessages);
    const existingMessage = decryptedExisting.find((msg, idx) => msg.content === content);

    // Si existe mensaje duplicado, retornar el existente en lugar de crear uno nuevo
    if (existingMessage) {
      const originalIndex = decryptedExisting.findIndex(msg => msg.content === content);
      const originalMessage = existingMessages[originalIndex];
      console.log(`⚠️ [API/CASES/${caseId}/MESSAGES] POST: Mensaje duplicado detectado, retornando existente (ID: ${originalMessage?.id})`);
      return NextResponse.json({ 
        success: true, 
        message: existingMessage, // Retornar desencriptado para consistencia
        duplicate: true // Indicador de que es un duplicado
      });
    }

    // 3. Crear mensaje solo si no existe duplicado
    const newMessageRaw = await prisma.message.create({
      data: {
        caseId: caseId,
        role: role,
        content: Buffer.from(encryptedContent), // ✅ Contenido encriptado (Buffer)
        metadata: metadata || {}
      },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
        metadata: true
      }
    });

    // 4. Desencriptar el mensaje creado para retornarlo
    const decryptedNewMessage = await decryptMessages([newMessageRaw]);
    const newMessage = {
      ...decryptedNewMessage[0]!,
      id: newMessageRaw.id,
      createdAt: newMessageRaw.createdAt,
      metadata: newMessageRaw.metadata
    };

    console.log(`✅ [API/CASES/${caseId}/MESSAGES] POST: Mensaje creado exitosamente (ID: ${newMessage.id})`);
    return NextResponse.json({ success: true, message: newMessage, duplicate: false });
  } catch (error: any) {
    console.error(`❌ [API/CASES/${caseId || 'unknown'}/MESSAGES] POST:`, error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}
