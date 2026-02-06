// /src/app/api/clients/[id]/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { updateClient, getClientById } from '@/lib/clientsDb';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { orgId, name, email, phone, address, idType, idNumber, idCountry } = body;
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    // Verificar que el usuario pertenece a la organización
    const { data: membership } = await supabase
      .from('org_members')
      .select('*')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single();
    
    if (!membership) {
      return NextResponse.json(
        { error: 'User is not a member of this organization' },
        { status: 403 }
      );
    }
    
    // Obtener el id del parámetro de ruta (Next.js 15+ requiere await)
    const { id } = await params;
    
    // Verificar que el cliente existe y pertenece a la organización
    const existingClient = await getClientById(id, orgId);
    
    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }
    
    // Actualizar el cliente (los datos se cifrarán automáticamente)
    await updateClient(id, orgId, {
      name: name?.trim(),
      email: email?.trim() || undefined,
      phone: phone?.trim() || undefined,
      address: address?.trim() || undefined,
      // ✅ NUEVO: Campos de identificación
      idType: idType?.trim() || undefined,
      idNumber: idNumber?.trim() || undefined,
      idCountry: idCountry?.trim() || undefined,
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error updating client:', error);
    
    if (error instanceof Error && error.message.includes('APP_ENCRYPTION_KEY')) {
      return NextResponse.json(
        { error: 'Encryption key not configured' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
