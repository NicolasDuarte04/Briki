// /src/app/api/audit-log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 1. Verificar que el usuario está autenticado
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 2. Obtener membresías del usuario para verificar su rol
    const { data: memberships } = await supabase
      .from('org_members')
      .select('org_id, role')
      .eq('user_id', user.id);
    
    if (!memberships || memberships.length === 0) {
      return NextResponse.json(
        { error: 'User is not a member of any organization' },
        { status: 404 }
      );
    }
    
    // 3. ✅ Verificar que el usuario es admin u owner
    const hasAdminAccess = memberships.some(
      m => m.role === 'admin' || m.role === 'owner'
    );
    
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Forbidden - Admin or Owner access required' },
        { status: 403 }
      );
    }
    
    // 4. Obtener audit_logs de todas las organizaciones donde el usuario es admin/owner
    const orgIds = memberships.map(m => m.org_id);
    
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        // Filtro: solo logs de las organizaciones donde el usuario es admin
        caseId: {
          in: await prisma.case.findMany({
            where: {
              orgId: { in: orgIds }
            },
            select: { id: true }
          }).then(cases => cases.map(c => c.id))
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limitar a los últimos 100 registros
    });
    
    return NextResponse.json(auditLogs);
    
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

