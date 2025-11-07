/**
 * useClientValidation Hook
 * 
 * Hook para validar y crear clientes nuevos.
 * Soporta dos modos: modal elegante (nuevo) y window.confirm() (legacy).
 * 
 * @module hooks/useClientValidation
 */

import { useState, useCallback } from 'react';

/**
 * Estado del modal de validación de cliente
 */
export interface ClientValidationModalState {
    /** Si el modal está abierto */
    isOpen: boolean;
    /** Nombre del cliente a crear */
    clientName: string;
    /** Callback cuando se confirma la creación del cliente */
    onConfirm: (clientId: string) => void;
    /** Callback cuando se cierra el modal sin crear cliente */
    onCancel: () => void;
}

/**
 * Hook para validación y creación de clientes.
 * 
 * @param useModal - Si es `true`, usa modal elegante (no bloqueante). Si es `false`, usa `window.confirm()` (compatibilidad hacia atrás).
 * 
 * @returns Objeto con:
 * - `validateAndResolveClient`: Función para validar y crear clientes
 * - `isLoading`: Estado de carga durante la validación
 * - `modalState`: Estado del modal (solo si `useModal === true`)
 * - `setModalState`: Función para actualizar el estado del modal
 * 
 * @example
 * ```tsx
 * // Modo legacy (window.confirm)
 * const { validateAndResolveClient, isLoading } = useClientValidation(false);
 * 
 * // Modo modal (elegante)
 * const { validateAndResolveClient, isLoading, modalState, setModalState } = useClientValidation(true);
 * 
 * return (
 *   <>
 *     <ClientValidationModal
 *       clientName={modalState?.clientName || ''}
 *       isOpen={modalState?.isOpen || false}
 *       onClose={() => {
 *         modalState?.onCancel();
 *       }}
 *       onConfirm={(clientId) => {
 *         modalState?.onConfirm(clientId);
 *       }}
 *     />
 *   </>
 * );
 * ```
 */
export function useClientValidation(useModal: boolean = false) {
    const [isLoading, setIsLoading] = useState(false);
    const [modalState, setModalState] = useState<ClientValidationModalState | null>(null);

    // Función real de validación y creación de clientes
    const validateAndResolveClient = useCallback(async (clientName?: string): Promise<string | null> => {
        if (!clientName || clientName.trim() === '') {
            return null;
        }

        setIsLoading(true);
        
        try {
            // 1. Buscar cliente existente (igual que antes)
            const searchResponse = await fetch('/api/clients/list');
            if (searchResponse.ok) {
                const response = await searchResponse.json();
                const clients = response.clients; // Extraer el array de la propiedad 'clients'
                const existingClient = clients.find((c: any) => 
                    c.name.trim().toLowerCase() === clientName.trim().toLowerCase()
                );
                
                if (existingClient) {
                    console.log('✅ Cliente existente encontrado:', existingClient.name);
                    setIsLoading(false);
                    return existingClient.id;
                }
            }

            // 2. Cliente no existe - usar modal O window.confirm()
            if (useModal) {
                // Usar modal elegante (no bloqueante)
                return new Promise<string | null>((resolve, reject) => {
                    setModalState({
                        isOpen: true,
                        clientName: clientName.trim(),
                        onConfirm: (clientId) => {
                            setModalState(null);
                            setIsLoading(false);
                            resolve(clientId);
                        },
                        onCancel: () => {
                            setModalState(null);
                            setIsLoading(false);
                            reject(new Error('CLIENT_CREATION_CANCELLED'));
                        }
                    });
                });
            } else {
                // Usar window.confirm() (compatibilidad hacia atrás)
                const confirmed = window.confirm(
                    `El cliente "${clientName.trim()}" no existe entre tus clientes registrados, ¿Deseas crear a este nuevo cliente? (Deberás completar sus datos en tu gestor de clientes después)`
                );
                
                if (!confirmed) {
                    setIsLoading(false);
                    throw new Error('CLIENT_CREATION_CANCELLED');
                }
            }

            // 3. Crear nuevo cliente (solo si no usamos modal, ya que el modal lo maneja)
            // Si usamos modal, la creación se hace dentro del modal
            if (!useModal) {
                const createResponse = await fetch('/api/clients/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: clientName.trim()
                    })
                });

                if (!createResponse.ok) {
                    const errorData = await createResponse.json();
                    throw new Error(errorData.error || 'Error al crear cliente');
                }

                const data = await createResponse.json();
                console.log('✅ Cliente creado exitosamente:', data.id);
                setIsLoading(false);
                return data.id;
            }

            // Si usamos modal, retornamos null por ahora
            // El modal manejará la creación y llamará a onConfirm
            return null;

        } catch (error: any) {
            console.error('Error en validación de cliente:', error);
            setIsLoading(false);
            throw error;
        }
    }, [useModal]);

    return { 
        validateAndResolveClient, 
        isLoading,
        modalState,
        setModalState
    };
}