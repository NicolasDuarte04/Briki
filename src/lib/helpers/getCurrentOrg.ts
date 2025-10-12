// src/lib/helpers/getCurrentOrg.ts
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { getUserOrganizations } from '@/app/actions/organizationActions';

/**
 * Helper para obtener la organización actual del usuario autenticado.
 * Maneja automáticamente redirects si no hay usuario u organización.
 * 
 * @returns {Promise<{ user, currentOrg }>} Usuario autenticado y su organización actual
 * @throws {redirect} Redirige a /login si no hay usuario
 * @throws {redirect} Redirige a /onboarding/organization si no hay organización
 */
export async function getCurrentOrg() {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        redirect('/login');
    }
    
    const organizations = await getUserOrganizations();
    
    if (!organizations || organizations.length === 0) {
        redirect('/onboarding/organization');
    }
    
    // El tipo de `getUserOrganizations` devuelve un array de `org_members` que incluye `organizations`
    const currentOrg = (organizations[0] as any)?.organizations;
    
    if (!currentOrg) {
        console.error("Organization data is missing in the membership object.");
        redirect('/onboarding/organization');
    }
    
    return { user, currentOrg };
}


