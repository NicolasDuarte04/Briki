// /src/app/api/clients/[id]/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { deleteClient } from '@/lib/clientsDb';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const { orgId } = body;
    
    // Si orgId es 'current', obtener la organización del usuario
    let currentOrgId = orgId;
    if (orgId === 'current') {
      // Obtener la organización actual del usuario
      const { data: membership } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .single();
      
      if (!membership) {
        return NextResponse.json(
          { error: 'User is not a member of any organization' },
          { status: 403 }
        );
      }
      
      currentOrgId = membership.org_id;
    }
    
    if (!currentOrgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    // Verificar que el usuario pertenece a la organización y tiene permisos
    const { data: membership } = await supabase
      .from('org_members')
      .select('*')
      .eq('org_id', currentOrgId)
      .eq('user_id', user.id)
      .single();
    
    if (!membership) {
      return NextResponse.json(
        { error: 'User is not a member of this organization' },
        { status: 403 }
      );
    }
    
    // Solo admins y owners pueden eliminar clientes
    if (!['admin', 'owner'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins and owners can delete clients.' },
        { status: 403 }
      );
    }
    
    // Eliminar el cliente
    await deleteClient(params.id, currentOrgId);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting client:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// También soportar DELETE method
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return POST(request, { params });
}
