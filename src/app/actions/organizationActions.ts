// src/app/actions/organizationActions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { createServerSupabase } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getWorkspaceHome } from '@/lib/routes/workspace';

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
  
  revalidatePath(getWorkspaceHome());
  return updatedOrg;
}
