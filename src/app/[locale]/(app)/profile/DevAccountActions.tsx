// =====================================================
// DEV ACCOUNT ACTIONS - ZONA DE PELIGRO (SOLO DESARROLLO)
// =====================================================
// Este componente proporciona acciones destructivas que solo
// están disponibles en entorno de desarrollo para facilitar
// el testing y debugging.
//
// ⚠️ ADVERTENCIA: Este componente NO se renderiza en producción
// =====================================================

'use client'

import { useState } from 'react';
import { deleteUserCompletely } from '@/app/actions/devActions';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertCircle, Trash2, Loader2 } from 'lucide-react';

interface DevAccountActionsProps {
  userId: string;
}

/**
 * Componente que renderiza acciones peligrosas de desarrollo
 * 
 * FUNCIONALIDAD:
 * - Botón para eliminar completamente una cuenta de usuario
 * - Confirmación doble para evitar eliminaciones accidentales
 * - Feedback visual durante la operación
 * - Redirección automática tras eliminación exitosa
 * 
 * SEGURIDAD:
 * - Solo se renderiza en NODE_ENV='development'
 * - La server action también valida el entorno
 * - Confirmaciones múltiples para evitar errores
 * 
 * @param userId - UUID del usuario actual
 */
export function DevAccountActions({ userId }: DevAccountActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Handler para la eliminación del usuario
   * 
   * FLUJO:
   * 1. Primera confirmación: window.confirm
   * 2. Segunda confirmación: re-confirmación explícita
   * 3. Llamada a la server action
   * 4. Feedback visual con toast
   * 5. Redirección a login
   */
  const handleDelete = async () => {
    // Primera confirmación
    const firstConfirm = window.confirm(
      '⚠️ ADVERTENCIA: Esta acción eliminará permanentemente:\n\n' +
      '- Tu usuario de auth.users\n' +
      '- Tu perfil de public.profiles\n' +
      '- Todas tus membresías de organizaciones\n' +
      '- Todos los datos asociados\n\n' +
      '¿Estás absolutamente seguro?'
    );

    if (!firstConfirm) {
      return;
    }

    // Segunda confirmación (más explícita)
    const secondConfirm = window.confirm(
      '⚠️ ÚLTIMA ADVERTENCIA ⚠️\n\n' +
      'Esta acción NO se puede deshacer.\n' +
      'El usuario será eliminado PERMANENTEMENTE.\n\n' +
      'Escribe "CONFIRMAR" en tu mente y presiona OK para continuar.'
    );

    if (!secondConfirm) {
      return;
    }

    // Proceder con la eliminación
    setIsDeleting(true);
    
    try {
      // Llamar a la server action
      const result = await deleteUserCompletely(userId);

      if (result.success) {
        // Éxito: mostrar mensaje y redirigir
        toast.success('Cuenta eliminada correctamente', {
          description: 'Serás redirigido a la página de login en 2 segundos...',
        });

        // Esperar 2 segundos para que el usuario vea el mensaje
        setTimeout(() => {
          // Forzar recarga completa para limpiar estado de autenticación
          window.location.href = '/login';
        }, 2000);
      } else {
        // Error de la server action
        toast.error('Error al eliminar cuenta', {
          description: result.message,
        });
        setIsDeleting(false);
      }
    } catch (error: any) {
      // Error inesperado
      console.error('[DevAccountActions] Error al eliminar usuario:', error);
      toast.error('Error inesperado', {
        description: error?.message || 'No se pudo completar la operación',
      });
      setIsDeleting(false);
    }
  };

  // =====================================================
  // RENDERIZADO CONDICIONAL
  // =====================================================
  // Solo renderizar en desarrollo
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="mt-12 p-6 border-2 border-red-200 rounded-lg bg-red-50">
      {/* Header de la zona de peligro */}
      <div className="flex items-start gap-3 mb-4">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-lg text-red-900">
            Zona de Peligro (Solo Desarrollo)
          </h3>
          <p className="text-sm text-red-700 mt-1">
            Estas acciones solo están disponibles en entorno de desarrollo.
            Son destructivas y no se pueden deshacer.
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-red-200 my-4" />

      {/* Sección de eliminación de cuenta */}
      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-sm text-red-900 mb-1">
            Eliminar Cuenta Completamente
          </h4>
          <p className="text-xs text-red-700 mb-3">
            Esta acción eliminará permanentemente:
          </p>
          <ul className="text-xs text-red-700 space-y-1 mb-4 pl-4">
            <li className="flex items-start gap-2">
              <span className="text-red-600">•</span>
              <span>Usuario de <code className="bg-red-100 px-1 rounded">auth.users</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600">•</span>
              <span>Perfil de <code className="bg-red-100 px-1 rounded">public.profiles</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600">•</span>
              <span>Membresías de <code className="bg-red-100 px-1 rounded">public.org_members</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600">•</span>
              <span>Todos los datos asociados (por CASCADE)</span>
            </li>
          </ul>
          <p className="text-xs text-red-700 font-medium mb-3">
            ID del usuario: <code className="bg-red-100 px-1 py-0.5 rounded text-[10px]">{userId}</code>
          </p>
        </div>

        {/* Botón de eliminación */}
        <Button 
          variant="destructive" 
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full sm:w-auto"
        >
          {isDeleting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Eliminando...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar Cuenta Permanentemente
            </>
          )}
        </Button>

        {/* Nota adicional */}
        <p className="text-[10px] text-red-600 italic">
          Útil para: limpiar usuarios de prueba, resetear estado entre tests, debugging de auth
        </p>
      </div>
    </div>
  );
}

