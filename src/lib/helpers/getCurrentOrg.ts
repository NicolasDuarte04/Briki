// src/lib/helpers/getCurrentOrg.ts
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { getUserOrganizations } from '@/app/actions/organizationActions';
import { checkDatabaseHealth } from '@/lib/prisma';
import { prisma } from '@/lib/prisma';

/**
 * Helper para obtener la organización actual del usuario autenticado.
 * Maneja automáticamente redirects si no hay usuario u organización.
 * 
 * @returns {Promise<{ user, currentOrg }>} Usuario autenticado y su organización actual
 * @throws {redirect} Redirige a /login si no hay usuario
 * @throws {redirect} Redirige a /onboarding/organization si no hay organización
 */
export async function getCurrentOrg() {
    // ✅ CORRECCIÓN CRÍTICA: Verificación exhaustiva de variables de entorno
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('❌ Supabase environment variables are not configured.');
        }
        throw new Error('Supabase environment variables are not configured.');
    }

    // ✅ CORRECCIÓN CRÍTICA: Verificar variables de base de datos
    if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('❌ Database connection variables (DATABASE_URL or DIRECT_URL) are not configured.');
        }
        throw new Error('Database connection variables are not configured. Please check your .env.local file.');
    }

    const supabase = await createServerSupabase();

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
            // Loguear el error específico de Supabase solo en desarrollo
            if (process.env.NODE_ENV !== 'production') {
                console.error('❌ Supabase auth.getUser() error:', userError.message);
            }
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

                // ✅ CORRECCIÓN CRÍTICA: Detectar errores de conexión por código Y por mensaje
                // PrismaClientInitializationError puede no tener código P1001, pero tiene el mensaje específico
                const isConnectionError =
                    prismaError.code === 'P1001' ||
                    prismaError.code === 'P2024' ||
                    prismaError.name === 'PrismaClientInitializationError' ||
                    prismaError.message?.includes('Can\'t reach database server') ||
                    prismaError.message?.includes('Can\'t reach database') ||
                    prismaError.message?.includes('database server is running');

                // ✅ OPTIMIZACIÓN VERCEL: Delays reducidos para serverless (cold starts ~500ms)
                // Antes: 1s-15s → Ahora: 200ms-1.5s (compatible con maxDuration: 30s)
                
                // ✅ Estrategia 1: Timeout de conexión (P2024) - delay corto
                if (prismaError.code === 'P2024') {
                    if (process.env.NODE_ENV !== 'production') {
                        console.warn(`⚠️ Prisma connection timeout (attempt ${retryCount}/${maxRetries}), retrying...`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 300 * retryCount)); // 300ms, 600ms, 900ms
                    continue;
                }

                // ✅ Estrategia 2: Servidor inaccesible (P1001 o PrismaClientInitializationError)
                if (isConnectionError) {
                    if (process.env.NODE_ENV !== 'production') {
                        console.warn(`⚠️ Database server unreachable (attempt ${retryCount}/${maxRetries}):`, {
                            code: prismaError.code,
                            name: prismaError.name,
                            message: prismaError.message?.substring(0, 100)
                        });
                    }
                    await new Promise(resolve => setTimeout(resolve, 500 * retryCount)); // 500ms, 1s, 1.5s
                    continue;
                }

                // ✅ Estrategia 3: Engine no conectado aún - delay moderado
                if (prismaError.message?.includes('Engine is not yet connected') ||
                    prismaError.message?.includes('not yet connected')) {
                    if (process.env.NODE_ENV !== 'production') {
                        console.warn(`⚠️ Prisma engine not ready yet (attempt ${retryCount}/${maxRetries}), waiting...`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 500 * retryCount)); // 500ms, 1s, 1.5s
                    continue;
                }

                // ✅ Estrategia 4: Otros errores de Prisma - reintentar rápido
                if (prismaError.code?.startsWith('P')) {
                    if (process.env.NODE_ENV !== 'production') {
                        console.warn(`⚠️ Prisma error ${prismaError.code} (attempt ${retryCount}/${maxRetries}), retrying...`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 200)); // 200ms fijo
                    continue;
                }

                // ✅ Estrategia 5: Error no relacionado con Prisma - lanzar inmediatamente
                if (process.env.NODE_ENV !== 'production') {
                    console.error('❌ Non-Prisma error in getCurrentOrg:', prismaError);
                }
                throw prismaError;
            }
        }

        // ✅ Si llegamos aquí después de maxRetries, lanzar error con contexto
        if (!organizations) {
            const errorMsg = `Database connection failed after ${maxRetries} attempts. Please check your connection and try again.`;
            if (process.env.NODE_ENV !== 'production') {
                console.error('❌', errorMsg);
            }
            throw new Error(errorMsg);
        }

        if (!organizations || organizations.length === 0) {
            // ✅ AUTO-CREACIÓN: Usuario sin organización - crear automáticamente
            console.log('⚠️ [getCurrentOrg] Usuario sin organización, auto-creando...');
            
            try {
                const orgSlug = `personal-${user.id.substring(0, 8)}`;
                const userEmail = user.email || 'Usuario';
                const orgName = `${userEmail}'s Workspace`;

                const newOrg = await prisma.$transaction(async (tx) => {
                    const org = await tx.organizations.create({
                        data: {
                            name: orgName,
                            slug: orgSlug,
                        },
                    });

                    await tx.org_members.create({
                        data: {
                            org_id: org.id,
                            user_id: user.id,
                            role: 'owner',
                        },
                    });

                    return org;
                });

                console.log('✅ [getCurrentOrg] Organización auto-creada:', { orgId: newOrg.id, slug: orgSlug });
                
                // Retornar la org recién creada
                return { user, currentOrg: newOrg };
            } catch (autoCreateError) {
                console.error('❌ [getCurrentOrg] Error auto-creando organización:', autoCreateError);
                // Si falla la auto-creación, redirigir al onboarding manual como último recurso
                redirect('/onboarding/organization');
            }
        }

        // ✅ CORRECCIÓN CRÍTICA: Leer preferencia de organización activa del usuario
        // La función switch_organization guarda en user_preferences.active_org_id
        let activeOrgId: string | null = null;
        try {
            const { data: preferences } = await supabase
                .from('user_preferences')
                .select('active_org_id')
                .eq('user_id', user.id)
                .single();
            
            activeOrgId = preferences?.active_org_id || null;
        } catch (prefError) {
            // Si no hay preferencias guardadas, usar fallback
            if (process.env.NODE_ENV !== 'production') {
                console.warn('No user preferences found, using default organization');
            }
        }

        // Buscar la organización activa en el array de membresías
        let currentOrg;
        
        if (activeOrgId) {
            // Buscar la org preferida del usuario
            const activeOrgMembership = organizations.find(
                (m: any) => m.organizations?.id === activeOrgId
            );
            currentOrg = (activeOrgMembership as any)?.organizations;
        }
        
        // Fallback: Si no hay preferencia o la org ya no es válida, usar la primera
        if (!currentOrg) {
            currentOrg = (organizations[0] as any)?.organizations;
        }

        if (!currentOrg) {
            // ✅ CASO RARO: Tiene membership pero la org no existe (datos corruptos)
            // Intentar auto-crear una nueva organización
            console.warn('⚠️ [getCurrentOrg] Membership existe pero org no encontrada, auto-creando...');
            
            try {
                const orgSlug = `personal-${user.id.substring(0, 8)}-${Date.now()}`;
                const userEmail = user.email || 'Usuario';
                const orgName = `${userEmail}'s Workspace`;

                const newOrg = await prisma.$transaction(async (tx) => {
                    const org = await tx.organizations.create({
                        data: {
                            name: orgName,
                            slug: orgSlug,
                        },
                    });

                    await tx.org_members.create({
                        data: {
                            org_id: org.id,
                            user_id: user.id,
                            role: 'owner',
                        },
                    });

                    return org;
                });

                console.log('✅ [getCurrentOrg] Organización de recuperación creada:', { orgId: newOrg.id });
                return { user, currentOrg: newOrg };
            } catch (recoveryError) {
                console.error('❌ [getCurrentOrg] Error en recuperación:', recoveryError);
                redirect('/onboarding/organization');
            }
        }

        return { user, currentOrg };

    } catch (error: any) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('❌ An error occurred in getCurrentOrg:', error.message);
        }
        // Si es un error de timeout, el log lo mostrará.
        // Volver a lanzar el error para que la API que lo llama pueda manejarlo y devolver un 500.
        throw error;
    }
}


