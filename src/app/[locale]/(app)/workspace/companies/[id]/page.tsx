// /src/app/[locale]/(app)/workspace/companies/[id]/page.tsx
import { getCompanyById } from '@/lib/companiesDb';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { notFound } from 'next/navigation';
import { CompanyDetailContent } from './CompanyDetailContent';

export const dynamic = 'force-dynamic';

interface CompanyDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { currentOrg } = await getCurrentOrg();
  const { id } = await params;
  
  // Obtener la empresa (los datos ya vienen descifrados)
  const company = await getCompanyById(id, currentOrg.id);
  
  if (!company) {
    notFound();
  }
  
  return <CompanyDetailContent company={company} companyId={id} orgId={currentOrg.id} />;
}
