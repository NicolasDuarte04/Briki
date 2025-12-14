// src/app/actions/organizationActions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { createServerSupabase } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { decryptProfileName } from '@/lib/helpers/profileEncryption';

/**
 * Crea una nueva organización y asigna al usuario actual como 'owner'.
 * @param name - El nombre de la organización.
 * @param slug - El identificador único para la URL.
 * @returns La organización recién creada.
 */
export async function createOrganization(name: string, slug: string) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Unauthorized: User not found.');
  
  // 1. Crear la organización
  const newOrg = await prisma.organizations.create({
    data: { name, slug }
  });
  
  // 2. Vincular al usuario actual como el propietario ('owner')
  await prisma.org_members.create({
    data: {
      org_id: newOrg.id,
      user_id: user.id,
      role: 'owner'
    }
  });
  
  revalidatePath('/onboarding');
  return newOrg;
}

/**
 * Obtiene todas las organizaciones a las que pertenece el usuario actual.
 * @returns Un array de membresías que incluye los datos de la organización.
 */
export async function getUserOrganizations() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];
  
  return prisma.org_members.findMany({
    where: { user_id: user.id },
    include: { organizations: true } // Incluye los datos completos de la organización
  });
}

/**
 * Obtiene una organización específica por su ID.
 * Verifica que el usuario actual sea miembro de la organización.
 * @param orgId - El ID de la organización.
 * @returns La organización o null si no tiene acceso.
 */
export async function getOrganization(orgId: string) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const membership = await prisma.org_members.findFirst({
    where: {
      org_id: orgId,
      user_id: user.id
    },
    include: { organizations: true }
  });
  
  return (membership as any)?.organizations || null;
}

/**
 * Actualiza los datos de una organización.
 * Solo los owners y admins pueden actualizar la organización.
 * @param orgId - El ID de la organización.
 * @param data - Los datos a actualizar.
 * @returns La organización actualizada.
 */
export async function updateOrganization(orgId: string, data: { name?: string; slug?: string; settings?: any }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Unauthorized: User not found.');
  
  // Verificar que el usuario sea admin u owner
  const membership = await prisma.org_members.findFirst({
    where: {
      org_id: orgId,
      user_id: user.id,
      role: { in: ['owner', 'admin'] }
    }
  });
  
  if (!membership) throw new Error('Forbidden: Insufficient permissions.');
  
  const updatedOrg = await prisma.organizations.update({
    where: { id: orgId },
    data
  });
  
  revalidatePath('/workspace');
  return updatedOrg;
}

// =============================================================================
// TIPOS PARA TEAM DASHBOARD
// =============================================================================

export interface UserOrganization {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'member';
  isActive: boolean;
  memberSince: string;
  memberCount: number;
}

export interface OrgMember {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  isCurrentUser: boolean;
}

export interface SwitchOrgResult {
  ok: boolean;
  error?: string;
  orgId?: string;
  orgName?: string;
  orgSlug?: string;
  userRole?: string;
}

export interface GetOrganizationsResult {
  ok: boolean;
  organizations?: UserOrganization[];
  error?: string;
}

export interface GetMembersResult {
  ok: boolean;
  members?: OrgMember[];
  error?: string;
}

export interface GetActiveOrgResult {
  ok: boolean;
  organizationId?: string;
  error?: string;
}

// =============================================================================
// OBTENER ORGANIZACIONES CON FORMATO PARA UI
// =============================================================================

/**
 * Obtiene todas las organizaciones del usuario con formato optimizado para el UI.
 * Incluye indicador de organización activa y conteo de miembros.
 */
export async function getUserOrganizationsForUI(): Promise<GetOrganizationsResult> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { ok: false, error: 'No autenticado' };
  
  try {
    // Usar la función SQL que ya tiene toda la lógica
    const { data, error } = await supabase.rpc('get_user_organizations');
    
    if (error) {
      console.error('Error fetching user organizations:', error);
      // Fallback a Prisma si la función SQL falla
      return getUserOrganizationsFallback(user.id);
    }
    
    // Obtener conteo de miembros para cada org
    const orgsWithCounts = await Promise.all(
      (data || []).map(async (org: any) => {
        const { count } = await supabase
          .from('org_members')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', org.org_id);
        
        return {
          id: org.org_id,
          name: org.org_name,
          slug: org.org_slug,
          role: org.user_role as 'owner' | 'admin' | 'member',
          isActive: org.is_active || false,
          memberSince: org.member_since,
          memberCount: count || 0
        };
      })
    );
    
    return { ok: true, organizations: orgsWithCounts };
    
  } catch (error) {
    console.error('Error in getUserOrganizationsForUI:', error);
    return { ok: false, error: 'Error al cargar organizaciones' };
  }
}

/**
 * Fallback usando Prisma si la función SQL no está disponible
 */
async function getUserOrganizationsFallback(userId: string): Promise<GetOrganizationsResult> {
  try {
    const memberships = await prisma.org_members.findMany({
      where: { user_id: userId },
      include: { 
        organizations: {
          include: {
            org_members: {
              select: { id: true }
            }
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });
    
    // Obtener org activa de user_preferences
    const prefs = await prisma.$queryRaw<{ active_org_id: string | null }[]>`
      SELECT active_org_id FROM public.user_preferences WHERE user_id = ${userId}::uuid
    `;
    const activeOrgId = prefs[0]?.active_org_id;
    
    const organizations = memberships.map((m: any) => ({
      id: m.organizations.id,
      name: m.organizations.name,
      slug: m.organizations.slug,
      role: m.role as 'owner' | 'admin' | 'member',
      isActive: m.organizations.id === activeOrgId,
      memberSince: m.created_at?.toISOString() || new Date().toISOString(),
      memberCount: m.organizations.org_members?.length || 0
    }));
    
    return { ok: true, organizations };
  } catch (error) {
    console.error('Error in getUserOrganizationsFallback:', error);
    return { ok: false, error: 'Error al cargar organizaciones' };
  }
}

// =============================================================================
// CAMBIAR ORGANIZACIÓN ACTIVA
// =============================================================================

/**
 * Cambia la organización activa del usuario.
 * Usa la función SQL switch_organization() para persistir el cambio.
 */
export async function switchOrganization(newOrgId: string): Promise<SwitchOrgResult> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { ok: false, error: 'No autenticado' };
  }
  
  try {
    // Usar la función SQL que maneja toda la lógica
    const { data, error } = await supabase.rpc('switch_organization', {
      new_org_id: newOrgId
    });
    
    if (error) {
      console.error('Error switching organization:', error);
      return { ok: false, error: 'Error al cambiar de organización' };
    }
    
    if (!data.success) {
      return { ok: false, error: data.error || 'No tienes acceso a esta organización' };
    }
    
    // Revalidar todas las rutas que dependen de la org
    revalidatePath('/workspace');
    revalidatePath('/dashboard');
    revalidatePath('/profile');
    revalidatePath('/workspace/cases');
    revalidatePath('/workspace/clients');
    
    return {
      ok: true,
      orgId: data.org_id,
      orgName: data.org_name,
      orgSlug: data.org_slug,
      userRole: data.user_role
    };
    
  } catch (error) {
    console.error('Error in switchOrganization:', error);
    return { ok: false, error: 'Error interno del servidor' };
  }
}

// =============================================================================
// OBTENER MIEMBROS DE UNA ORGANIZACIÓN
// =============================================================================

/**
 * Obtiene todos los miembros de una organización con sus perfiles.
 * El usuario debe ser miembro de la organización para ver esta información.
 */
export async function getOrgMembers(orgId: string): Promise<GetMembersResult> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { ok: false, error: 'No autenticado' };
  
  try {
    // Verificar que el usuario es miembro de la org
    const { data: membership } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single();
    
    if (!membership) {
      console.warn('User is not a member of this organization');
      return { ok: false, error: 'No eres miembro de esta organización' };
    }
    
    // Obtener todos los miembros con sus perfiles (incluyendo el campo encriptado)
    const membersRaw = await prisma.org_members.findMany({
      where: { org_id: orgId },
      include: {
        users: {
          select: { 
            email: true,
            profile: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });
    
    // Desencriptar nombres usando la función helper existente
    const formattedMembers = await Promise.all(
      membersRaw.map(async (m: any) => {
        let decryptedName: string | null = null;
        
        // Intentar desencriptar el nombre si existe
        if (m.users?.profile?.name) {
          try {
            decryptedName = await decryptProfileName(m.users.profile.name);
          } catch (err) {
            console.warn('Could not decrypt name for user:', m.user_id, err);
          }
        }
        
        return {
          id: m.id,
          userId: m.user_id,
          name: decryptedName,
          email: m.users?.email || 'Email no disponible',
          role: m.role as 'owner' | 'admin' | 'member',
          joinedAt: m.created_at?.toISOString() || new Date().toISOString(),
          isCurrentUser: m.user_id === user.id
        };
      })
    );
    
    // Ordenar por rol (owner primero, luego admin, luego member)
    formattedMembers.sort((a, b) => {
      const roleOrder = { owner: 1, admin: 2, member: 3 };
      return roleOrder[a.role] - roleOrder[b.role];
    });
    
    return { ok: true, members: formattedMembers };
    
  } catch (error) {
    console.error('Error in getOrgMembers:', error);
    
    // Fallback sin desencriptar nombres si falla
    try {
      const fallbackMembers = await prisma.org_members.findMany({
        where: { org_id: orgId },
        include: {
          users: {
            select: { email: true }
          }
        },
        orderBy: { created_at: 'asc' }
      });
      
      const members = fallbackMembers.map((m: any) => ({
        id: m.id,
        userId: m.user_id,
        name: null, // No podemos desencriptar
        email: m.users?.email || 'Email no disponible',
        role: m.role as 'owner' | 'admin' | 'member',
        joinedAt: m.created_at?.toISOString() || new Date().toISOString(),
        isCurrentUser: m.user_id === user.id
      }));
      
      return { ok: true, members };
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return { ok: false, error: 'Error al cargar miembros' };
    }
  }
}

// =============================================================================
// OBTENER ORGANIZACIÓN ACTIVA
// =============================================================================

/**
 * Obtiene la organización actualmente activa del usuario.
 * Útil para saber cuál mostrar seleccionada en el dropdown.
 */
export async function getActiveOrganization(): Promise<GetActiveOrgResult> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { ok: false, error: 'No autenticado' };
  
  try {
    const result = await getUserOrganizationsForUI();
    if (!result.ok || !result.organizations) {
      return { ok: false, error: 'No se pudieron cargar las organizaciones' };
    }
    
    const activeOrg = result.organizations.find(org => org.isActive) || result.organizations[0];
    
    if (!activeOrg) {
      return { ok: false, error: 'No tienes organizaciones' };
    }
    
    return { ok: true, organizationId: activeOrg.id };
  } catch (error) {
    console.error('Error in getActiveOrganization:', error);
    return { ok: false, error: 'Error al obtener organización activa' };
  }
}
