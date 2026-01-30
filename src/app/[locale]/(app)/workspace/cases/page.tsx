// /src/app/[locale]/(app)/workspace/cases/page.tsx
import { getCasesByOrg } from '@/lib/database';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { getUserPins } from '@/lib/data/workspace';
import { CaseList } from '@/components/Cases/CaseList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function CasesPage() {
  // Obtener usuario y organización actual
  const { user, currentOrg } = await getCurrentOrg();
  const t = await getTranslations('cases');
  const locale = await getLocale();
  
  // Obtener casos de la organización y pins del usuario
  const [cases, userPins] = await Promise.all([
    getCasesByOrg(currentOrg.id),
    getUserPins(user.id),
  ]);
  
  // Convertir a Set para búsqueda eficiente
  const pinnedCaseIds = new Set(userPins.cases);
  
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('subtitle')}
          </p>
        </div>
        <Link href={`/${locale}/agent/new-thread-placeholder`}>
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            {t('newCase')}
          </Button>
        </Link>
      </div>
      
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold">{cases.length}</div>
          <div className="text-sm text-muted-foreground">{t('stats.total')}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold">
            {cases.filter(c => c.status === 'active').length}
          </div>
          <div className="text-sm text-muted-foreground">{t('stats.active')}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold">
            {cases.filter(c => c.status === 'draft').length}
          </div>
          <div className="text-sm text-muted-foreground">{t('stats.drafts')}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold">
            {cases.filter(c => c.priority === 'urgent' || c.priority === 'high').length}
          </div>
          <div className="text-sm text-muted-foreground">{t('stats.highPriority')}</div>
        </div>
      </div>
      
      {/* Cases List */}
      <CaseList cases={cases} orgId={currentOrg.id} pinnedCaseIds={pinnedCaseIds} />
    </div>
  );
}
