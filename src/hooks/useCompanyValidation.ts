/**
 * useCompanyValidation Hook
 * 
 * Hook para validar y crear empresas nuevas.
 * Soporta dos modos: modal elegante (nuevo) y window.confirm() (legacy).
 * 
 * @module hooks/useCompanyValidation
 */

import { useState, useCallback } from 'react';
import { useUI } from '@/lib/ui/state';

/**
 * Estado del modal de validación de empresa
 */
export interface CompanyValidationModalState {
    /** Si el modal está abierto */
    isOpen: boolean;
    /** Nombre de la empresa a crear */
    companyName: string;
    /** Callback cuando se confirma la creación de la empresa */
    onConfirm: (companyId: string) => void;
    /** Callback cuando se cierra el modal sin crear empresa */
    onCancel: () => void;
}

/**
 * Hook para validación y creación de empresas.
 * 
 * @param useModal - Si es `true`, usa modal elegante (no bloqueante). Si es `false`, usa `window.confirm()` (compatibilidad hacia atrás).
 * 
 * @returns Objeto con:
 * - `validateAndResolveCompany`: Función para validar y crear empresas
 * - `isLoading`: Estado de carga durante la validación
 * - `modalState`: Estado del modal (solo si `useModal === true`)
 * - `setModalState`: Función para actualizar el estado del modal
 * 
 * @example
 * ```tsx
 * // Modo legacy (window.confirm)
 * const { validateAndResolveCompany, isLoading } = useCompanyValidation(false);
 * 
 * // Modo modal (elegante)
 * const { validateAndResolveCompany, isLoading, modalState, setModalState } = useCompanyValidation(true);
 * ```
 */
export function useCompanyValidation(useModal: boolean = false) {
    const [isLoading, setIsLoading] = useState(false);
    const [modalState, setModalState] = useState<CompanyValidationModalState | null>(null);

    // Función real de validación y creación de empresas
    const validateAndResolveCompany = useCallback(async (companyName?: string): Promise<string | null> => {
        if (!companyName || companyName.trim() === '') {
            return null;
        }

        setIsLoading(true);
        useUI.setState({ caseResolvingClient: true }); // Reutilizamos el estado global (representa "resolviendo sujeto")
        
        try {
            // 1. Buscar empresa existente
            const searchResponse = await fetch('/api/companies/list');
            if (searchResponse.ok) {
                const response = await searchResponse.json();
                const companies = response.companies;
                const existingCompany = companies.find((c: any) => 
                    c.name.trim().toLowerCase() === companyName.trim().toLowerCase()
                );
                
                if (existingCompany) {
                    console.log('✅ Empresa existente encontrada:', existingCompany.name);
                    setIsLoading(false);
                    useUI.setState({ caseResolvingClient: false });
                    return existingCompany.id;
                }
            }

            // 2. Empresa no existe - usar modal O window.confirm()
            if (useModal) {
                // Usar modal elegante (no bloqueante)
                return new Promise<string | null>((resolve, reject) => {
                    setModalState({
                        isOpen: true,
                        companyName: companyName.trim(),
                        onConfirm: (companyId) => {
                            setModalState(null);
                            setIsLoading(false);
                            useUI.setState({ caseResolvingClient: false });
                            resolve(companyId);
                        },
                        onCancel: () => {
                            setModalState(null);
                            setIsLoading(false);
                            useUI.setState({ caseResolvingClient: false });
                            reject(new Error('COMPANY_CREATION_CANCELLED'));
                        }
                    });
                });
            } else {
                // Usar window.confirm() (compatibilidad hacia atrás)
                const confirmed = window.confirm(
                    `La empresa "${companyName.trim()}" no existe entre tus empresas registradas, ¿Deseas crear esta nueva empresa? (Deberás completar sus datos en tu gestor de empresas después)`
                );
                
                if (!confirmed) {
                    setIsLoading(false);
                    useUI.setState({ caseResolvingClient: false });
                    throw new Error('COMPANY_CREATION_CANCELLED');
                }
            }

            // 3. Crear nueva empresa (solo si no usamos modal)
            if (!useModal) {
                const createResponse = await fetch('/api/companies/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        legalName: companyName.trim(),
                        // Valores mínimos requeridos - el usuario completará después
                        nit: '000000000-0', // Placeholder
                        companyType: 'sas'
                    })
                });

                if (!createResponse.ok) {
                    const errorData = await createResponse.json();
                    throw new Error(errorData.error || 'Error al crear empresa');
                }

                const data = await createResponse.json();
                console.log('✅ Empresa creada exitosamente:', data.id);
                setIsLoading(false);
                useUI.setState({ caseResolvingClient: false });
                return data.id;
            }

            return null;

        } catch (error: any) {
            console.error('Error en validación de empresa:', error);
            setIsLoading(false);
            useUI.setState({ caseResolvingClient: false });
            throw error;
        }
    }, [useModal]);

    return { 
        validateAndResolveCompany, 
        isLoading,
        modalState,
        setModalState
    };
}
