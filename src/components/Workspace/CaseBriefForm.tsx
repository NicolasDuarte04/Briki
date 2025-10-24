// src/components/Workspace/CaseBriefForm.tsx
'use client';

import { useState } from 'react';
import { useUI } from '@/lib/ui/state';
import { BriefForm, CaseBriefData } from '@/components/Cases/BriefForm';
import { CaseBrief } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useClientValidation } from '@/hooks/useClientValidation';

export default function CaseBriefForm() {
    const { brief, setBrief, currentCaseId, approveCurrentCase, caseApproving, caseApproved, setCaseApproved } = useUI();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const t = useTranslations("workspace.caseBrief");
    
    // Hook para validación de clientes (coordinado con ConversationPane)
    const { validateAndResolveClient, isLoading: isClientValidationLoading } = useClientValidation();
    
    // El estado de edición ahora es una derivación directa del estado global.
    // El formulario está en modo edición si el caso NO está aprobado.
    const isEditing = !caseApproved;
    
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
            
            // Validar y resolver cliente antes de aprobar
            const clientId = await validateAndResolveClient(currentBrief.clientName);
            
            // Aprobar el caso con el clientId resuelto
            const success = await approveCurrentCase(clientId);
            if (!success) {
                console.log('Aprobación falló');
            }
        } catch (error: any) {
            console.error('Error en aprobación con validación:', error);
            
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
                {isEditing ? (
                    <BriefForm
                        onSubmit={handleFormSubmit}
                        onApprove={handleApproveWithValidation}
                        isSubmitting={isSubmitting || caseApproving || isClientValidationLoading}
                        initialNotes={brief.freeText || ''}
                    />
                ) : (
                    <div>{/* Aquí iría la vista de solo lectura del brief */}</div>
                )}
            </div>
        </div>
    );
}
