// /src/app/[locale]/(app)/workspace/cases/page.tsx
import { getCasesByOrg } from '@/lib/database';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { CaseList } from '@/components/Cases/CaseList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CasesPage() {
  // Obtener usuario y organización actual
  const { currentOrg } = await getCurrentOrg();
  
  // Obtener casos de la organización
  const cases = await getCasesByOrg(currentOrg.id);
  
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Casos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona y da seguimiento a todos tus casos de seguros
          </p>
        </div>
        <Link href="/workspace/cases/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Nuevo Caso
          </Button>
        </Link>
      </div>
      
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold">{cases.length}</div>
          <div className="text-sm text-muted-foreground">Total de Casos</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold">
            {cases.filter(c => c.status === 'active').length}
          </div>
          <div className="text-sm text-muted-foreground">Casos Activos</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold">
            {cases.filter(c => c.status === 'draft').length}
          </div>
          <div className="text-sm text-muted-foreground">Borradores</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold">
            {cases.filter(c => c.priority === 'urgent' || c.priority === 'high').length}
          </div>
          <div className="text-sm text-muted-foreground">Alta Prioridad</div>
        </div>
      </div>
      
      {/* Cases List */}
      <CaseList cases={cases} orgId={currentOrg.id} />
    </div>
  );
}
