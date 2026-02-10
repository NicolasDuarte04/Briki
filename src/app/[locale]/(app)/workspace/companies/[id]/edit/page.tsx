// src/app/[locale]/(app)/workspace/companies/[id]/edit/page.tsx
import { getCompanyById } from '@/lib/companiesDb';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { notFound } from 'next/navigation';
import { CompanyEditContent } from './CompanyEditContent';

export const dynamic = 'force-dynamic';

interface EditCompanyPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCompanyPage({ params }: EditCompanyPageProps) {
  const { currentOrg, userId } = await getCurrentOrg();
  const { id } = await params;
  
  // Obtener la empresa (los datos ya vienen descifrados)
  const company = await getCompanyById(id, currentOrg.id);
  
  if (!company) {
    notFound();
  }

  return (
    <CompanyEditContent
      company={company}
      companyId={id}
      orgId={currentOrg.id}
      userId={userId}
    />
  );
}
