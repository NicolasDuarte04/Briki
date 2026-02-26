// src/components/Workspace/CaseBriefForm.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUI } from '@/lib/ui/state';
import { BriefForm, CaseBriefData } from '@/components/Cases/BriefForm';
import { CaseBrief } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useTranslations, useLocale } from 'next-intl';
import { useClientValidation } from '@/hooks/useClientValidation';
import { createCaseIfNeeded } from '@/lib/case-actions';
import { ClientValidationModal } from '@/components/Workspace/ClientValidationModal';

interface CaseData {
    id: string;
    status: string;
    clientName?: string;
    employees?: number;
    insurance_category?: string;
    max_budget?: number | string;
    budget_currency?: string;
    client_profile?: string;
    clientRef?: string;
    briefData?: any;
    artifacts?: any[];
    companyId?: string; // ✅ CORRECCIÓN: FK a companies para rehidratación en modo edición
    subjectType?: 'client' | 'company'; // ✅ CORRECCIÓN: Union literal estricto para propagación al brief
}

interface CaseBriefFormProps {
    initialData?: any;
    activeCaseData?: CaseData | null; // ✅ FASE 1: Recibir activeCaseData para detectar casos históricos
    onEditComplete?: () => void; // ✅ CORRECCIÓN: Callback para volver al resumen después de guardar
    isEditingMode?: boolean; // ✅ CORRECCIÓN: Prop para forzar modo edición desde WorkspaceTabs
    orgId?: string; // ✅ CORRECCIÓN: orgId desde SSR para evitar race condition en PdfUploader
}

export default function CaseBriefForm({ initialData, activeCaseData, onEditComplete, isEditingMode = false, orgId: propOrgId }: CaseBriefFormProps = {}) {
    const router = useRouter();
    const locale = useLocale();
    const { brief, setBrief, currentCaseId, approveCurrentCase, caseApproving, caseApproved, setCaseApproved, setInitialMessage } = useUI();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fetchedOrgId, setFetchedOrgId] = useState<string | null>(null); // ✅ Estado para orgId (fallback)
    const t = useTranslations("workspace.caseBrief");
    
    // ✅ CORRECCIÓN: Usar propOrgId si está disponible, sino usar fetchedOrgId
    const orgId = propOrgId || fetchedOrgId;

    // ✅ FASE 6: Hook para validación de clientes con modal (unificado con BriefForm)
    const { validateAndResolveClient, isLoading: isClientValidationLoading, modalState, setModalState } = useClientValidation(true);

    // ✅ CORRECCIÓN DOCUMENTADA: Detectar casos recién creados vs históricos
    // isEditing determina si estamos editando un caso histórico (ya creado y aprobado)
    // Cuando isEditing es true, NO deben aparecer los botones de aprobar (solo "Guardar Datos")
    const isEditing = useMemo(() => {
        // ✅ CORRECCIÓN CRÍTICA: Si isEditingMode está activo desde WorkspaceTabs, forzar modo edición
        if (isEditingMode && currentCaseId) {
            console.log('✅ [CaseBriefForm] isEditingMode activo - forzando modo edición', { isEditingMode, currentCaseId });
            return true;
        }

        if (!currentCaseId) return false;

        // Si hay datos del caso en BD y el caso está activo, es caso histórico
        // En este caso, isEditing debe ser true (independientemente de caseApproved)
        if (activeCaseData && activeCaseData.id === currentCaseId) {
            // Si el caso está activo, es un caso histórico que se puede editar
            const result = activeCaseData.status === 'active';
            console.log('✅ [CaseBriefForm] isEditing calculado desde activeCaseData', {
                status: activeCaseData.status,
                result,
                artifactsCount: activeCaseData.artifacts?.length || 0
            });
            return result;
        }

        // Si NO hay activeCaseData pero hay currentCaseId, es caso recién creado
        // NO es modo edición (es creación), así que isEditing = false
        return false;
    }, [currentCaseId, activeCaseData, isEditingMode]);

    // ✅ CORRECCIÓN: Solo obtener orgId si no viene por props (fallback)
    useEffect(() => {
        // Si ya tenemos orgId por props, no hacer fetch
        if (propOrgId) {
            console.log('✅ [CaseBriefForm] orgId recibido por props (SSR):', propOrgId);
            return;
        }
        
        const fetchOrgId = async () => {
            try {
                const response = await fetch('/api/auth/me');
                if (response.ok) {
                    const { orgId } = await response.json();
                    console.log('✅ [CaseBriefForm] orgId obtenido por fetch (fallback):', orgId);
                    setFetchedOrgId(orgId);
                }
            } catch (error) {
                console.error("❌ [CaseBriefForm] Error fetching orgId for PdfUploader:", error);
            }
        };
        fetchOrgId();
    }, [propOrgId]);

    // ✅ FASE 3: Cargar TODA la información desde activeCaseData
    useEffect(() => {
        if (!activeCaseData || !currentCaseId || activeCaseData.id !== currentCaseId) {
            // Si no hay activeCaseData o no coincide, usar initialData normal
            if (initialData && Object.keys(initialData).length > 0) {
                console.log('✅ [CaseBriefForm] Autorellenando formulario con initialData:', initialData);
                const currentBrief = useUI.getState().brief;
                if (JSON.stringify(currentBrief) !== JSON.stringify(initialData)) {
                    setBrief(initialData);
                }
            }
            return;
        }

        // ✅ FASE 3: Mapear todos los campos desde activeCaseData (caso histórico)
        const mappedBrief: Partial<CaseBrief> = {
            clientName: activeCaseData.clientName || '',
            ...(activeCaseData.employees !== undefined && activeCaseData.employees !== null && {
                employees: activeCaseData.employees
            }),
            insurance_category: activeCaseData.insurance_category || '',
            ...(activeCaseData.max_budget !== undefined && activeCaseData.max_budget !== null && {
                max_budget: Number(activeCaseData.max_budget)
            }),
            budget_currency: (activeCaseData.budget_currency as 'COP' | 'USD') || 'COP',
            client_profile: activeCaseData.client_profile || '',
            freeText: (activeCaseData.briefData as any)?.freeText || '',
            selectedClientId: activeCaseData.clientRef || null,
            // ✅ CORRECCIÓN: Incluir campos de empresa para que el brief global los tenga disponibles
            ...(activeCaseData.subjectType && { subjectType: activeCaseData.subjectType }),
            ...(activeCaseData.subjectType === 'company' && {
                companyName: activeCaseData.clientName || '', // clientName almacena el nombre de empresa cuando subjectType=company
                selectedCompanyId: activeCaseData.companyId || null,
            }),
            // NO incluir tempUploads para casos históricos (PDFs vienen de artifacts)
        };

        // Actualizar brief solo si es diferente
        const currentBrief = useUI.getState().brief;
        const currentKeys = Object.keys(mappedBrief);
        const hasChanges = currentKeys.some(key => {
            const currentValue = (currentBrief as any)[key];
            const newValue = (mappedBrief as any)[key];
            return JSON.stringify(currentValue) !== JSON.stringify(newValue);
        });

        if (hasChanges) {
            console.log('✅ [CaseBriefForm] Brief sincronizado desde activeCaseData:', mappedBrief);
            setBrief(mappedBrief);
        }
    }, [activeCaseData, currentCaseId, initialData, setBrief]);

    // ✅ FASE 2 REFORMULADA: Limpieza cuando no hay currentCaseId (new-thread-placeholder)
    // PERO NO limpiar si hay landingDataPending (HomeClient ya cargó los datos al brief)
    useEffect(() => {
        if (!currentCaseId) {
            // ✅ CORRECCIÓN: Verificar landingDataPending antes de limpiar
            const landingDataPending = useUI.getState().landingDataPending;
            if (landingDataPending) {
                console.log('⏭️ [CaseBriefForm] Omitiendo limpieza - hay landingDataPending (HomeClient ya cargó los datos)');
                return;
            }

            console.log('🧹 [CaseBriefForm] Limpiando brief para new-thread-placeholder');
            // ✅ FASE 3: Limpieza explícita y completa del estado
            // TODOS los campos deben establecerse explícitamente, incluyendo null para employees y max_budget
            setBrief({
                freeText: '',
                clientName: '',
                selectedClientId: null,
                insurance_category: '',
                max_budget: null,         // ✅ FASE 3: Explícitamente null
                budget_currency: 'COP',
                client_profile: '',
                employees: null,          // ✅ FASE 3: Explícitamente null
                tempUploads: [] // ✅ CORRECCIÓN: Limpiar PDFs residuales
            });
        }
    }, [currentCaseId, setBrief]);

    // Función para volver al modo de edición
    // ✅ CORRECCIÓN: NO resetear caseApproved - mantener el estado original
    // El estado isEditing se calcula desde activeCaseData, no desde caseApproved
    const handleEdit = () => {
        // No hacer nada - isEditing se calcula automáticamente desde activeCaseData
        // Solo necesitamos forzar un re-render si es necesario
        console.log('✏️ [CaseBriefForm] Modo edición activado (caso histórico)');
    };

    // ✅ CORRECCIÓN: Función para cancelar edición sin guardar cambios
    const handleCancel = useCallback(() => {
        console.log('❌ [CaseBriefForm] Cancelando edición - volviendo al resumen sin guardar');
        if (onEditComplete) {
            onEditComplete();
        }
    }, [onEditComplete]);

    // ✅ FASE 3: Usar función extendida desde lib/case-actions.ts
    // La función local createCaseIfNeeded ha sido movida a lib/case-actions.ts

    // ✅ CORRECCIÓN: handleFormSubmit ahora maneja creación Y actualización según el modo
    const handleFormSubmit = useCallback(async (data: CaseBriefData) => {
        // ✅ CORRECCIÓN CRÍTICA: Bloquear botones INMEDIATAMENTE antes de cualquier async
        setIsSubmitting(true);
        useUI.setState({ caseApproving: true });
        console.log('🔒 [CaseBriefForm] Botones bloqueados para sincronización (handleFormSubmit)');

        try {
            // ✅ VALIDACIÓN MEJORADA
            if (!data.insurance_category?.trim()) {
                console.error('❌ [CaseBriefForm] Insurance category required');
                alert('Por favor selecciona una categoría de seguro para continuar.');
                // Resetear estados de bloqueo
                setIsSubmitting(false);
                useUI.setState({ caseApproving: false });
                return;
            }

            // ✅ ACTUALIZAR BRIEF con validación
            // ✅ CORRECCIÓN CRÍTICA: Usar data.freeText || data.notes para asegurar que las notas se incluyan
            // BriefForm mapea notes a freeText, pero como fallback usamos notes si freeText está vacío
            const finalFreeText = data.freeText || data.notes || '';
            console.log('📝 [CaseBriefForm] freeText final para actualización:', {
                freeText: data.freeText?.substring(0, 50) + '...',
                notes: data.notes?.substring(0, 50) + '...',
                finalFreeText: finalFreeText.substring(0, 50) + '...'
            });

            // ✅ CORRECCIÓN CRÍTICA: Incluir TODOS los campos del formulario en briefUpdate
            // Esto asegura que generateInitialMessageFromBrief incluya TODA la información
            const briefUpdate: Partial<CaseBrief> = {
                freeText: finalFreeText, // ✅ CORRECCIÓN: Usar finalFreeText que incluye notes como fallback
                insurance_category: data.insurance_category || '',
                budget_currency: data.budget_currency || 'COP',
                client_profile: data.client_profile || '',
                clientName: data.clientName || '',
                // ✅ CORRECCIÓN CRÍTICA: Incluir campos numéricos (null es válido)
                employees: data.employees ?? null,
                max_budget: data.max_budget ?? null,
                // ✅ CORRECCIÓN CRÍTICA: Incluir tempUploads para que generateInitialMessageFromBrief los incluya en el mensaje al agente
                tempUploads: data.tempUploads || [],
                // ✅ FIX DEFECTO F: Incluir linkedPolicyIds/linkedQuoteIds para que el brief en Zustand
                // los preserve y generateInitialMessageFromBrief los cuente correctamente
                ...(data.linkedPolicyIds?.length ? { linkedPolicyIds: data.linkedPolicyIds } : {}),
                ...(data.linkedQuoteIds?.length ? { linkedQuoteIds: data.linkedQuoteIds } : {}),
            };

            console.log('📝 [CaseBriefForm] briefUpdate completo para mensaje al agente:', {
                freeText: briefUpdate.freeText?.substring(0, 50) + '...',
                insurance_category: briefUpdate.insurance_category,
                clientName: briefUpdate.clientName,
                max_budget: briefUpdate.max_budget,
                tempUploadsCount: (briefUpdate as any).tempUploads?.length || 0
            });

            setBrief(briefUpdate);

            // ✅ CORRECCIÓN: Si estamos en modo edición, actualizar caso y comunicar con agente
            if (isEditing && currentCaseId && orgId) {
                // ✅ FASE DETECCIÓN: Guardar IDs de artifacts existentes ANTES de actualizar
                const previousArtifactIds = new Set(
                    (activeCaseData?.artifacts || []).map((a: any) => a.id)
                );
                const previousArtifactCount = previousArtifactIds.size;
                
                console.log('✏️ [CaseBriefForm] Modo edición detectado - Actualizando caso y comunicando con agente', {
                    isEditing,
                    currentCaseId,
                    orgId,
                    hasActiveCaseData: !!activeCaseData,
                    previousArtifactCount,
                    newUploadsCount: data.tempUploads?.length || 0
                });

                // 1. Actualizar el caso en BD
                // ✅ PROBLEMA 2 FIX: Incluir linkedPolicyIds para vincular pólizas de organización
                const updateResponse = await fetch('/api/cases/update', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        caseId: currentCaseId,
                        orgId: orgId,
                        ...briefUpdate,
                        tempUploads: data.tempUploads || [],
                        linkedPolicyIds: data.linkedPolicyIds || [], // ✅ FIX: Vincular pólizas de organización
                        linkedQuoteIds: data.linkedQuoteIds || [] // ✅ FIX DEFECTO 4: Vincular cotizaciones de organización
                    })
                });

                if (!updateResponse.ok) {
                    const errorData = await updateResponse.json();
                    throw new Error(errorData.error || 'Error al actualizar el caso');
                }

                // ✅ FASE DETECCIÓN: Obtener caso actualizado con artifacts nuevos
                const updateResponseData = await updateResponse.json();
                const updatedArtifacts = updateResponseData.case?.artifacts || [];
                
                // Detectar nuevas pólizas comparando con las anteriores
                const newArtifacts = updatedArtifacts.filter(
                    (a: any) => !previousArtifactIds.has(a.id)
                );
                
                console.log('✅ [CaseBriefForm] Caso actualizado exitosamente', {
                    totalArtifacts: updatedArtifacts.length,
                    newArtifactsCount: newArtifacts.length,
                    newArtifactNames: newArtifacts.map((a: any) => a.fileName)
                });

                // 2. Comunicar con el agente para que responda a la información actualizada
                // ✅ CORRECCIÓN CRÍTICA: Generar mensaje completo con TODA la información del formulario
                const { sendAutoMessage } = useUI.getState();
                const { generateInitialMessageFromBrief } = await import('@/lib/helpers/message-helpers');
                // ✅ FIX DEFECTO B: Prefijo [BRIEF_UPDATE] para que detectOperationMode active modo brief_update
                // Esto evita que el agente responda con un análisis de póliza completo
                let autoMessageContent = '[BRIEF_UPDATE] ' + (generateInitialMessageFromBrief(briefUpdate) || "He actualizado la información del caso. Por favor, analiza los cambios y proporciona recomendaciones actualizadas.");
                
                // ✅ FASE DETECCIÓN: Si hay nuevas pólizas DIRECTAS (subidas), añadir mensaje especial
                if (newArtifacts.length > 0) {
                    const newPolicyNames = newArtifacts.map((a: any) => a.fileName).join(', ');
                    autoMessageContent += `\n\n📄 **Nuevas pólizas añadidas:** He cargado ${newArtifacts.length} nueva(s) póliza(s) al caso: ${newPolicyNames}.\n\nPuedes analizarlas en el tab **'Pólizas'** para que las compare con el panorama actual del cliente.`;
                    console.log('📄 [CaseBriefForm] Nuevas pólizas directas detectadas, mensaje enriquecido');
                }
                
                // ✅ PROBLEMA 3 FIX: Si hay pólizas VINCULADAS de organización, solo mencionar disponibilidad
                // NO resumir el contenido de las pólizas, solo indicar que están disponibles para cargar
                const linkedPoliciesCount = data.linkedPolicyIds?.length || 0;
                // ✅ FIX DEFECTO 4: Contar cotizaciones vinculadas por separado
                const linkedQuotesCount = data.linkedQuoteIds?.length || 0;
                if (linkedPoliciesCount > 0 || linkedQuotesCount > 0) {
                    const parts: string[] = [];
                    if (linkedPoliciesCount > 0) {
                        parts.push(`${linkedPoliciesCount} póliza(s)`);
                    }
                    if (linkedQuotesCount > 0) {
                        parts.push(`${linkedQuotesCount} cotización(es)`);
                    }
                    autoMessageContent += `\n\n🔗 **Documentos de la organización vinculados:** ${parts.join(' y ')} ya analizados han sido vinculados a este caso.\n\nPuedes verlos en el tab **'Pólizas'** y usar el botón **'Cargar Análisis'** para contextualizar cada uno con los requerimientos actuales del cliente.`;
                    console.log('🔗 [CaseBriefForm] Documentos vinculados detectados:', { linkedPoliciesCount, linkedQuotesCount });
                }
                
                console.log('📝 [CaseBriefForm] Mensaje generado para agente:', autoMessageContent.substring(0, 150) + '...');

                // Enviar mensaje automático al agente
                await sendAutoMessage(autoMessageContent);

                console.log('✅ [CaseBriefForm] Mensaje enviado al agente para responder a la información actualizada');

                // ✅ FIX DEFECTO B: Forzar re-fetch de pólizas tras edición del caso
                // policyAnalysesLoaded estaba en true desde el fetch inicial, impidiendo que
                // Tabs.tsx re-dispare fetchPolicyAnalyses con los nuevos artifacts
                useUI.setState({ policyAnalysesLoaded: false });
                console.log('🔄 [CaseBriefForm] policyAnalysesLoaded reseteado para forzar re-fetch');

                // ✅ CORRECCIÓN: Volver al resumen después de guardar exitosamente
                // handleEditComplete en WorkspaceTabs recargará los datos del caso automáticamente
                if (onEditComplete) {
                    onEditComplete();
                }

                // Resetear estados
                setIsSubmitting(false);
                useUI.setState({ caseApproving: false });
                return;
            }

            // ✅ Modo creación: Usar función extendida desde lib/case-actions.ts
            // ✅ REESTRUCTURACIÓN: Navegación simple, sin análisis automático
            // El mensaje de bienvenida se genera en approveCurrentCase() en state.ts
            const result = await createCaseIfNeeded(
                briefUpdate,
                router,
                {
                    setInitialMessage,
                    setCurrentCaseId: useUI.getState().setCurrentCaseId,
                    currentCaseId,
                    saveUserMessage: false, // Por ahora, se guardará después en ConversationPane
                    skipNavigation: false, // ✅ REESTRUCTURACIÓN: Navegación directa, sin interceptación
                    locale: locale as 'en' | 'es', // ✅ CORRECCIÓN i18n: Pasar locale para navegación consistente
                }
            );

            // ✅ TRANSICIÓN ATÓMICA: NO resetear estados aquí
            // HomeClient los reseteará después de completar la transición
            // Esto mantiene el overlay visible durante la navegación
            console.log('🔄 [CaseBriefForm] Caso creado, estados permanecen para transición atómica');

        } catch (error: any) {
            console.error('❌ [CaseBriefForm] Error updating case brief:', error);

            // ✅ CORRECCIÓN: Mensajes de error más específicos
            let errorMessage = 'Hubo un error al procesar el formulario. Por favor intenta de nuevo.';

            if (error.message?.includes('No se pudo conectar con la base de datos') ||
                error.message?.includes('Can\'t reach database server')) {
                errorMessage = 'No se pudo conectar con la base de datos. Por favor, espera unos segundos e intenta de nuevo.';
            } else if (error.message?.includes('Network')) {
                errorMessage = 'Error de conexión. Por favor, verifica tu internet e intenta de nuevo.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            alert(errorMessage);
            
            // ✅ TRANSICIÓN ATÓMICA: Solo resetear estados en caso de ERROR
            setIsSubmitting(false);
            useUI.setState({ caseApproving: false });
        }
        // ✅ TRANSICIÓN ATÓMICA: Removido finally - los estados se mantienen intencionalmente
    }, [setBrief, router, setInitialMessage, isEditing, currentCaseId, orgId, activeCaseData, onEditComplete]);

    // ✅ FASE 6: Simplificado para usar createCaseIfNeeded extendido (elimina código duplicado)
    const handleApproveWithValidation = useCallback(async () => {
        // ✅ FASE 6: Establecer estados de bloqueo INMEDIATAMENTE
        setIsSubmitting(true);
        useUI.setState({ caseApproving: true });
        console.log('🔒 [CaseBriefForm] Botones bloqueados para sincronización (FASE 6)');

        try {
            // Actualizar brief con datos actuales del formulario
            const currentBrief = useUI.getState().brief;
            setBrief(currentBrief);

            // ✅ FASE 6: Usar createCaseIfNeeded extendido con modal de validación y saveUserMessage
            // createCaseIfNeeded ahora retorna { caseId, clientId } para evitar doble validación
            const result = await createCaseIfNeeded(
                currentBrief,
                router,
                {
                    validateClient: validateAndResolveClient, // ✅ FASE 6: Modal habilitado
                    setInitialMessage,
                    setCurrentCaseId: useUI.getState().setCurrentCaseId,
                    currentCaseId,
                    saveUserMessage: true, // ✅ FASE 6: Guardar mensaje del usuario como primer mensaje
                    locale: locale as 'en' | 'es', // ✅ CORRECCIÓN i18n: Pasar locale para navegación consistente
                }
            );

            // ✅ FASE 6: Si el caso ya existía (caseId === currentCaseId), aprobar el caso
            // Si el caso fue recién creado, createCaseIfNeeded navegó con router.push()
            // En navegación SPA, el código continúa ejecutándose, así que verificamos si navegó
            if (result.caseId && result.caseId === currentCaseId) {
                console.log('✅ [CaseBriefForm] FASE 6: Caso ya existe, aprobando caso:', result.caseId);

                // ✅ CORRECCIÓN: Usar clientId ya validado por createCaseIfNeeded
                // NO re-validar para evitar que aparezca el modal 2 veces
                const clientId = result.clientId || (currentBrief as any).selectedClientId || null;
                console.log('✅ [CaseBriefForm] Usando clientId ya validado:', clientId);

                // Aprobar el caso existente
                const success = await approveCurrentCase(clientId);
                if (!success) {
                    console.log('❌ [CaseBriefForm] Aprobación falló');
                } else {
                    console.log('✅ [CaseBriefForm] Caso aprobado exitosamente');
                }
            } else {
                // ✅ TRANSICIÓN ATÓMICA: Si el caso fue recién creado, createCaseIfNeeded ya navegó
                // Los estados permanecen activos hasta que HomeClient complete la transición
                console.log('✅ [CaseBriefForm] Caso creado, navegando - estados permanecen para transición atómica');
            }
        } catch (error: any) {
            console.error('❌ [CaseBriefForm] FASE 6: Error en aprobación con validación:', error);

            // ✅ FASE 6: Manejar cancelación de creación de cliente
            if (error.message === 'CLIENT_CREATION_CANCELLED') {
                console.log('ℹ️ [CaseBriefForm] Usuario canceló creación de cliente');
                // No mostrar error, solo resetear estados
                useUI.setState({ caseApproving: false });
                setIsSubmitting(false);
                return; // No propagar error si es cancelación
            }

            // ✅ FASE 6: Mensajes de error más específicos y descriptivos
            let errorMessage = 'Error inesperado. Por favor, inténtalo de nuevo.';

            if (error.message === "CLIENT_CREATION_FAILED") {
                console.error('❌ [CaseBriefForm] Error al crear el cliente');
                errorMessage = 'Error al crear el cliente. Por favor, inténtalo de nuevo.';
            } else if (error.message?.includes('No se pudo conectar con la base de datos') ||
                error.message?.includes('Can\'t reach database server')) {
                errorMessage = 'No se pudo conectar con la base de datos. Por favor, espera unos segundos e intenta de nuevo.';
            } else if (error.message?.includes('Network')) {
                errorMessage = 'Error de conexión. Por favor, verifica tu internet e intenta de nuevo.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            alert(errorMessage);

            // ✅ TRANSICIÓN ATÓMICA: Solo resetear estados en caso de ERROR
            setIsSubmitting(false);
            useUI.setState({ caseApproving: false });
        }
        // ✅ TRANSICIÓN ATÓMICA: Removido finally - los estados se mantienen intencionalmente
    }, [currentCaseId, setBrief, validateAndResolveClient, router, setInitialMessage, approveCurrentCase]); // ✅ FASE 6: Dependencias actualizadas

    // ✅ CORRECCIÓN UX: Estado combinado para mostrar overlay de procesamiento
    const isProcessingCase = isSubmitting || caseApproving;

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-1 relative">
            {/* ✅ CORRECCIÓN UX: Overlay de procesamiento visual inmediato */}
            {isProcessingCase && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3 p-6 bg-card rounded-lg shadow-lg border">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="font-medium text-foreground">Procesando...</p>
                        <p className="text-sm text-muted-foreground">Por favor espera un momento.</p>
                    </div>
                </div>
            )}
            
            <header className="pb-2 flex justify-between items-center">
                <h1 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                    {t("title")}
                </h1>
                {/* ✅ CORRECCIÓN: Mostrar botón Cancelar en modo edición, Editar en modo resumen */}
                {isEditing ? (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCancel}
                        disabled={isSubmitting || caseApproving}
                    >
                        Cancelar
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                        Editar
                    </Button>
                )}
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
                {/* Mostrar BriefForm SIEMPRE (creación o edición) */}
                {/* ✅ CORRECCIÓN: Spread condicional para respetar exactOptionalPropertyTypes
                    - En modo creación (!isEditing): onApprove está presente en props
                    - En modo edición (isEditing): onApprove no existe en props (omitida completamente) */}
                <BriefForm
                    onSubmit={handleFormSubmit}
                    {...(!isEditing && { onApprove: handleApproveWithValidation })}
                    isSubmitting={isSubmitting || caseApproving || isClientValidationLoading}
                    initialNotes={currentCaseId ? (brief.freeText || '') : ''} // ✅ CORRECCIÓN QUIRÚRGICA: Limpiar initialNotes cuando no hay currentCaseId
                    orgId={orgId || ''} // ✅ Pasar orgId
                    mode={isEditing ? 'edit' : 'create'} // ✅ Pasar el modo
                    initialData={isEditing ? (activeCaseData ? {
                        ...activeCaseData,
                        artifacts: activeCaseData.artifacts || [], // ✅ CORRECCIÓN: Incluir artifacts en initialData para modo edición
                        id: activeCaseData.id // ✅ CORRECCIÓN: Asegurar que id esté presente para modo edición
                    } : (initialData ? {
                        ...initialData,
                        artifacts: initialData.artifacts || [],
                        id: initialData.id
                    } : initialData)) : initialData} // ✅ CORRECCIÓN: Pasar activeCaseData completo con artifacts en modo edición
                />

                {/* ✅ FASE 6: Modal de validación de cliente */}
                {modalState && (
                    <ClientValidationModal
                        clientName={modalState.clientName}
                        isOpen={modalState.isOpen}
                        onClose={() => {
                            setModalState(null);
                            modalState.onCancel();
                        }}
                        onConfirm={(clientId) => {
                            setModalState(null);
                            modalState.onConfirm(clientId);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
