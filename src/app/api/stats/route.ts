import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getCaseStatsByOrg } from '@/lib/database';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 });
    }

    const stats = await getCaseStatsByOrg(membership.org_id);
    return NextResponse.json({ stats }, { status: 200 });
  } catch (err) {
    console.error('Stats API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


