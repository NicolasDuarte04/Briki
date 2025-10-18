// src/components/Workspace/CaseSummary.tsx
'use client';

import { CaseBrief } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, User, Building, DollarSign, Shield, MessageSquare } from 'lucide-react';

interface CaseSummaryProps {
  brief: Partial<CaseBrief>;
  onEdit: () => void; // Función para volver al modo de edición
}

export function CaseSummary({ brief, onEdit }: CaseSummaryProps) {
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
                            <span className="text-sm font-medium">{brief.clientName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Perfil:</span>
                            <span className="text-sm font-medium">{brief.client_profile || 'N/A'}</span>
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
                            <span className="text-sm font-medium">{brief.businessType || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Empleados:</span>
                            <span className="text-sm font-medium">{brief.employees || 'N/A'}</span>
                        </div>
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
                            <span className="text-sm font-medium">{brief.insurance_category || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Cobertura:</span>
                            <span className="text-sm font-medium">{brief.coverage || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Presupuesto:</span>
                            <span className="text-sm font-medium">
                                {brief.max_budget ? `${brief.max_budget} ${brief.budget_currency || 'COP'}` : 'N/A'}
                            </span>
                        </div>
                        {brief.required_coverages && brief.required_coverages.length > 0 && (
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Coberturas Requeridas:</span>
                                <span className="text-sm font-medium">{brief.required_coverages.join(', ')}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Notas Adicionales */}
                {brief.freeText && brief.freeText !== 'Por definir...' && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                Notas Adicionales
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{brief.freeText}</p>
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
