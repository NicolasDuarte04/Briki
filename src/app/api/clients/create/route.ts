// /src/app/api/clients/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { createClient } from '@/lib/clientsDb';

export async function POST(request: NextRequest) {
  try {
    // getCurrentOrg maneja la autenticación y obtención de la organización actual
    const { currentOrg } = await getCurrentOrg();
    
    const body = await request.json();
    const { name, email, phone, address } = body;
    
    // Validaciones básicas
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      );
    }
    
    // Crear el cliente (los datos se cifrarán automáticamente)
    const clientId = await createClient(currentOrg.id, {
      name: name.trim(),
      email: email?.trim() || undefined,
      phone: phone?.trim() || undefined,
      address: address?.trim() || undefined,
    });
    
    return NextResponse.json({ id: clientId }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating client:', error);
    
    // Manejar error de clave de cifrado no configurada
    if (error instanceof Error && error.message.includes('APP_ENCRYPTION_KEY')) {
      return NextResponse.json(
        { error: 'Encryption key not configured. Please contact administrator.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
