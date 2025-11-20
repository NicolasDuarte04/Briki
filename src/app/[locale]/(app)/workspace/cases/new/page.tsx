// /src/app/[locale]/(app)/workspace/cases/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BriefForm, CaseBriefData } from '@/components/Cases/BriefForm';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useUI } from '@/lib/ui/state';

export default function NewCasePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setStep } = useUI();

  const handleCreateCase = async (data: CaseBriefData) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Obtener orgId primero
      const authResponse = await fetch('/api/auth/me');
      if (!authResponse.ok) {
        throw new Error('No se pudo obtener la información del usuario');
      }
      const { orgId } = await authResponse.json();
      
      const response = await fetch('/api/cases/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgId, // Agregar orgId
          // Mapear los datos del BriefForm a la estructura que espera la API
          clientName: data.clientName,
          businessType: data.businessType,
          employees: data.employees,
          status: 'draft',
          stage: 'initial',
          priority: 'medium',
          briefData: {
            freeText: data.notes,
            businessType: data.businessType,
            employees: data.employees,
            coverage: data.coverage,
          },
          // Nuevos campos del Brief detallado
          insurance_category: data.insurance_category,
          max_budget: data.max_budget,
          budget_currency: data.budget_currency,
          required_coverages: data.required_coverages,
          client_profile: data.client_profile,
          // ✅ Añadir tempUploads si existen
          tempUploads: data.tempUploads || [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el caso');
      }

      const result = await response.json();
      
      // Redirigir al caso creado
      router.push(`/workspace/cases/${result.caseId}`);
    } catch (err) {
      console.error('Error creating case:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido al crear el caso');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/workspace/cases">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Caso</h1>
          <p className="text-muted-foreground mt-1">
            Proporciona información detallada para obtener las mejores recomendaciones de seguros
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {/* Form */}
      <BriefForm 
        onSubmit={handleCreateCase} 
        isSubmitting={isSubmitting}
        initialNotes=""
      />
    </div>
  );
}
