// src/components/Workspace/CaseBriefForm.tsx
'use client';

import { useState } from 'react';
import { useUI } from '@/lib/ui/state';
import { BriefForm, CaseBriefData } from '@/components/Cases/BriefForm';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

export default function CaseBriefForm() {
    const { brief, setBrief, currentCaseId, approveCurrentCase, caseApproving } = useUI();
    const [isEditing, setIsEditing] = useState(true); // Inicia en modo edición por defecto para el nuevo flujo
    const [isSubmitting, setIsSubmitting] = useState(false);
    const t = useTranslations("workspace.caseBrief");

    const handleFormSubmit = async (data: CaseBriefData) => {
        setIsSubmitting(true);
        try {
            // 1. Actualiza el brief en el estado global para que la función de aprobación tenga los datos más recientes.
            setBrief({
                businessType: data.businessType,
                employees: data.employees,
                coverage: data.coverage,
                freeText: data.freeText,
            });
            
            // 2. Llama a la función unificada.
            await approveCurrentCase();
            
            setIsEditing(false); // Cambia a modo de solo lectura tras guardar
        } catch (error) {
            console.error('Error updating case brief:', error);
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
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        Editar
                    </Button>
                )}
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
                {isEditing ? (
                    <BriefForm
                        onSubmit={handleFormSubmit}
                        isSubmitting={isSubmitting || caseApproving}
                        initialNotes={brief.freeText || ''}
                    />
                ) : (
                    <div>{/* Aquí iría la vista de solo lectura del brief */}</div>
                )}
            </div>
        </div>
    );
}
