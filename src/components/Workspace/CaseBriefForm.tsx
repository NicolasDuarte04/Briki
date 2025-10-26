// src/components/Workspace/CaseBriefForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useUI } from '@/lib/ui/state';
import { BriefForm, CaseBriefData } from '@/components/Cases/BriefForm';
import { CaseBrief } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useClientValidation } from '@/hooks/useClientValidation';

export default function CaseBriefForm() {
    const { brief, setBrief, currentCaseId, approveCurrentCase, caseApproving, caseApproved, setCaseApproved } = useUI();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orgId, setOrgId] = useState<string | null>(null); // ✅ Estado para orgId
    const t = useTranslations("workspace.caseBrief");
    
    // Hook para validación de clientes (coordinado con ConversationPane)
    const { validateAndResolveClient, isLoading: isClientValidationLoading } = useClientValidation();
    
    // ✅ CONSISTENCIA DE ESTADO UNIDIRECCIONAL: 
    // isEditing determina si el formulario está en modo "edición" (modificar existente)
    // Si hay currentCaseId, estamos editando un caso existente
    // Si NO hay currentCaseId, estamos creando un nuevo caso (pero aun así mostramos el formulario)
    const isEditing = !!currentCaseId && !caseApproved;
    
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
    
    // Función para volver al modo de edición
    const handleEdit = () => {
        setCaseApproved(false);
    };

    const handleFormSubmit = async (data: CaseBriefData) => {
        setIsSubmitting(true);
        try {
            // Actualiza el brief en el estado global para que la función de aprobación tenga los datos más recientes.
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
            if (data.employees !== null) {
                briefUpdate.employees = data.employees;
            }
            if (data.max_budget !== null) {
                briefUpdate.max_budget = data.max_budget;
            }
            
            setBrief(briefUpdate);
            
            // La validación de clientes se maneja en el componente padre (ConversationPane)
            // Solo proceder con la aprobación
            await approveCurrentCase();
            
            // El estado de edición ahora se maneja automáticamente por caseApproved
        } catch (error: any) {
            console.error('Error updating case brief:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Función de aprobación con validación de clientes
    const handleApproveWithValidation = async () => {
        setIsSubmitting(true);
        try {
            // Actualizar brief con datos actuales del formulario
            const currentBrief = useUI.getState().brief;
            setBrief(currentBrief);
            
            // PASO 1: Crear el caso SI no existe
            if (!currentCaseId) {
                console.log('📝 No hay currentCaseId, creando caso...');
                
                // Obtener información del usuario
                const authResponse = await fetch('/api/auth/me');
                if (!authResponse.ok) {
                    throw new Error('No se pudo obtener información del usuario');
                }
                const { orgId, userId } = await authResponse.json();
                console.log('👤 Usuario autenticado:', { orgId, userId });
                
                // ✅ Crear el caso con tempUploads si existen
                const tempUploads = (currentBrief as any).tempUploads || [];
                console.log('📎 [CaseBriefForm] Creando caso con tempUploads:', tempUploads.length);
                
                const response = await fetch('/api/cases/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orgId,
                        userId,
                        clientName: currentBrief.clientName,
                        businessType: currentBrief.businessType,
                        employees: currentBrief.employees,
                        status: 'draft', // ✅ Estado correcto para aprobación posterior
                        stage: 'initial',
                        priority: 'medium',
                        briefData: {
                            freeText: currentBrief.freeText,
                            businessType: currentBrief.businessType,
                            employees: currentBrief.employees,
                            coverage: currentBrief.coverage,
                        },
                        insurance_category: currentBrief.insurance_category,
                        max_budget: currentBrief.max_budget,
                        budget_currency: currentBrief.budget_currency,
                        required_coverages: currentBrief.required_coverages,
                        client_profile: currentBrief.client_profile,
                        tempUploads: tempUploads, // ✅ Incluir PDFs temporales
                    }),
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error al crear el caso');
                }
                
                const result = await response.json();
                console.log('✅ Caso creado exitosamente:', result.caseId);
                
                // Establecer currentCaseId inmediatamente después de crear el caso
                useUI.getState().setCurrentCaseId(result.caseId);
                console.log('💾 currentCaseId establecido en:', result.caseId);
            } else {
                console.log('✅ Ya existe currentCaseId:', currentCaseId);
            }
            
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
        } catch (error: any) {
            console.error('❌ Error en aprobación con validación:', error);
            
            // Manejar errores específicos del hook de validación
            if (error.message === "CLIENT_CREATION_CANCELLED") {
                console.log('Usuario canceló la creación del cliente');
            } else if (error.message === "CLIENT_CREATION_FAILED") {
                console.error('Error al crear el cliente');
                alert('Error al crear el cliente. Por favor, inténtalo de nuevo.');
            } else {
                console.error('Error inesperado en la validación:', error);
                alert('Error inesperado. Por favor, inténtalo de nuevo.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

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
                    initialNotes={brief.freeText || ''}
                    orgId={orgId || ''} // ✅ Pasar orgId
                    mode={isEditing ? 'edit' : 'create'} // ✅ Pasar el modo
                />
            </div>
        </div>
    );
}
