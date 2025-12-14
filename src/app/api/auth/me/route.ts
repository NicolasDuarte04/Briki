// /src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // ✅ CORRECCIÓN: Obtener TODAS las membresías del usuario (soporta multi-org)
    const { data: memberships, error: membershipError } = await supabase
      .from('org_members')
      .select('org_id, role')
      .eq('user_id', user.id);
    
    if (membershipError) {
      console.error('Error fetching memberships:', membershipError);
      return NextResponse.json(
        { error: 'Failed to fetch organization memberships' },
        { status: 500 }
      );
    }
    
    if (!memberships || memberships.length === 0) {
      return NextResponse.json(
        { error: 'User is not a member of any organization' },
        { status: 404 }
      );
    }
    
    // ✅ Leer preferencia de organización activa (igual que getCurrentOrg.ts)
    let activeOrgId: string | null = null;
    try {
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('active_org_id')
        .eq('user_id', user.id)
        .single();
      
      activeOrgId = preferences?.active_org_id || null;
    } catch {
      // Sin preferencias, usar fallback
    }
    
    // ✅ Seleccionar membresía: activa preferida o primera disponible
    let selectedMembership = memberships[0];
    
    if (activeOrgId) {
      const activeMembership = memberships.find(m => m.org_id === activeOrgId);
      if (activeMembership) {
        selectedMembership = activeMembership;
      }
    }
    
    return NextResponse.json({
      userId: user.id,
      orgId: selectedMembership.org_id,
      email: user.email,
      role: selectedMembership.role, // ✅ Incluir rol (admin, owner, member)
    });
    
  } catch (error) {
    console.error('Error fetching user info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

