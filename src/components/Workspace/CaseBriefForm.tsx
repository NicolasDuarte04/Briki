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

// ✅ CORRECCIÓN: Función helper para generar mensaje inicial basado en brief
function generateInitialMessageFromBrief(brief: Partial<CaseBrief>): string {
    const parts: string[] = [];
    
    // Información básica
    if (brief.clientName) {
        parts.push(`Cliente: ${brief.clientName}`);
    }
    
    // Categoría de seguro (obligatoria)
    if (brief.insurance_category) {
        parts.push(`Categoría de seguro: ${brief.insurance_category}`);
    }
    
    // Presupuesto
    if (brief.max_budget) {
        const currency = brief.budget_currency || 'COP';
        parts.push(`Presupuesto máximo: ${brief.max_budget.toLocaleString()} ${currency}`);
    }
    
    // Coberturas imprescindibles
    if (brief.required_coverages && brief.required_coverages.length > 0) {
        parts.push(`Coberturas imprescindibles: ${brief.required_coverages.join(', ')}`);
    }
    
    // Perfil del cliente
    if (brief.client_profile) {
        parts.push(`Perfil del cliente: ${brief.client_profile}`);
    }
    
    // Tipo de negocio
    if (brief.businessType) {
        parts.push(`Tipo de negocio: ${brief.businessType}`);
    }
    
    // Número de empleados
    if (brief.employees) {
        parts.push(`Número de empleados: ${brief.employees}`);
    }
    
    // Notas adicionales
    if (brief.freeText) {
        parts.push(`Notas adicionales: ${brief.freeText}`);
    }
    
    // PDFs adjuntos
    const tempUploads = (brief as any).tempUploads || [];
    if (tempUploads.length > 0) {
        const pdfNames = tempUploads.map((upload: any) => upload.fileName || 'Documento').join(', ');
        parts.push(`Documentos PDF adjuntos: ${pdfNames}`);
    }
    
    // Si no hay información, retornar mensaje genérico
    if (parts.length === 0) {
        return 'He completado el formulario con la información del caso.';
    }
    
    return `He completado el formulario con la siguiente información:\n\n${parts.join('\n')}`;
}

export default function CaseBriefForm({ initialData, activeCaseData }: CaseBriefFormProps = {}) {
    const router = useRouter();
    const { brief, setBrief, currentCaseId, approveCurrentCase, caseApproving, caseApproved, setCaseApproved, setInitialMessage } = useUI();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orgId, setOrgId] = useState<string | null>(null); // ✅ Estado para orgId
    const t = useTranslations("workspace.caseBrief");
    
    // Hook para validación de clientes (coordinado con ConversationPane)
    const { validateAndResolveClient, isLoading: isClientValidationLoading } = useClientValidation();
    
    // ✅ FASE 1: CORRECCIÓN CRÍTICA - Detectar casos recién creados vs históricos
    // isEditing determina si mostrar botones de aprobar
    // Solo mostrar botones si:
    //   - Hay currentCaseId (caso existe)
    //   - caseApproved es false (caso no aprobado o usuario quiere editar)
    //   - NO es caso recién creado (activeCaseData existe)
    //   - El caso está activo en BD (status='active')
    const isEditing = useMemo(() => {
        if (!currentCaseId) return false;
        
        // ✅ CORRECCIÓN CRÍTICA: Si caseApproved es true, NUNCA mostrar botones
        // Esto asegura que después de aprobar, los botones desaparezcan inmediatamente
        if (caseApproved) return false;
        
        // Si hay datos del caso en BD, es caso histórico
        if (activeCaseData && activeCaseData.id === currentCaseId) {
            // Solo editar si el caso está activo Y el usuario quiere editar
            return activeCaseData.status === 'active' && !caseApproved;
        }
        
        // Si NO hay activeCaseData pero hay currentCaseId, es caso recién creado
        // Mostrar botones solo si el caso aún no está aprobado
        return true; // ✅ CORRECCIÓN: Permitir mostrar botones para casos recién creados
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

    // ✅ CORRECCIÓN: Función compartida para crear caso (unifica lógica de los 3 botones)
    const createCaseIfNeeded = useCallback(async (briefData: Partial<CaseBrief>) => {
        if (currentCaseId) {
            console.log('✅ Caso ya existe:', currentCaseId);
            return currentCaseId;
        }

        console.log('📝 No hay currentCaseId, creando caso...');
        
        // ✅ CORRECCIÓN CRÍTICA: Establecer caseApproving en el store para sincronizar todos los botones
        useUI.setState({ caseApproving: true });
        console.log('🔒 [CaseBriefForm] caseApproving establecido en true para sincronizar botones');
        
        // Obtener información del usuario
        const authResponse = await fetch('/api/auth/me');
        if (!authResponse.ok) {
            // Resetear caseApproving si falla
            useUI.setState({ caseApproving: false });
            throw new Error('No se pudo obtener información del usuario');
        }
        const { orgId, userId } = await authResponse.json();
        console.log('👤 Usuario autenticado:', { orgId, userId });
        
        // ✅ Crear el caso con tempUploads si existen
        const tempUploads = (briefData as any).tempUploads || [];
        console.log('📎 [CaseBriefForm] Creando caso con tempUploads:', tempUploads.length);
        
        const response = await fetch('/api/cases/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orgId,
                userId,
                clientName: briefData.clientName,
                businessType: briefData.businessType,
                employees: briefData.employees,
                status: 'draft',
                stage: 'initial',
                priority: 'medium',
                briefData: {
                    freeText: briefData.freeText,
                    businessType: briefData.businessType,
                    employees: briefData.employees,
                    coverage: briefData.coverage,
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
            // Resetear caseApproving si falla
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
            
            // ✅ CORRECCIÓN: Propagar mensaje de error más descriptivo
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('✅ Caso creado exitosamente:', result.caseId);
        
        // Establecer currentCaseId inmediatamente después de crear el caso
        useUI.getState().setCurrentCaseId(result.caseId);
        console.log('💾 currentCaseId establecido en:', result.caseId);
        
        // ✅ CORRECCIÓN: Generar y establecer mensaje inicial basado en el brief
        const initialMessage = generateInitialMessageFromBrief(briefData);
        setInitialMessage(initialMessage);
        console.log('📝 [CaseBriefForm] InitialMessage establecido:', initialMessage);
        
        // ✅ NOTA: Ya no necesitamos localStorage porque router.push() mantiene el estado
        
        // ✅ NUEVO: Marcar timestamp para HomeClient
        (window as any).lastCaseCreation = Date.now();
        
        // ✅ NUEVO: Navegar al caso creado inmediatamente
        const currentPath = window.location.pathname;
        const localeMatch = currentPath.match(/\/(es|en)\//);
        const locale = localeMatch ? localeMatch[1] : 'es';
        
        const targetUrl = `/${locale}/agent/${result.caseId}`;
        console.log(`✅ [CaseBriefForm] Navigating to: ${targetUrl} (SPA navigation)`);
        
        // ✅ CORRECCIÓN: Usar router.push() igual que LandingPage para mantener el estado
        // Esto evita perder el estado de Zustand y permite que ConversationPane procese inmediatamente
        router.push(targetUrl);
        
        return result.caseId;
    }, [currentCaseId, setInitialMessage, router]);

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
            
            // ✅ CORRECCIÓN: Crear caso si no existe (igual que handleApproveWithValidation)
            await createCaseIfNeeded(briefUpdate);
            
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
    }, [setBrief, createCaseIfNeeded]);

    // ✅ CORRECCIÓN: Optimizar con useCallback - ahora usa createCaseIfNeeded (unifica con handleFormSubmit)
    const handleApproveWithValidation = useCallback(async () => {
        // ✅ CORRECCIÓN CRÍTICA: Establecer estados de bloqueo INMEDIATAMENTE
        setIsSubmitting(true);
        useUI.setState({ caseApproving: true });
        console.log('🔒 [CaseBriefForm] Botones bloqueados para sincronización');
        
        try {
            // Actualizar brief con datos actuales del formulario
            const currentBrief = useUI.getState().brief;
            setBrief(currentBrief);
            
            // ✅ PASO 1: Crear el caso SI no existe (usando función compartida)
            const caseId = await createCaseIfNeeded(currentBrief);
            
            // Si el caso fue creado, createCaseIfNeeded navegó con router.push()
            // En navegación SPA, el código continúa ejecutándose, así que verificamos si navegó
            // Si llegamos aquí y caseId existe pero es diferente de currentCaseId, el caso ya existía
            if (!caseId || caseId === currentCaseId) {
                console.log('✅ Caso ya existe, continuando con aprobación:', currentCaseId || caseId);
                
                // PASO 2: Validar y resolver cliente (solo si hay clientName)
                let clientId: string | null = null;
                if (currentBrief.clientName && currentBrief.clientName.trim()) {
                    try {
                        clientId = await validateAndResolveClient(currentBrief.clientName);
                        console.log('✅ Cliente validado/resuelto:', clientId);
                    } catch (error: any) {
                        console.warn('⚠️ Error al validar cliente (continuando sin cliente):', error);
                        // No bloquear el flujo si la validación del cliente falla
                        // El caso puede aprobarse sin cliente asociado
                    }
                } else {
                    console.log('ℹ️ No hay clientName en el brief, aprobando caso sin cliente');
                }
                
                // PASO 3: Aprobar el caso (ahora sí hay currentCaseId)
            const success = await approveCurrentCase(clientId);
            if (!success) {
                    console.log('❌ Aprobación falló');
                } else {
                    console.log('✅ Caso aprobado exitosamente');
                }
            }
        } catch (error: any) {
            console.error('❌ Error en aprobación con validación:', error);
            
            // ✅ CORRECCIÓN: Mensajes de error más específicos y descriptivos
            let errorMessage = 'Error inesperado. Por favor, inténtalo de nuevo.';
            
            // Manejar errores específicos del hook de validación
            if (error.message === "CLIENT_CREATION_CANCELLED") {
                console.log('Usuario canceló la creación del cliente');
                errorMessage = 'La creación del cliente fue cancelada.';
            } else if (error.message === "CLIENT_CREATION_FAILED") {
                console.error('Error al crear el cliente');
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
        } finally {
            // ✅ CORRECCIÓN: Resetear estados de carga
            setIsSubmitting(false);
            useUI.setState({ caseApproving: false });
        }
    }, [currentCaseId, setBrief, validateAndResolveClient, createCaseIfNeeded]); // ✅ Dependencias del useCallback

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
            </div>
        </div>
    );
}
