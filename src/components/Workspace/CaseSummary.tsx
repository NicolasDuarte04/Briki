// src/components/Workspace/CaseSummary.tsx
'use client';

import { CaseBrief } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, User, Building, DollarSign, Shield, MessageSquare } from 'lucide-react';

interface CaseSummaryProps {
  brief: Partial<CaseBrief>; // Borrador de Zustand (fallback)
  activeCaseData?: any;      // ✅ FASE 2: Datos frescos de la BD (Fuente de Verdad)
  onEdit: () => void; // Función para volver al modo de edición
}

export function CaseSummary({ brief, activeCaseData, onEdit }: CaseSummaryProps) {
    // ✅ FASE 2: CORRECCIÓN DE FUENTE DE VERDAD
    // Prioriza los datos frescos de la BD (activeCaseData).
    // Usa el 'brief' de Zustand solo como fallback.
    const displayData = activeCaseData ? {
        clientName: activeCaseData.clientName ?? brief.clientName ?? 'N/A',
        client_profile: activeCaseData.client_profile ?? brief.client_profile ?? 'N/A',
        businessType: activeCaseData.businessType ?? brief.businessType ?? 'N/A',
        employees: activeCaseData.employees ?? brief.employees ?? 'N/A',
        insurance_category: activeCaseData.insurance_category ?? brief.insurance_category ?? 'N/A',
        coverage: (activeCaseData.briefData as any)?.coverage ?? brief.coverage ?? 'N/A',
        max_budget: activeCaseData.max_budget ? Number(activeCaseData.max_budget) : (brief.max_budget ?? 'N/A'),
        budget_currency: activeCaseData.budget_currency ?? brief.budget_currency ?? 'COP',
        required_coverages: activeCaseData.required_coverages ?? brief.required_coverages ?? [],
        freeText: (activeCaseData.briefData as any)?.freeText ?? brief.freeText ?? 'N/A',
    } : brief; // Fallback al 'brief' de Zustand si no hay activeCaseData
    return (
        <div className="p-4 space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Resumen del Caso</h3>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                    ✓ Aprobado
                </Badge>
            </div>

            <div className="grid gap-4">
                {/* Información del Cliente */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Información del Cliente
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Nombre:</span>
                            <span className="text-sm font-medium">{displayData.clientName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Perfil:</span>
                            <span className="text-sm font-medium whitespace-pre-wrap">{displayData.client_profile || 'N/A'}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Información del Negocio */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            Información del Negocio
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Tipo de Negocio:</span>
                            <span className="text-sm font-medium">{displayData.businessType || 'N/A'}</span>
                        </div>
                        {displayData.employees !== null && displayData.employees !== undefined && displayData.employees !== 'N/A' && (
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Empleados:</span>
                                <span className="text-sm font-medium">{displayData.employees}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Información del Seguro */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Información del Seguro
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Categoría:</span>
                            <span className="text-sm font-medium">{displayData.insurance_category || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Cobertura:</span>
                            <span className="text-sm font-medium">{displayData.coverage || 'N/A'}</span>
                        </div>
                        {displayData.max_budget !== null && displayData.max_budget !== undefined && displayData.max_budget !== 'N/A' && (
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Presupuesto:</span>
                                <span className="text-sm font-medium">
                                    {typeof displayData.max_budget === 'number' 
                                        ? `${displayData.max_budget} ${displayData.budget_currency || 'COP'}` 
                                        : displayData.max_budget}
                                </span>
                            </div>
                        )}
                        {displayData.required_coverages && Array.isArray(displayData.required_coverages) && displayData.required_coverages.length > 0 && (
                            <div className="mt-2">
                                <span className="text-sm text-muted-foreground block mb-2">Coberturas Imprescindibles:</span>
                                <div className="flex flex-wrap gap-2">
                                    {displayData.required_coverages.map((coverage: string, idx: number) => (
                                        <Badge key={idx} variant="secondary" className="text-xs">
                                            {coverage}
                                        </Badge>
                                    ))}
                                </div>
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
                                Notas Adicionales
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
                Editar Brief
            </Button>
        </div>
    );
}
