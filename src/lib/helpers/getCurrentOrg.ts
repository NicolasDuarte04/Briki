// src/lib/helpers/getCurrentOrg.ts
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { getUserOrganizations } from '@/app/actions/organizationActions';
import { reconnectPrisma, checkDatabaseHealth } from '@/lib/prisma';

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
        
        // ✅ CORRECCIÓN INTEGRAL: Manejo robusto de errores de Prisma con múltiples estrategias
        let organizations;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                organizations = await getUserOrganizations();
                break; // Éxito, salir del loop
            } catch (prismaError: any) {
                retryCount++;
                
                // ✅ Estrategia 1: Timeout de conexión (P2024) - reintentar con delay
                if (prismaError.code === 'P2024') {
                    console.warn(`⚠️ Prisma connection timeout (attempt ${retryCount}/${maxRetries}), retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Delay progresivo
                    continue;
                }
                
                // ✅ Estrategia 2: Servidor inaccesible (P1001) - reintentar con delay más largo
                if (prismaError.code === 'P1001') {
                    console.warn(`⚠️ Database server unreachable (attempt ${retryCount}/${maxRetries}), retrying...`);
                    
                    // ✅ CORRECCIÓN INTEGRAL: Intentar reconexión automática para P1001
                    if (retryCount === 1) {
                        console.log('🔄 [getCurrentOrg] Attempting automatic reconnection...');
                        const reconnected = await reconnectPrisma();
                        if (reconnected) {
                            console.log('✅ [getCurrentOrg] Reconnection successful, retrying...');
                        }
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // Delay más largo
                    continue;
                }
                
                // ✅ Estrategia 3: Otros errores de Prisma - reintentar una vez
                if (prismaError.code?.startsWith('P')) {
                    console.warn(`⚠️ Prisma error ${prismaError.code} (attempt ${retryCount}/${maxRetries}), retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    continue;
                }
                
                // ✅ Estrategia 4: Error no relacionado con Prisma - lanzar inmediatamente
                console.error('❌ Non-Prisma error in getCurrentOrg:', prismaError);
                throw prismaError;
            }
        }
        
        // ✅ Si llegamos aquí después de maxRetries, lanzar error con contexto
        if (!organizations) {
            const errorMsg = `Database connection failed after ${maxRetries} attempts. Please check your connection and try again.`;
            console.error('❌', errorMsg);
            throw new Error(errorMsg);
        }
        
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


