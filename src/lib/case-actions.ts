/**
 * Case Actions
 * 
 * Funciones compartidas para crear y manejar casos.
 * Extiende la funcionalidad de creación de casos con validación de cliente
 * y guardado de mensajes opcionales.
 * 
 * @module lib/case-actions
 */

import { generateInitialMessageFromBrief } from '@/lib/helpers/message-helpers';
import { CaseBrief } from '@/lib/types';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useUI } from '@/lib/ui/state';

/**
 * Opciones para crear un caso
 */
export interface CreateCaseOptions {
    /** Función opcional para validar y crear cliente */
    validateClient?: (name?: string) => Promise<string | null>;
    /** Función para establecer initialMessage en Zustand */
    setInitialMessage: (msg: string) => void;
    /** Función para establecer currentCaseId en Zustand */
    setCurrentCaseId: (id: string) => void;
    /** ID del caso actual (si existe) */
    currentCaseId?: string | null;
    /** Si se debe guardar el mensaje del usuario en la tabla messages */
    saveUserMessage?: boolean;
    /** Si se debe omitir la navegación automática (para aprobar antes de navegar) */
    skipNavigation?: boolean;
}

/**
 * Crea un caso si no existe, o retorna el ID del caso existente.
 * 
 * Esta función unifica la lógica de creación de casos para todos los botones
 * sincronizados ("Buscar Planes", "Aprobar", "Aprobar y Continuar Análisis").
 * 
 * @param briefData - Datos del brief del caso
 * @param router - Router de Next.js para navegación SPA
 * @param options - Opciones para crear el caso (validación de cliente, guardado de mensaje, etc.)
 * @returns ID del caso creado o existente
 * 
 * @throws {Error} Si falla la autenticación, creación del caso, o validación del cliente
 * 
 * @example
 * ```tsx
 * const router = useRouter();
 * const { setCurrentCaseId, setInitialMessage, currentCaseId } = useUI.getState();
 * const { validateAndResolveClient } = useClientValidation(true);
 * 
 * try {
 *   const caseId = await createCaseIfNeeded(
 *     briefData,
 *     router,
 *     {
 *       validateClient: validateAndResolveClient,
 *       setInitialMessage,
 *       setCurrentCaseId,
 *       currentCaseId,
 *       saveUserMessage: true,
 *     }
 *   );
 *   console.log('Caso creado:', caseId);
 * } catch (error) {
 *   console.error('Error:', error);
 * }
 * ```
 */
export async function createCaseIfNeeded(
    briefData: Partial<CaseBrief>,
    router: AppRouterInstance,
    options?: CreateCaseOptions
): Promise<string> {
    // Si ya existe caso, retornar ID
    if (options?.currentCaseId) {
        console.log('✅ Caso ya existe:', options.currentCaseId);
        return options.currentCaseId;
    }

    console.log('📝 No hay currentCaseId, creando caso...');

    // ✅ CORRECCIÓN CRÍTICA: Establecer caseApproving en el store    // ✅ FASE 5: Usar setApprovalPhase para control unificado
    useUI.getState().setApprovalPhase('processing');
    useUI.setState({ caseResolvingClient: true }); // Mantener para compatibilidad UI
    console.log('🔒 [case-actions] caseApproving establecido en true para sincronizar botones');

    try {
        // 1. Validar cliente (opcional)
        let clientId: string | null = null;
        if (options?.validateClient && briefData.clientName) {
            try {
                clientId = await options.validateClient(briefData.clientName);
                console.log('✅ Cliente validado:', clientId);
            } catch (error: any) {
                if (error.message !== 'CLIENT_CREATION_CANCELLED') {
                    console.error('❌ Error validando cliente:', error);
                }
                // Continuar sin cliente si se cancela o falla
                // El error de cancelación se propaga para que el componente lo maneje
                if (error.message === 'CLIENT_CREATION_CANCELLED') {
                    useUI.setState({ caseApproving: false });
                    throw error;
                }
            }
        }

        // 2. Obtener información del usuario
        const authResponse = await fetch('/api/auth/me');
        if (!authResponse.ok) {
            useUI.setState({ caseApproving: false });
            throw new Error('No se pudo obtener información del usuario');
        }
        const { orgId, userId } = await authResponse.json();
        console.log('👤 Usuario autenticado:', { orgId, userId });

        // 3. Crear el caso con tempUploads si existen
        const tempUploads = (briefData as any).tempUploads || [];
        console.log('📎 [case-actions] Creando caso con tempUploads:', tempUploads.length);

        // ✅ CORRECCIÓN CRÍTICA: Asegurar que freeText esté presente en briefData
        // Si no está en briefData, intentar obtenerlo del estado global como último recurso
        let finalFreeText = briefData.freeText;
        if (!finalFreeText || finalFreeText.trim() === '') {
            const globalBrief = useUI.getState().brief;
            finalFreeText = globalBrief.freeText || '';
            console.log('⚠️ [case-actions] freeText no encontrado en briefData, usando del estado global:', finalFreeText);
        }
        console.log('📝 [case-actions] freeText final que se enviará al API:', finalFreeText);

        const response = await fetch('/api/cases/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orgId,
                userId,
                clientName: briefData.clientName,
                selectedClientId: clientId, // ✅ Incluir clientId validado
                businessType: briefData.businessType,
                employees: briefData.employees,
                status: 'draft',
                stage: 'initial',
                priority: 'medium',
                briefData: {
                    freeText: finalFreeText, // ✅ CORRECCIÓN: Usar finalFreeText garantizado
                    businessType: briefData.businessType,
                    employees: briefData.employees,
                    coverage: briefData.coverage,
                    selectedClientId: clientId, // ✅ También en briefData
                },
                insurance_category: briefData.insurance_category,
                max_budget: briefData.max_budget,
                budget_currency: briefData.budget_currency,
                required_coverages: briefData.required_coverages,
                client_profile: briefData.client_profile,
                tempUploads: tempUploads,
            }),
        });

        if (!response.ok) {
            useUI.setState({ caseApproving: false });

            // ✅ CORRECCIÓN: Leer el error de la respuesta de manera segura
            let errorMessage = 'Error al crear el caso';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch {
                // Si no se puede parsear JSON, usar el statusText
                errorMessage = response.statusText || errorMessage;
            }

            throw new Error(errorMessage);
        }

        const result = await response.json();
        const caseId = result.caseId;
        console.log('✅ Caso creado exitosamente:', caseId);

        // ✅ OPTIMIZACIÓN CRÍTICA: Actualizar lista de cases INMEDIATAMENTE después de crear
        // Esto asegura que el nuevo case aparezca inmediatamente en el panel izquierdo
        try {
            await useUI.getState().refreshCases();
            console.log('✅ [case-actions] Lista de cases actualizada después de crear caso');
        } catch (refreshError) {
            console.warn('⚠️ [case-actions] Error actualizando lista de cases (no crítico):', refreshError);
            // No fallar el flujo completo si solo falla la actualización de la lista
        }

        // ✅ FASE 6: Limpiar brief.tempUploads después de crear caso (ya se convirtieron en artifacts)
        useUI.getState().setBrief({ tempUploads: [] } as any);
        console.log('🧹 [case-actions] brief.tempUploads limpiado después de crear caso');

        // 4. Establecer estado
        if (options?.setCurrentCaseId) {
            options.setCurrentCaseId(caseId);
            console.log('💾 currentCaseId establecido en:', caseId);
        }

        // 5. Generar initialMessage (solo si NO se omite la navegación, porque si se omite, approveCurrentCase enviará el mensaje)
        const initialMessage = generateInitialMessageFromBrief(briefData);
        // ✅ CORRECCIÓN: Solo establecer initialMessage si NO se omite la navegación
        // Si skipNavigation=true, approveCurrentCase enviará el mensaje automáticamente
        if (options?.setInitialMessage && !options?.skipNavigation) {
            options.setInitialMessage(initialMessage);
            console.log('📝 [case-actions] InitialMessage establecido:', initialMessage);
        } else if (options?.skipNavigation) {
            console.log('⏭️ [case-actions] InitialMessage omitido (skipNavigation=true, approveCurrentCase enviará el mensaje)');
        }

        // 6. Guardar mensaje del usuario (opcional)
        // ✅ CORRECCIÓN: Solo guardar si NO se omite la navegación, porque approveCurrentCase ya enviará el mensaje
        if (options?.saveUserMessage && initialMessage && !options?.skipNavigation) {
            try {
                const messageResponse = await fetch(`/api/cases/${caseId}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role: 'user',
                        content: initialMessage,
                        metadata: {
                            timestamp: new Date().toISOString(),
                            source: 'form',
                            generated: true
                        }
                    })
                });

                if (!messageResponse.ok) {
                    console.warn('⚠️ No se pudo guardar mensaje del usuario en BD');
                } else {
                    console.log('✅ Mensaje del usuario guardado en messages como primer mensaje del caso');
                }
            } catch (error) {
                console.error('❌ Error guardando mensaje del usuario:', error);
                // No fallar el flujo completo si solo falla el guardado del mensaje
            }
        }

        // 7. Marcar timestamp para HomeClient (si aplica)
        if (typeof window !== 'undefined') {
            (window as any).lastCaseCreation = Date.now();
        }

        // ✅ FASE 19.1: Análisis Pre-Navegación
        // Esto asegura que el primer mensaje tenga referencias disponibles
        if (!options?.skipNavigation) {
            console.log('📄 [case-actions] Verificando PDFs para análisis pre-navegación...');
            try {
                // Obtener artifacts del caso recién creado
                const artifactsResponse = await fetch(`/api/cases/${caseId}/artifacts`);

                if (artifactsResponse.ok) {
                    const { artifacts } = await artifactsResponse.json();
                    console.log(`📎 [case-actions] ${artifacts.length} artifacts encontrados`);

                    // Filtrar PDFs
                    const pdfArtifacts = artifacts.filter((a: any) =>
                        a.contentType === 'application/pdf' ||
                        a.fileName?.toLowerCase().endsWith('.pdf')
                    );

                    if (pdfArtifacts.length > 0) {
                        console.log(`🤖 [case-actions] Analizando ${pdfArtifacts.length} PDF(s) antes de navegar...`);

                        // Analizar el primer PDF
                        const firstPdf = pdfArtifacts[0];
                        const { analyzePolicyArtifact } = useUI.getState();

                        try {
                            const analysis = await analyzePolicyArtifact(firstPdf.id);
                            console.log('✅ [case-actions] Análisis completado ANTES de navegar:', analysis.id);
                            console.log(`   → ${analysis.pageReferences?.length || 0} referencias creadas`);
                        } catch (analysisError: any) {
                            console.error('❌ [case-actions] Error en análisis pre-navegación:', analysisError.message);
                            console.warn('⚠️ [case-actions] Continuando sin análisis (primer mensaje no tendrá referencias)');
                            // No fallar todo el flujo, solo continuar sin análisis
                        }
                    } else {
                        console.log('ℹ️ [case-actions] No hay PDFs para analizar');
                    }
                } else {
                    console.warn('⚠️ [case-actions] No se pudieron obtener artifacts');
                }
            } catch (error: any) {
                console.error('❌ [case-actions] Error obteniendo artifacts para análisis:', error.message);
                // No fallar todo el flujo
            }
        }

        // 8. Navegar al caso creado (SPA navigation) - Solo si no se omite la navegación
        if (!options?.skipNavigation) {
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
            const localeMatch = currentPath.match(/\/(es|en)\//);
            const locale = localeMatch ? localeMatch[1] : 'es';

            const targetUrl = `/${locale}/agent/${caseId}`;
            console.log(`✅ [case-actions] Navigating to: ${targetUrl} (SPA navigation)`);

            router.push(targetUrl);

            // ✅ CORRECCIÓN CRÍTICA: Marcar aprobación como completada
            // Esto hace que los botones DESAPAREZCAN permanentemente
            setTimeout(() => {
                useUI.getState().setApprovalPhase('completed');
                console.log('✅ [case-actions] Aprobación completada - botones desaparecerán permanentemente');
            }, 100);
        } else {
            console.log('⏭️ [case-actions] Navegación omitida (skipNavigation=true)');
        }

        return caseId;

    } catch (error: any) {
        // ✅ CORRECCIÓN: Resetear approvalPhase si hay error
        useUI.getState().setApprovalPhase('pending');
        console.error('❌ [case-actions] Error creando caso:', error);
        throw error;
    }
}

