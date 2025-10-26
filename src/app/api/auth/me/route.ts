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
    
    // Obtener la organización del usuario con su rol
    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (!membership) {
      return NextResponse.json(
        { error: 'User is not a member of any organization' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      userId: user.id,
      orgId: membership.org_id,
      email: user.email,
      role: membership.role, // ✅ Incluir rol (admin, owner, member)
    });
    
  } catch (error) {
    console.error('Error fetching user info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

