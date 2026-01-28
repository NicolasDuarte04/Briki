// /src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { resolveActiveOrg } from '@/lib/helpers/resolveActiveOrg';

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

    // ✅ MULTI-TENANCY: Resolver organización activa usando helper centralizado
    const orgResult = await resolveActiveOrg(user.id, supabase);
    if (!orgResult.ok) {
      return NextResponse.json(
        { error: orgResult.error },
        { status: orgResult.errorCode }
      );
    }
    const { orgId, membership } = orgResult;

    return NextResponse.json({
      userId: user.id,
      orgId: orgId,
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

