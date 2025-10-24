// /src/app/[locale]/(app)/workspace/cases/[id]/CaseDetailContent.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface CaseDetailContentProps {
  caseData: any; // Tipo del caso
  caseId: string;
  orgId: string;
}

export function CaseDetailContent({ caseData, caseId, orgId }: CaseDetailContentProps) {
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/workspace/cases">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {caseData.clientName || 'Caso sin nombre'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ID: {caseData.id}
          </p>
        </div>
      </div>
      
      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{caseData.status}</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Etapa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{caseData.stage}</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Prioridad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{caseData.priority || 'Normal'}</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {caseData.artifacts?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Información del Caso */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Caso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Cliente</label>
              <p className="text-sm">{caseData.clientName || 'Sin especificar'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tipo de Negocio</label>
              <p className="text-sm">{caseData.businessType || 'Sin especificar'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Empleados</label>
              <p className="text-sm">{caseData.employees || 'Sin especificar'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Cobertura</label>
              <p className="text-sm">{caseData.coverage || 'Sin especificar'}</p>
            </div>
          </div>
          
          {caseData.briefData?.freeText && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Descripción</label>
              <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                {caseData.briefData.freeText}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}