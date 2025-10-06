import { NextRequest, NextResponse } from 'next/server';
import { processChatMessage } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { message, userId } = await request.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('🔄 API: Procesando mensaje:', message);
    
    const result = await processChatMessage(message, userId);
    
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