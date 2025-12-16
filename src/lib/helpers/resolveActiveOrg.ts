// src/lib/helpers/resolveActiveOrg.ts
/**
 * Helper para resolver la organización activa de un usuario en API Routes.
 * Implementa el patrón multi-tenancy consistente:
 * 1. Lee user_preferences.active_org_id
 * 2. Valida membership en esa org
 * 3. Fallback a primera organización
 * 
 * A diferencia de getCurrentOrg.ts, esta función:
 * - NO hace redirects (para uso en API routes)
 * - Usa Supabase directamente (no Prisma) para queries simples
 * - Retorna resultado estructurado con error handling
 */

import { SupabaseClient } from '@supabase/supabase-js';

type OrgMembership = {
  org_id: string;
  role: 'owner' | 'admin' | 'member';
  user_id: string;
};

type SuccessResult = {
  ok: true;
  orgId: string;
  membership: OrgMembership;
  error?: undefined;
  errorCode?: undefined;
};

type ErrorResult = {
  ok: false;
  orgId?: undefined;
  membership?: undefined;
  error: string;
  errorCode: number;
};

export type ResolveActiveOrgResult = SuccessResult | ErrorResult;

/**
 * Resuelve la organización activa del usuario para validaciones en API Routes.
 * 
 * @param userId - ID del usuario autenticado
 * @param supabase - Cliente de Supabase con autenticación del servidor
 * @returns Resultado con orgId y membership si exitoso, o error si falla
 * 
 * @example
 * ```typescript
 * const result = await resolveActiveOrg(user.id, supabase);
 * if (!result.ok) {
 *   return new NextResponse(result.error, { status: result.errorCode });
 * }
 * const { orgId, membership } = result;
 * ```
 */
export async function resolveActiveOrg(
  userId: string,
  supabase: SupabaseClient
): Promise<ResolveActiveOrgResult> {
  try {
    // Paso 1: Leer preferencia de organización activa del usuario
    let activeOrgId: string | null = null;
    
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('active_org_id')
      .eq('user_id', userId)
      .single();
    
    if (!prefError && preferences?.active_org_id) {
      activeOrgId = preferences.active_org_id;
    }
    
    // Paso 2: Si hay preferencia, validar que el usuario sea miembro de esa org
    if (activeOrgId) {
      const { data: membership, error: membershipError } = await supabase
        .from('org_members')
        .select('org_id, role, user_id')
        .eq('user_id', userId)
        .eq('org_id', activeOrgId)
        .single();
      
      if (!membershipError && membership) {
        // ✅ Organización activa válida encontrada
        return {
          ok: true,
          orgId: activeOrgId,
          membership: membership as OrgMembership
        };
      }
      // Si falla, continuamos al fallback
    }
    
    // Paso 3: Fallback - Obtener primera organización del usuario
    const { data: memberships, error: membershipsError } = await supabase
      .from('org_members')
      .select('org_id, role, user_id')
      .eq('user_id', userId)
      .limit(1);
    
    if (membershipsError) {
      console.error('[resolveActiveOrg] Error fetching memberships:', membershipsError);
      return {
        ok: false,
        error: 'Error accessing organization data',
        errorCode: 500
      };
    }
    
    if (!memberships || memberships.length === 0) {
      return {
        ok: false,
        error: 'User is not a member of any organization',
        errorCode: 403
      };
    }
    
    // TypeScript no infiere que memberships[0] existe después del check de length
    const fallbackMembership = memberships[0]!;
    
    return {
      ok: true,
      orgId: fallbackMembership.org_id,
      membership: fallbackMembership as OrgMembership
    };
    
  } catch (error) {
    console.error('[resolveActiveOrg] Unexpected error:', error);
    return {
      ok: false,
      error: 'Internal error resolving organization',
      errorCode: 500
    };
  }
}
