// /src/app/[locale]/(app)/workspace/cases/[id]/page.tsx
import type { Locale } from '@/lib/routes/workspace';
import { getCaseById } from '@/lib/database';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { notFound } from 'next/navigation';
import { CaseDetailContent } from './CaseDetailContent';
import { logActivity } from '@/lib/activities';

// Configuración de Next.js para forzar renderizado dinámico
export const dynamic = 'force-dynamic';

interface CaseDetailPageProps {
  params: Promise<{
    id: string;
    locale: Locale;
  }>;
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { user, currentOrg } = await getCurrentOrg();
  const { id, locale } = await params;
  
  // Obtener el caso específico
  const caseData = await getCaseById(id, currentOrg.id);
  
  if (!caseData) {
    notFound();
  }
  
  // Log the case view activity (server-side, non-blocking)
  await logActivity({
    userId: user.id,
    orgId: currentOrg.id,
    entityType: 'case',
    entityId: id,
    action: 'view',
  });
  
  return <CaseDetailContent caseData={caseData} caseId={id} orgId={currentOrg.id} locale={locale} />;
}
