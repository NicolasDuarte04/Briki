// src/app/[locale]/(app)/workspace/cases/[id]/edit/CaseEditContent.tsx
'use client';

import { useState } from 'react';
import { BriefForm, CaseBriefData } from '@/components/Cases/BriefForm';
import { useRouter } from 'next/navigation';
import { Case } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface CaseEditContentProps {
  caseData: Case;
  caseId: string;
  orgId: string;
}

export default function CaseEditContent({ caseData, caseId, orgId }: CaseEditContentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleUpdateCase = async (formData: CaseBriefData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/cases/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          caseId, 
          orgId,
          ...formData,
          tempUploads: formData.tempUploads || [] // ✅ Pasar explícitamente
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el caso');
      }

      setSuccess('¡Caso actualizado exitosamente! Redirigiendo...');
      
      // Redirigir después de 2 segundos para que el usuario vea el mensaje
      setTimeout(() => {
        router.push(`/workspace/cases/${caseId}`);
        router.refresh();
      }, 2000);

    } catch (error) {
      console.error('Failed to update case:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/workspace/cases/${caseId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Editar Caso: {caseData.clientName || 'Sin nombre'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ID: {caseData.id}
          </p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-destructive/15 text-destructive rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-500/15 text-green-600 rounded-lg">
          {success}
        </div>
      )}

      {/* Formulario de Edición */}
      <div className="max-w-4xl">
        <BriefForm
          onSubmit={handleUpdateCase}
          isSubmitting={isSubmitting}
          initialData={caseData}
          mode="edit"
          orgId={orgId}
        />
      </div>
    </div>
  );
}
