// src/app/[locale]/(app)/workspace/cases/[id]/edit/page.tsx
import { getCaseById } from '@/lib/database';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import CaseEditContent from './CaseEditContent';
import { notFound } from 'next/navigation';

interface EditCasePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCasePage({ params }: EditCasePageProps) {
  const { currentOrg } = await getCurrentOrg();
  const { id } = await params;
  
  // Obtener el caso específico
  const caseData = await getCaseById(id, currentOrg.id);
  
  if (!caseData) {
    notFound();
  }

  return (
    <CaseEditContent
      caseData={caseData}
      caseId={id}
      orgId={currentOrg.id}
    />
  );
}
