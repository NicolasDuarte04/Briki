import { NextRequest, NextResponse } from 'next/server';
import { processChatMessage } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { message, userId, conversationId, brief } = await request.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('🔄 API: Procesando mensaje:', message);
    console.log('💬 API: ConversationId:', conversationId);
    console.log('📋 API: Brief recibido:', brief);
    
    // Note: conversationId is passed but not yet used for persistence
    // This allows future persistence integration without breaking changes
    const result = await processChatMessage(message, userId, brief);
    
    console.log('✅ API: Mensaje procesado exitosamente');
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}