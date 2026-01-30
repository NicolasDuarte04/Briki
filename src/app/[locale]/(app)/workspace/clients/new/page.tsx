// /src/app/[locale]/(app)/workspace/clients/new/page.tsx
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { ClientFormClient } from '@/components/Clients/ClientFormClient';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function NewClientPage() {
  const { currentOrg } = await getCurrentOrg();
  const locale = await getLocale();
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/${locale}/workspace/clients`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Cliente</h1>
          <p className="text-muted-foreground mt-1">
            Añade un nuevo cliente a tu organización
          </p>
        </div>
      </div>
      
      {/* Form */}
      <ClientFormClient orgId={currentOrg.id} />
    </div>
  );
}
