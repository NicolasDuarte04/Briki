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
    // Verificación de variables de entorno para un diagnóstico rápido
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('❌ Supabase environment variables are not configured.');
        throw new Error('Supabase environment variables are not configured.');
    }

    const supabase = await createServerSupabase();

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
            // Loguear el error específico de Supabase
            console.error('❌ Supabase auth.getUser() error:', userError.message);
            throw new Error(`Authentication failed: ${userError.message}`);
        }

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
        
    } catch (error: any) {
        console.error('❌ An error occurred in getCurrentOrg:', error.message);
        // Si es un error de timeout, el log lo mostrará.
        // Volver a lanzar el error para que la API que lo llama pueda manejarlo y devolver un 500.
        throw error;
    }
}


