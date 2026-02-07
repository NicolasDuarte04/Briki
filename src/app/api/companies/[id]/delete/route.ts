// /src/app/api/companies/[id]/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { deleteCompany } from '@/lib/companiesDb';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    console.log('[DELETE COMPANY] Step 1 - User:', user?.id || 'NOT AUTHENTICATED');
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { orgId } = body;
    
    console.log('[DELETE COMPANY] Step 2 - Request body orgId:', orgId);
    
    // Si orgId es 'current', obtener la organización del usuario
    let currentOrgId = orgId;
    if (orgId === 'current') {
      // ✅ Replicar patrón de getCurrentOrg.ts para multi-tenancy
      // Paso 1: Leer preferencia de organización activa del usuario
      let activeOrgId: string | null = null;
      const { data: preferences, error: prefError } = await supabase
        .from('user_preferences')
        .select('active_org_id')
        .eq('user_id', user.id)
        .single();
      
      console.log('[DELETE COMPANY] Step 3a - user_preferences query:', { 
        active_org_id: preferences?.active_org_id, 
        error: prefError?.message 
      });
      
      if (prefError) {
        console.log('[DELETE COMPANY] Step 3a - No user preferences found, will use fallback');
      } else {
        activeOrgId = preferences?.active_org_id || null;
      }
      
      // Paso 2: Si hay preferencia, validar que el usuario sea miembro de esa org
      if (activeOrgId) {
        const { data: membership, error: membershipError } = await supabase
          .from('org_members')
          .select('org_id, role')
          .eq('user_id', user.id)
          .eq('org_id', activeOrgId)
          .single();
        
        console.log('[DELETE COMPANY] Step 3b - Validating preferred org membership:', { 
          membership, 
          error: membershipError?.message 
        });
        
        if (membership) {
          currentOrgId = activeOrgId;
          console.log('[DELETE COMPANY] Step 3b - Using preferred org:', currentOrgId);
        }
      }
      
      // Paso 3: Fallback - Si no hay preferencia válida, usar primera organización
      if (!currentOrgId || currentOrgId === 'current') {
        const { data: memberships, error: membershipsError } = await supabase
          .from('org_members')
          .select('org_id, role')
          .eq('user_id', user.id)
          .limit(1);
        
        console.log('[DELETE COMPANY] Step 3c - Fallback to first org:', { 
          count: memberships?.length, 
          error: membershipsError?.message 
        });
        
        if (!memberships || memberships.length === 0) {
          return NextResponse.json(
            { error: 'User is not a member of any organization' },
            { status: 403 }
          );
        }
        
        currentOrgId = memberships[0]!.org_id;
        console.log('[DELETE COMPANY] Step 3c - Using first available org:', currentOrgId);
      }
    }
    
    console.log('[DELETE COMPANY] Step 4 - currentOrgId resolved to:', currentOrgId);
    
    if (!currentOrgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    // Verificar que el usuario pertenece a la organización y tiene permisos
    const { data: membership, error: membershipError } = await supabase
      .from('org_members')
      .select('*')
      .eq('org_id', currentOrgId)
      .eq('user_id', user.id)
      .single();
    
    console.log('[DELETE COMPANY] Step 5 - Full membership:', { membership, error: membershipError?.message });
    console.log('[DELETE COMPANY] Step 5b - User role:', membership?.role);
    
    if (!membership) {
      return NextResponse.json(
        { error: 'User is not a member of this organization' },
        { status: 403 }
      );
    }
    
    // Solo admins y owners pueden eliminar empresas (SARLAFT compliance)
    const allowedRoles = ['admin', 'owner'];
    const hasPermission = allowedRoles.includes(membership.role);
    console.log('[DELETE COMPANY] Step 6 - Role check:', { role: membership.role, allowedRoles, hasPermission });
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: `Insufficient permissions. Only admins and owners can delete companies. Your role: ${membership.role}` },
        { status: 403 }
      );
    }
    
    // Obtener el id del parámetro de ruta (Next.js 15+ requiere await)
    const { id } = await params;
    
    // Eliminar la empresa (soft delete para compliance SARLAFT)
    await deleteCompany(id, currentOrgId);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting company:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Company not found' },
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
  { params }: { params: Promise<{ id: string }> }
) {
  return POST(request, { params });
}
