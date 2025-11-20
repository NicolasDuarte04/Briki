// /src/app/[locale]/(app)/workspace/cases/[id]/page.tsx
import { getCaseById } from '@/lib/database';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { notFound } from 'next/navigation';
import { CaseDetailContent } from './CaseDetailContent';

// Configuración de Next.js para forzar renderizado dinámico
export const dynamic = 'force-dynamic';

interface CaseDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { currentOrg } = await getCurrentOrg();
  const { id } = await params;
  
  // Obtener el caso específico
  const caseData = await getCaseById(id, currentOrg.id);
  
  if (!caseData) {
    notFound();
  }
  
  return <CaseDetailContent caseData={caseData} caseId={id} orgId={currentOrg.id} />;
}
