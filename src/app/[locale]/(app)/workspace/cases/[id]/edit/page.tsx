// src/app/[locale]/(app)/workspace/cases/[id]/edit/page.tsx
import { getCaseById } from '@/lib/database';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import CaseEditContent from './CaseEditContent';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface EditCasePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCasePage({ params }: EditCasePageProps) {
  const { currentOrg } = await getCurrentOrg();
  const { id } = await params;
  
  // Obtener el caso específico
  // getCaseById retorna un objeto con max_budget convertido a number | null
  // en lugar de Decimal | null, por lo que usamos 'as any' para compatibilidad
  const caseData = await getCaseById(id, currentOrg.id);
  
  if (!caseData) {
    notFound();
  }

  return (
    <CaseEditContent
      caseData={caseData as any}
      caseId={id}
      orgId={currentOrg.id}
    />
  );
}
