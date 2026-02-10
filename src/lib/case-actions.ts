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
    /** Locale actual para navegación correcta ('en' | 'es') - REQUERIDO para consistencia i18n */
    locale?: 'en' | 'es';
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
 * @returns Objeto con caseId y clientId (el cliente validado/creado)
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
 *   // ✅ createCaseIfNeeded retorna { caseId, clientId }
 *   // clientId ya está validado, NO re-validar para evitar doble modal
 *   const { caseId, clientId } = await createCaseIfNeeded(
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
 *   console.log('Caso creado:', caseId, 'Cliente:', clientId);
 * } catch (error) {
 *   console.error('Error:', error);
 * }
 * ```
 */
/**
 * Resultado de la creación de un caso
 */
export interface CreateCaseResult {
    /** ID del caso creado o existente */
    caseId: string;
    /** ID del cliente validado/creado (null si no había cliente) */
    clientId: string | null;
}

export async function createCaseIfNeeded(
    briefData: Partial<CaseBrief>,
    router: AppRouterInstance,
    options?: CreateCaseOptions
): Promise<CreateCaseResult> {
    // Si ya existe caso, retornar ID (clientId se obtiene del brief)
    if (options?.currentCaseId) {
        console.log('✅ Caso ya existe:', options.currentCaseId);
        const existingClientId = (briefData as any).selectedClientId || null;
        return { caseId: options.currentCaseId, clientId: existingClientId };
    }

    console.log('📝 No hay currentCaseId, creando caso...');

    // ✅ CORRECCIÓN CRÍTICA: Establecer caseApproving en el store    // ✅ FASE 5: Usar setApprovalPhase para control unificado
    useUI.getState().setApprovalPhase('processing');
    useUI.setState({ caseResolvingClient: true }); // Mantener para compatibilidad UI
    console.log('🔒 [case-actions] caseApproving establecido en true para sincronizar botones');

    try {
        // 1. Validar cliente (opcional) - ÚNICA validación de todo el flujo
        let clientId: string | null = null;
        if (options?.validateClient && briefData.clientName) {
            try {
                clientId = await options.validateClient(briefData.clientName);
                console.log('✅ Cliente validado:', clientId);
                
                // ✅ CORRECCIÓN: Guardar clientId en brief para que otros componentes lo usen
                // Esto evita que se vuelva a validar el mismo cliente
                if (clientId) {
                    useUI.setState({
                        brief: {
                            ...useUI.getState().brief,
                            selectedClientId: clientId
                        }
                    });
                    console.log('✅ [case-actions] brief.selectedClientId actualizado:', clientId);
                }
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

        // 3. Crear el caso con tempUploads y linkedPolicyIds/linkedQuoteIds si existen
        const tempUploads = (briefData as any).tempUploads || [];
        const linkedPolicyIds = briefData.linkedPolicyIds || [];
        const linkedQuoteIds = briefData.linkedQuoteIds || [];
        console.log('📎 [case-actions] Creando caso con tempUploads:', tempUploads.length, 'linkedPolicyIds:', linkedPolicyIds.length, 'linkedQuoteIds:', linkedQuoteIds.length);
        // 🔍 DEBUG: Log detallado de linkedPolicyIds y linkedQuoteIds que se envían al backend
        console.log('🔍 [case-actions] linkedPolicyIds EXACTOS que se enviarán:', JSON.stringify(linkedPolicyIds));
        console.log('🔍 [case-actions] linkedQuoteIds EXACTOS que se enviarán:', JSON.stringify(linkedQuoteIds));
        console.log('🔍 [case-actions] briefData.linkedPolicyIds raw:', JSON.stringify(briefData.linkedPolicyIds));
        console.log('🔍 [case-actions] briefData.linkedQuoteIds raw:', JSON.stringify(briefData.linkedQuoteIds));

        // ✅ CORRECCIÓN CRÍTICA: Asegurar que freeText esté presente en briefData
        // Si no está en briefData, intentar obtenerlo del estado global como último recurso
        let finalFreeText = briefData.freeText;
        if (!finalFreeText || finalFreeText.trim() === '') {
            const globalBrief = useUI.getState().brief;
            finalFreeText = globalBrief.freeText || '';
            console.log('⚠️ [case-actions] freeText no encontrado en briefData, usando del estado global:', finalFreeText);
        }
        console.log('📝 [case-actions] freeText final que se enviará al API:', finalFreeText);

        // ✅ FASE CLIENTE/EMPRESA: Determinar qué ID enviar según subjectType
        const subjectType = (briefData as any).subjectType || 'client';
        const selectedCompanyId = (briefData as any).selectedCompanyId || null;

        const response = await fetch('/api/cases/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orgId,
                userId,
                clientName: briefData.clientName,
                selectedClientId: subjectType === 'client' ? clientId : null, // Solo si es cliente
                selectedCompanyId: subjectType === 'company' ? selectedCompanyId : null, // ✅ Solo si es empresa
                subjectType, // ✅ FASE CLIENTE/EMPRESA: Tipo de sujeto
                businessType: briefData.businessType,
                employees: briefData.employees,
                status: 'draft',
                stage: 'initial',
                priority: 'medium',
                briefData: {
                    freeText: finalFreeText,
                    businessType: briefData.businessType,
                    employees: briefData.employees,
                    coverage: briefData.coverage,
                    selectedClientId: subjectType === 'client' ? clientId : null,
                    selectedCompanyId: subjectType === 'company' ? selectedCompanyId : null,
                    subjectType, // ✅ También en briefData para el agente
                },
                insurance_category: briefData.insurance_category,
                max_budget: briefData.max_budget,
                budget_currency: briefData.budget_currency,
                required_coverages: briefData.required_coverages,
                client_profile: briefData.client_profile,
                tempUploads: tempUploads,
                linkedPolicyIds: linkedPolicyIds,
                linkedQuoteIds: linkedQuoteIds,
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

        // ✅ FASE REESTRUCTURACIÓN v2: NO generar initialMessage aquí
        // El mensaje de bienvenida ahora se genera en approveCurrentCase() en state.ts
        // ConversationPane ya no procesa initialMessage automáticamente
        console.log('⏭️ [case-actions] Omitiendo initialMessage - approveCurrentCase lo maneja');

        // 6. Marcar timestamp para HomeClient (si aplica)
        if (typeof window !== 'undefined') {
            (window as any).lastCaseCreation = Date.now();
        }

        // ✅ FASE REESTRUCTURACIÓN: Análisis automático ELIMINADO
        // El usuario ahora inicia manualmente el análisis desde el tab "Pólizas"
        // Esto permite:
        // 1. Creación de casos más rápida (sin esperar análisis de IA)
        // 2. Control del usuario sobre qué póliza analizar primero
        // 3. Preparación para sistema de workers/colas
        console.log('📄 [case-actions] Análisis automático deshabilitado - usuario iniciará desde tab Pólizas');

        // 7. Navegar al caso creado (SPA navigation) - Solo si no se omite la navegación
        if (!options?.skipNavigation) {
            // ✅ CORRECCIÓN: Usar locale del options en lugar de regex para consistencia i18n
            const locale = options?.locale || 'en';

            const targetUrl = `/${locale}/agent/${caseId}`;
            console.log(`✅ [case-actions] Navigating to: ${targetUrl} (SPA navigation)`);

            // ✅ TRANSICIÓN ATÓMICA: Guardar flag para que HomeClient complete la aprobación
            // Esto evita el "parpadeo" del formulario y el "refresco" del mensaje
            // El overlay permanece activo hasta que HomeClient procese el caso
            if (typeof window !== 'undefined') {
                try {
                    sessionStorage.setItem('pendingCaseApproval', caseId);
                    console.log('🔒 [case-actions] pendingCaseApproval guardado para transición atómica');
                } catch (e) {
                    console.warn('⚠️ [case-actions] sessionStorage no disponible, usando fallback');
                }
            }

            // ✅ TRANSICIÓN ATÓMICA: NO resetear approvalPhase aquí
            // HomeClient lo hará DESPUÉS de montar y procesar el mensaje de bienvenida
            // Esto mantiene el overlay visible durante toda la transición
            router.push(targetUrl);

            // ✅ CRÍTICO: NO hacer setTimeout para setApprovalPhase
            // El estado se mantendrá en 'processing' hasta que HomeClient lo cambie
            console.log('🔄 [case-actions] Navegando - approvalPhase permanece en processing');
        } else {
            console.log('⏭️ [case-actions] Navegación omitida (skipNavigation=true)');
        }

        // ✅ CORRECCIÓN: Retornar objeto con caseId Y clientId
        // Esto permite que los componentes usen el clientId sin re-validar
        return { caseId, clientId };

    } catch (error: any) {
        // ✅ CORRECCIÓN: Resetear approvalPhase si hay error
        useUI.getState().setApprovalPhase('pending');
        useUI.setState({ caseApproving: false });
        // Limpiar sessionStorage en caso de error
        if (typeof window !== 'undefined') {
            try { sessionStorage.removeItem('pendingCaseApproval'); } catch (e) { /* ignore */ }
        }
        console.error('❌ [case-actions] Error creando caso:', error);
        throw error;
    }
}

