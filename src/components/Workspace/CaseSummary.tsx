// src/components/Workspace/CaseSummary.tsx
'use client';

import { CaseBrief } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, User, Building2, DollarSign, Shield, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CaseSummaryProps {
  brief: Partial<CaseBrief>; // Borrador de Zustand (fallback)
  activeCaseData?: any;      // ✅ FASE 2: Datos frescos de la BD (Fuente de Verdad)
  onEdit: () => void; // Función para volver al modo de edición
}

export function CaseSummary({ brief, activeCaseData, onEdit }: CaseSummaryProps) {
    const t = useTranslations('workspace.caseBrief.summary');
    // ✅ FASE 2: CORRECCIÓN DE FUENTE DE VERDAD
    // Prioriza los datos frescos de la BD (activeCaseData).
    // Usa el 'brief' de Zustand solo como fallback.
    const isCompanyCase = (activeCaseData?.subjectType || (brief as any)?.subjectType) === 'company';
    const displayData = activeCaseData ? {
        clientName: isCompanyCase
            ? (activeCaseData.clientName ?? (brief as any)?.companyName ?? brief.clientName ?? 'N/A')
            : (activeCaseData.clientName ?? brief.clientName ?? 'N/A'),
        client_profile: activeCaseData.client_profile ?? brief.client_profile ?? 'N/A',
        employees: activeCaseData.employees ?? brief.employees ?? 'N/A',
        insurance_category: activeCaseData.insurance_category ?? brief.insurance_category ?? 'N/A',
        max_budget: activeCaseData.max_budget ? Number(activeCaseData.max_budget) : (brief.max_budget ?? 'N/A'),
        budget_currency: activeCaseData.budget_currency ?? brief.budget_currency ?? 'COP',
        freeText: (activeCaseData.briefData as any)?.freeText ?? brief.freeText ?? 'N/A',
    } : brief; // Fallback al 'brief' de Zustand si no hay activeCaseData
    return (
        <div className="p-4 space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">{t('title')}</h3>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                    ✓ {t('approved')}
                </Badge>
            </div>

            <div className="grid gap-4">
                {/* Información del Sujeto */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            {isCompanyCase ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            {isCompanyCase ? t('companyInfo') : t('clientInfo')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">{t('name')}</span>
                            <span className="text-sm font-medium">{displayData.clientName || 'N/A'}</span>
                        </div>
                        {isCompanyCase && displayData.employees !== null && displayData.employees !== undefined && displayData.employees !== 'N/A' && (
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">{t('employees')}</span>
                                <span className="text-sm font-medium">{displayData.employees}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">{t('profile')}</span>
                            <span className="text-sm font-medium whitespace-pre-wrap">{displayData.client_profile || 'N/A'}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Información del Seguro */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            {t('insuranceInfo')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">{t('category')}</span>
                            <span className="text-sm font-medium">{displayData.insurance_category || 'N/A'}</span>
                        </div>
                        {displayData.max_budget !== null && displayData.max_budget !== undefined && displayData.max_budget !== 'N/A' && (
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">{t('budget')}</span>
                                <span className="text-sm font-medium">
                                    {typeof displayData.max_budget === 'number' 
                                        ? `${displayData.max_budget} ${displayData.budget_currency || 'COP'}` 
                                        : displayData.max_budget}
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Notas Adicionales */}
                {displayData.freeText && displayData.freeText !== 'Por definir...' && displayData.freeText !== 'N/A' && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                {t('additionalNotes')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{displayData.freeText}</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Button variant="outline" onClick={onEdit} className="w-full mt-6">
                <FileText className="w-4 h-4 mr-2" />
                {t('editBrief')}
            </Button>
        </div>
    );
}
