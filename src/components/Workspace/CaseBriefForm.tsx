// src/components/Workspace/CaseBriefForm.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUI } from '@/lib/ui/state';
import { BriefForm, CaseBriefData } from '@/components/Cases/BriefForm';
import { CaseBrief } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useClientValidation } from '@/hooks/useClientValidation';
import { createCaseIfNeeded } from '@/lib/case-actions';
import { ClientValidationModal } from '@/components/Workspace/ClientValidationModal';

interface CaseData {
    id: string;
    status: string;
    clientName?: string;
    businessType?: string;
    employees?: number;
    insurance_category?: string;
    max_budget?: number | string;
    budget_currency?: string;
    required_coverages?: string[];
    client_profile?: string;
    clientRef?: string;
    briefData?: any;
    artifacts?: any[];
}

interface CaseBriefFormProps {
    initialData?: any;
    activeCaseData?: CaseData | null; // ✅ FASE 1: Recibir activeCaseData para detectar casos históricos
}

export default function CaseBriefForm({ initialData, activeCaseData }: CaseBriefFormProps = {}) {
    const router = useRouter();
    const { brief, setBrief, currentCaseId, approveCurrentCase, caseApproving, caseApproved, setCaseApproved, setInitialMessage } = useUI();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orgId, setOrgId] = useState<string | null>(null); // ✅ Estado para orgId
    const t = useTranslations("workspace.caseBrief");
    
    // ✅ FASE 6: Hook para validación de clientes con modal (unificado con BriefForm)
    const { validateAndResolveClient, isLoading: isClientValidationLoading, modalState, setModalState } = useClientValidation(true);
    
    // ✅ CORRECCIÓN DOCUMENTADA: Detectar casos recién creados vs históricos
    // isEditing determina si mostrar botones de aprobar
    // Priorizar caseApproved: si es true, NUNCA mostrar botones de aprobar
    const isEditing = useMemo(() => {
        if (!currentCaseId) return false;
        
        // ✅ CORRECCIÓN: Si caseApproved es true, NUNCA mostrar botones de aprobar
        // (el caso ya fue aprobado, solo se puede editar)
        if (caseApproved) return false;
        
        // Si hay datos del caso en BD, es caso histórico
        if (activeCaseData && activeCaseData.id === currentCaseId) {
            // Solo editar si el caso está activo Y el usuario quiere editar
            return activeCaseData.status === 'active';
        }
        
        // Si NO hay activeCaseData pero hay currentCaseId, es caso recién creado
        // NO mostrar botones de aprobar después de crear (solo conversación)
        return false;
    }, [currentCaseId, activeCaseData, caseApproved]);
    
    // ✅ Obtener orgId al montar el componente
    useEffect(() => {
        const fetchOrgId = async () => {
            try {
                const response = await fetch('/api/auth/me');
                if (response.ok) {
                    const { orgId } = await response.json();
                    console.log('✅ [CaseBriefForm] orgId obtenido:', orgId);
                    setOrgId(orgId);
                }
            } catch (error) {
                console.error("❌ [CaseBriefForm] Error fetching orgId for PdfUploader:", error);
            }
        };
        fetchOrgId();
    }, []);

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
            businessType: activeCaseData.businessType || '',
            ...(activeCaseData.employees !== undefined && activeCaseData.employees !== null && {
                employees: activeCaseData.employees
            }),
            insurance_category: activeCaseData.insurance_category || '',
            ...(activeCaseData.max_budget !== undefined && activeCaseData.max_budget !== null && {
                max_budget: Number(activeCaseData.max_budget)
            }),
            budget_currency: (activeCaseData.budget_currency as 'COP' | 'USD') || 'COP',
            required_coverages: Array.isArray(activeCaseData.required_coverages) 
                ? activeCaseData.required_coverages 
                : [],
            client_profile: activeCaseData.client_profile || '',
            freeText: (activeCaseData.briefData as any)?.freeText || '',
            coverage: (activeCaseData.briefData as any)?.coverage || '',
            selectedClientId: activeCaseData.clientRef || null,
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
    useEffect(() => {
        if (!currentCaseId) {
            console.log('🧹 [CaseBriefForm] Limpiando brief para new-thread-placeholder');
            setBrief({
                freeText: '',
                clientName: '',
                selectedClientId: null,
                insurance_category: '',
                budget_currency: 'COP',
                required_coverages: [],
                client_profile: '',
                businessType: '',
                coverage: '',
                tempUploads: [] // ✅ CORRECCIÓN: Limpiar PDFs residuales
            });
        }
    }, [currentCaseId, setBrief]);
    
    // Función para volver al modo de edición
    const handleEdit = () => {
        setCaseApproved(false);
    };

    // ✅ FASE 3: Usar función extendida desde lib/case-actions.ts
    // La función local createCaseIfNeeded ha sido movida a lib/case-actions.ts

    // ✅ CORRECCIÓN: handleFormSubmit ahora también crea caso si no existe (unifica con handleApproveWithValidation)
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
            const briefUpdate: Partial<CaseBrief> = {
                businessType: data.businessType,
                coverage: data.coverage,
                freeText: data.freeText,
                insurance_category: data.insurance_category,
                budget_currency: data.budget_currency,
                required_coverages: data.required_coverages,
                client_profile: data.client_profile,
                clientName: data.clientName,
            };
            
            // Solo incluir campos numéricos si no son null
            if (data.employees !== null) briefUpdate.employees = data.employees;
            if (data.max_budget !== null) briefUpdate.max_budget = data.max_budget;
            
            setBrief(briefUpdate);
            
            // ✅ FASE 3: Usar función extendida desde lib/case-actions.ts
            await createCaseIfNeeded(
                briefUpdate,
                router,
                {
                    setInitialMessage,
                    setCurrentCaseId: useUI.getState().setCurrentCaseId,
                    currentCaseId,
                    saveUserMessage: false, // Por ahora, se guardará después en ConversationPane
                }
            );
            
            // Si llegamos aquí, el caso fue creado y la navegación se ejecutó
            // approveCurrentCase se ejecutará después de la recarga
            
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
        } finally {
            // ✅ CORRECCIÓN: Resetear estados de carga cuando hay error
            // Si createCaseIfNeeded navegó exitosamente, este código no se ejecutará
            setIsSubmitting(false);
            useUI.setState({ caseApproving: false });
        }
    }, [setBrief, router, setInitialMessage]);

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
            const caseId = await createCaseIfNeeded(
                currentBrief,
                router,
                {
                    validateClient: validateAndResolveClient, // ✅ FASE 6: Modal habilitado
                    setInitialMessage,
                    setCurrentCaseId: useUI.getState().setCurrentCaseId,
                    currentCaseId,
                    saveUserMessage: true, // ✅ FASE 6: Guardar mensaje del usuario como primer mensaje
                }
            );
            
            // ✅ FASE 6: Si el caso ya existía (caseId === currentCaseId), aprobar el caso
            // Si el caso fue recién creado, createCaseIfNeeded navegó con router.push()
            // En navegación SPA, el código continúa ejecutándose, así que verificamos si navegó
            if (caseId && caseId === currentCaseId) {
                console.log('✅ [CaseBriefForm] FASE 6: Caso ya existe, aprobando caso:', caseId);
                
                // Obtener clientId desde el brief (ya fue validado en createCaseIfNeeded si aplicaba)
                let clientId: string | null = null;
                if (currentBrief.clientName && currentBrief.clientName.trim()) {
                    // ✅ FASE 6: Ya fue validado en createCaseIfNeeded, obtener desde brief o validar nuevamente
                    try {
                        // Intentar obtener clientId del brief si existe
                        clientId = (currentBrief as any).selectedClientId || null;
                        
                        // Si no existe en brief, validar nuevamente (puede ser necesario si el caso ya existía)
                        if (!clientId) {
                            clientId = await validateAndResolveClient(currentBrief.clientName);
                            console.log('✅ [CaseBriefForm] Cliente validado/resuelto para aprobación:', clientId);
                        }
                    } catch (error: any) {
                        console.warn('⚠️ [CaseBriefForm] Error al validar cliente para aprobación (continuando sin cliente):', error);
                        // No bloquear el flujo si la validación del cliente falla
                    }
                }
                
                // Aprobar el caso existente
                const success = await approveCurrentCase(clientId);
                if (!success) {
                    console.log('❌ [CaseBriefForm] Aprobación falló');
                } else {
                    console.log('✅ [CaseBriefForm] Caso aprobado exitosamente');
                }
            } else {
                // ✅ FASE 6: Si el caso fue recién creado, createCaseIfNeeded ya navegó
                console.log('✅ [CaseBriefForm] FASE 6: Caso creado exitosamente, navegando a:', caseId);
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
            
            // Resetear estados en caso de error
            setIsSubmitting(false);
            useUI.setState({ caseApproving: false });
        } finally {
            // ✅ FASE 6: Resetear estados de carga solo si no navegó
            // Si createCaseIfNeeded navegó exitosamente, este código puede no ejecutarse
            setIsSubmitting(false);
            useUI.setState({ caseApproving: false });
        }
    }, [currentCaseId, setBrief, validateAndResolveClient, router, setInitialMessage, approveCurrentCase]); // ✅ FASE 6: Dependencias actualizadas

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-1">
            <header className="pb-2 flex justify-between items-center">
                <h1 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                    {t("title")}
                </h1>
                {!isEditing && (
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                        Editar
                    </Button>
                )}
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
                {/* Mostrar BriefForm SIEMPRE (creación o edición) */}
                    <BriefForm
                        onSubmit={handleFormSubmit}
                        onApprove={handleApproveWithValidation}
                        isSubmitting={isSubmitting || caseApproving || isClientValidationLoading}
                    initialNotes={currentCaseId ? (brief.freeText || '') : ''} // ✅ CORRECCIÓN QUIRÚRGICA: Limpiar initialNotes cuando no hay currentCaseId
                    orgId={orgId || ''} // ✅ Pasar orgId
                    mode={isEditing ? 'edit' : 'create'} // ✅ Pasar el modo
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
