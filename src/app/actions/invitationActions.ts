// src/app/actions/invitationActions.ts
'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// =============================================================================
// TIPOS
// =============================================================================

export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';

export interface PendingInvitation {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  inviterName: string | null;
  inviterEmail: string;
  role: 'member' | 'admin';
  message: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface SentInvitation {
  id: string;
  inviteeEmail: string;
  role: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string | null;
}

export interface InviteParams {
  orgId: string;
  inviteeEmail: string;
  role?: 'member' | 'admin';
  message?: string;
}

export interface InviteResult {
  ok: boolean;
  error?: string;
  invitationId?: string;
}

export interface GetPendingResult {
  ok: boolean;
  invitations?: PendingInvitation[];
  error?: string;
}

export interface GetSentResult {
  ok: boolean;
  invitations?: SentInvitation[];
  error?: string;
}

export interface RespondResult {
  ok: boolean;
  error?: string;
  action?: 'accepted' | 'rejected';
  orgId?: string;
  role?: string;
}

// =============================================================================
// INVITAR USUARIO A ORGANIZACIÓN
// =============================================================================

/**
 * Invita a un usuario a una organización por email.
 * Solo admins y owners pueden invitar.
 */
export async function inviteUserToOrg(params: InviteParams): Promise<InviteResult> {
  const { orgId, inviteeEmail, role = 'member', message } = params;
  
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { ok: false, error: 'No autenticado' };
  }
  
  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(inviteeEmail)) {
    return { ok: false, error: 'Formato de email inválido' };
  }
  
  // Normalizar email
  const normalizedEmail = inviteeEmail.toLowerCase().trim();
  
  // Verificar que el usuario no se esté invitando a sí mismo
  if (normalizedEmail === user.email?.toLowerCase()) {
    return { ok: false, error: 'No puedes invitarte a ti mismo' };
  }
  
  try {
    // Verificar que el invitante es admin/owner de la org
    const { data: membership, error: membershipError } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single();
    
    if (membershipError || !membership) {
      return { ok: false, error: 'No eres miembro de esta organización' };
    }
    
    if (!['admin', 'owner'].includes(membership.role)) {
      return { ok: false, error: 'Solo administradores y propietarios pueden invitar usuarios' };
    }
    
    // VALIDAR QUE EL USUARIO EXISTA EN EL SISTEMA
    const { data: userByEmail, error: userLookupError } = await supabase.rpc('get_user_id_by_email', { 
      target_email: normalizedEmail 
    });
    
    if (userLookupError) {
      console.error('Error looking up user by email:', userLookupError);
      return { ok: false, error: 'Error al verificar el usuario' };
    }
    
    if (!userByEmail) {
      return { ok: false, error: 'No existe ningún usuario registrado con ese email' };
    }
    
    // Verificar si el usuario ya es miembro
    const { data: alreadyMember } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', userByEmail)
      .single();
    
    if (alreadyMember) {
      return { ok: false, error: 'Este usuario ya es miembro de la organización' };
    }
    
    // Verificar si ya existe invitación pendiente
    const { data: existingInvitation } = await supabase
      .from('org_invitations')
      .select('id, status')
      .eq('org_id', orgId)
      .eq('invitee_email', normalizedEmail)
      .eq('status', 'pending')
      .single();
    
    if (existingInvitation) {
      return { ok: false, error: 'Ya existe una invitación pendiente para este email' };
    }
    
    // Crear la invitación (ya sabemos que userByEmail existe)
    const { data: invitation, error: insertError } = await supabase
      .from('org_invitations')
      .insert({
        org_id: orgId,
        inviter_user_id: user.id,
        invitee_email: normalizedEmail,
        invitee_user_id: userByEmail, // Asignar directamente el user_id
        role: role,
        message: message || null,
        status: 'pending'
      })
      .select('id')
      .single();
    
    if (insertError) {
      console.error('Error creating invitation:', insertError);
      return { ok: false, error: 'Error al crear la invitación' };
    }
    
    revalidatePath('/profile');
    
    return { 
      ok: true, 
      invitationId: invitation.id 
    };
    
  } catch (error) {
    console.error('Error in inviteUserToOrg:', error);
    return { ok: false, error: 'Error interno del servidor' };
  }
}

// =============================================================================
// OBTENER INVITACIONES PENDIENTES
// =============================================================================

/**
 * Obtiene las invitaciones pendientes del usuario actual.
 * Usa función SQL con SECURITY DEFINER para bypass seguro de RLS.
 * La función SQL filtra por invitee_user_id O invitee_email.
 */
export async function getPendingInvitations(): Promise<GetPendingResult> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { ok: false, error: 'No autenticado' };
  
  try {
    // Usar función SQL con SECURITY DEFINER que:
    // 1. Bypassa RLS de organizations (usuario aún no es miembro)
    // 2. Filtra por user_id O email (robustez)
    // 3. Desencripta nombres de invitantes automáticamente
    const { data, error } = await supabase.rpc('get_pending_invitations');
    
    if (error) {
      console.error('Error fetching pending invitations via RPC:', error);
      return { ok: false, error: 'Error al cargar invitaciones' };
    }
    
    // Mapear resultado de función SQL a tipo esperado
    const invitations = (data || []).map((inv: any) => ({
      id: inv.invitation_id,
      organizationId: inv.org_id,
      organizationName: inv.org_name || 'Organización',
      organizationSlug: inv.org_slug || '',
      inviterName: inv.inviter_name || null,
      inviterEmail: inv.inviter_email || '',
      role: inv.role as 'member' | 'admin',
      message: inv.message,
      createdAt: inv.created_at,
      expiresAt: inv.expires_at
    }));
    
    console.log(`Found ${invitations.length} pending invitations for user ${user.email}`);
    
    return { ok: true, invitations };
    
  } catch (error) {
    console.error('Error in getPendingInvitations:', error);
    return { ok: false, error: 'Error interno del servidor' };
  }
}

// =============================================================================
// CONTAR INVITACIONES PENDIENTES
// =============================================================================

/**
 * Cuenta las invitaciones pendientes del usuario actual.
 * Útil para mostrar badge en el tab Notifications.
 * Busca por user_id O por email para mayor robustez.
 */
export async function countPendingInvitations(): Promise<number> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return 0;
  
  try {
    // Contar invitaciones por user_id O por email
    const { count, error } = await supabase
      .from('org_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .or(`invitee_user_id.eq.${user.id},invitee_email.eq.${user.email}`);
    
    if (error) {
      console.error('Error counting pending invitations:', error);
      return 0;
    }
    
    return count || 0;
    
  } catch (error) {
    console.error('Error in countPendingInvitations:', error);
    return 0;
  }
}

// =============================================================================
// RESPONDER A UNA INVITACIÓN
// =============================================================================

/**
 * Acepta o rechaza una invitación.
 * Si acepta, crea automáticamente la membresía en la organización.
 * 
 * @param invitationId - ID de la invitación
 * @param accept - true para aceptar, false para rechazar
 */
export async function respondToInvitation(
  invitationId: string,
  accept: boolean
): Promise<RespondResult> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { ok: false, error: 'No autenticado' };
  }
  
  try {
    // Primero obtener la invitación para verificar que pertenece al usuario
    const { data: invitation, error: fetchError } = await supabase
      .from('org_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .or(`invitee_user_id.eq.${user.id},invitee_email.eq.${user.email}`)
      .single();
    
    if (fetchError || !invitation) {
      console.error('Invitation not found or not accessible:', fetchError);
      return { ok: false, error: 'Invitación no encontrada, expirada o ya respondida' };
    }
    
    // Actualizar la invitación
    const { error: updateError } = await supabase
      .from('org_invitations')
      .update({
        status: accept ? 'accepted' : 'rejected',
        responded_at: new Date().toISOString(),
        invitee_user_id: user.id // Asegurar que se asigne el user_id
      })
      .eq('id', invitationId);
    
    if (updateError) {
      console.error('Error updating invitation:', updateError);
      return { ok: false, error: 'Error al procesar la respuesta' };
    }
    
    // Si acepta, crear la membresía
    if (accept) {
      const { error: memberError } = await supabase
        .from('org_members')
        .upsert({
          org_id: invitation.org_id,
          user_id: user.id,
          role: invitation.role
        }, {
          onConflict: 'org_id,user_id'
        });
      
      if (memberError) {
        console.error('Error creating membership:', memberError);
        // Revertir el estado de la invitación
        await supabase
          .from('org_invitations')
          .update({ status: 'pending', responded_at: null })
          .eq('id', invitationId);
        return { ok: false, error: 'Error al crear la membresía' };
      }
    }
    
    // Revalidar rutas relevantes
    revalidatePath('/profile');
    revalidatePath('/workspace');
    revalidatePath('/dashboard');
    
    return {
      ok: true,
      action: accept ? 'accepted' : 'rejected',
      orgId: invitation.org_id,
      role: invitation.role
    };
    
  } catch (error) {
    console.error('Error in respondToInvitation:', error);
    return { ok: false, error: 'Error interno del servidor' };
  }
}

// =============================================================================
// CANCELAR INVITACIÓN (Admin/Owner)
// =============================================================================

/**
 * Cancela una invitación pendiente.
 * Solo admins/owners de la organización pueden cancelar.
 * 
 * @param invitationId - ID de la invitación a cancelar
 */
export async function cancelInvitation(invitationId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { ok: false, error: 'No autenticado' };
  }
  
  try {
    // La política RLS ya valida que el usuario sea admin/owner
    const { error } = await supabase
      .from('org_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId)
      .eq('status', 'pending');
    
    if (error) {
      console.error('Error cancelling invitation:', error);
      return { ok: false, error: 'Error al cancelar la invitación' };
    }
    
    revalidatePath('/profile');
    
    return { ok: true };
    
  } catch (error) {
    console.error('Error in cancelInvitation:', error);
    return { ok: false, error: 'Error interno del servidor' };
  }
}

// =============================================================================
// OBTENER INVITACIONES ENVIADAS (Admin/Owner)
// =============================================================================

/**
 * Obtiene las invitaciones enviadas por la organización.
 * Solo visible para admins/owners.
 * 
 * @param orgId - ID de la organización
 */
export async function getSentInvitations(orgId: string): Promise<GetSentResult> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { ok: false, error: 'No autenticado' };
  
  try {
    // La política RLS filtra automáticamente si el usuario es admin/owner
    const { data, error } = await supabase
      .from('org_invitations')
      .select('id, invitee_email, role, status, created_at, expires_at')
      .eq('org_id', orgId)
      .eq('status', 'pending')  // Solo mostrar pendientes
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching sent invitations:', error);
      return { ok: false, error: 'Error al cargar invitaciones enviadas' };
    }
    
    const invitations = (data || []).map((inv: any) => ({
      id: inv.id,
      inviteeEmail: inv.invitee_email,
      role: inv.role,
      status: inv.status as InvitationStatus,
      createdAt: inv.created_at,
      expiresAt: inv.expires_at
    }));
    
    return { ok: true, invitations };
    
  } catch (error) {
    console.error('Error in getSentInvitations:', error);
    return { ok: false, error: 'Error interno del servidor' };
  }
}
