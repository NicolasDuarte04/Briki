// =====================================================
// DEV ACTIONS - ACCIONES PELIGROSAS SOLO PARA DESARROLLO
// =====================================================
// Este archivo contiene acciones de servidor que solo deben
// ejecutarse en entorno de desarrollo. Incluyen operaciones
// destructivas que pueden eliminar datos permanentemente.
//
// ⚠️ ADVERTENCIA: Estas funciones están protegidas para ejecutarse
// ÚNICAMENTE en NODE_ENV='development'. Cualquier intento de
// ejecución en producción resultará en un error.
// =====================================================

'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

/**
 * Respuesta estructurada para las server actions
 */
interface ActionResponse {
  success: boolean
  message: string
}

// =====================================================
// FUNCIÓN: deleteUserCompletely
// =====================================================

/**
 * [DEV-ONLY] Elimina completamente un usuario del sistema.
 * 
 * Esta función realiza las siguientes operaciones:
 * 1. Verifica que se ejecute solo en desarrollo
 * 2. Valida las credenciales de Supabase
 * 3. Crea un cliente admin de Supabase
 * 4. Elimina el usuario de auth.users
 * 5. Por CASCADE, también elimina automáticamente:
 *    - public.profiles (FK: id → auth.users.id ON DELETE CASCADE)
 *    - public.org_members (FK: user_id → auth.users.id ON DELETE CASCADE)
 *    - Cualquier otra relación con ON DELETE CASCADE
 * 6. Revalida el layout para reflejar cambios en la UI
 * 
 * ARQUITECTURA DE CASCADA:
 * ```
 * auth.users
 *   ├─► public.profiles (ON DELETE CASCADE)
 *   ├─► public.org_members (ON DELETE CASCADE)
 *   ├─► auth.identities (ON DELETE CASCADE)
 *   ├─► auth.sessions (ON DELETE CASCADE)
 *   └─► auth.mfa_factors (ON DELETE CASCADE)
 * ```
 * 
 * CASOS DE USO:
 * - Desarrollo: Limpiar usuarios de prueba
 * - Testing: Resetear estado entre tests
 * - Debugging: Eliminar usuarios problemáticos
 * 
 * SEGURIDAD:
 * - Solo se ejecuta en NODE_ENV='development'
 * - Requiere SUPABASE_SERVICE_ROLE_KEY
 * - No expone información sensible en errores
 * 
 * @param userId - El UUID del usuario a eliminar
 * @returns ActionResponse con el resultado de la operación
 * 
 * @example
 * ```typescript
 * const result = await deleteUserCompletely('123e4567-e89b-12d3-a456-426614174000');
 * if (result.success) {
 *   console.log('Usuario eliminado correctamente');
 * }
 * ```
 * 
 * @throws Error si las variables de entorno no están configuradas
 */
export async function deleteUserCompletely(userId: string): Promise<ActionResponse> {
  // =====================================================
  // VALIDACIÓN 1: Entorno de desarrollo
  // =====================================================
  if (process.env.NODE_ENV !== 'development') {
    console.error('[SECURITY] Intento de ejecutar deleteUserCompletely en producción bloqueado');
    return { 
      success: false, 
      message: 'This action is disabled in production for security reasons.' 
    };
  }

  // =====================================================
  // VALIDACIÓN 2: Variables de entorno
  // =====================================================
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[CONFIG] Missing Supabase credentials');
    throw new Error(
      'Supabase URL or Service Role Key are not defined in environment variables. ' +
      'Please check your .env.local file.'
    );
  }

  // =====================================================
  // VALIDACIÓN 3: UUID válido
  // =====================================================
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return {
      success: false,
      message: 'Invalid user ID format. Must be a valid UUID.'
    };
  }

  // =====================================================
  // INICIALIZACIÓN: Cliente Admin de Supabase
  // =====================================================
  // Se crea un cliente con privilegios de administrador
  // usando el Service Role Key para poder eliminar usuarios
  const supabaseAdmin = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    console.log(`[DEV-ACTION] Iniciando eliminación de usuario: ${userId}`);

    // =====================================================
    // OPERACIÓN CRÍTICA: Eliminación del usuario
    // =====================================================
    // Esta es la única llamada necesaria. El borrado en cascada
    // se encarga automáticamente de eliminar todos los datos relacionados
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('[DEV-ACTION] Error al eliminar usuario:', error.message);
      throw error;
    }

    console.log(`[DEV-ACTION] Usuario ${userId} eliminado exitosamente`);

    // =====================================================
    // LIMPIEZA: Revalidar rutas
    // =====================================================
    // Forzar que Next.js regenere las páginas para reflejar
    // que el usuario ya no existe
    revalidatePath('/', 'layout');

    return { 
      success: true, 
      message: 'User and all associated data completely deleted from the system.' 
    };

  } catch (error: any) {
    // =====================================================
    // MANEJO DE ERRORES
    // =====================================================
    const errorMessage = error?.message || 'Unknown error occurred';
    
    console.error('[DEV-ACTION] Failed to delete user:', {
      userId,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    return { 
      success: false, 
      message: `Failed to delete user: ${errorMessage}` 
    };
  }
}

// =====================================================
// FUNCIÓN AUXILIAR: Verificar si el usuario existe
// =====================================================

/**
 * [DEV-ONLY] Verifica si un usuario existe en el sistema
 * 
 * @param userId - El UUID del usuario a verificar
 * @returns Promise<boolean> - true si el usuario existe
 */
export async function userExists(userId: string): Promise<boolean> {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return false;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    return !error && !!data.user;
  } catch {
    return false;
  }
}

