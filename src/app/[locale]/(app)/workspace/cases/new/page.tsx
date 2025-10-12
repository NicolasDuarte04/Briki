// /src/app/[locale]/(app)/workspace/cases/new/page.tsx
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { CaseForm } from '@/components/Cases/CaseForm';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function NewCasePage() {
  const { user, currentOrg } = await getCurrentOrg();
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/workspace/cases">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Caso</h1>
          <p className="text-muted-foreground mt-1">
            Completa la información del cliente y el caso
          </p>
        </div>
      </div>
      
      {/* Form */}
      <CaseForm orgId={currentOrg.id} userId={user.id} />
    </div>
  );
}
