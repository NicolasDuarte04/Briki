// /src/app/[locale]/(app)/workspace/companies/new/page.tsx
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { CompanyFormClient } from '@/components/Companies/CompanyFormClient';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function NewCompanyPage() {
  const { currentOrg, user } = await getCurrentOrg();
  const locale = await getLocale();
  const t = await getTranslations('companies.form');
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/${locale}/workspace/companies`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('subtitle')}
          </p>
        </div>
      </div>
      
      {/* Form */}
      <CompanyFormClient orgId={currentOrg.id} userId={user.id} />
    </div>
  );
}
