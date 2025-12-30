import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { getCaseStatsByOrg } from '@/lib/database';
import { 
  getContinueItem,
  getRecentPolicies, 
  getRecentProposals,
  getRecentCases
} from '@/lib/data/workspace';
import type { 
  RecentPolicy, 
  RecentProposal,
  RecentCase
} from '@/lib/data/workspace';
import { Skeleton } from '@/components/ui/skeleton';
import { ContinueCard } from '@/components/Workspace/ContinueCard';
import { QuickActions } from '@/components/Workspace/QuickActions';
import { Recents } from '@/components/Workspace/Recents';
import { RecentCases } from '@/components/Workspace/RecentCases';
import { PinnedCases } from '@/components/Workspace/PinnedCases';
import { PinnedClients } from '@/components/Workspace/PinnedClients';
import { PinnedPolicies } from '@/components/Workspace/PinnedPolicies';
import { ZeroState } from '@/components/Workspace/ZeroState';
import { pathForEntity, pathForCases } from '@/lib/routes/workspace';
import type { Locale } from '@/lib/routes/workspace';
import DashboardViewTracker from './DashboardViewTracker';

export const dynamic = 'force-dynamic';

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================

function ContinueCardSkeleton() {
  return (
    <div className="rounded-card shadow-elev-sm bg-[var(--card)] p-6">
      <Skeleton className="h-5 w-32 mb-4" />
      <Skeleton className="h-8 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

function QuickActionsSkeleton() {
  return (
    <div className="rounded-card shadow-elev-sm bg-[var(--card)] p-6">
      <Skeleton className="h-5 w-32 mb-4" />
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

function RecentsSkeleton() {
  return (
    <div className="rounded-card shadow-elev-sm bg-[var(--card)] p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

function PinnedSkeleton() {
  return (
    <div className="rounded-card shadow-elev-sm bg-[var(--card)] p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-32 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD SECTIONS (WRAPPERS FOR SHARED COMPONENTS)
// ============================================================================

async function ContinueCardWrapper({ userId, orgId, locale }: { userId: string; orgId: string; locale: Locale }) {
  const continueItem = await getContinueItem(userId, orgId);
  
  if (!continueItem) {
    return null;
  }
  
  // Adapt ContinueItem to match ContinueCard props
  const item = {
    id: continueItem.id,
    entity_type: 'case' as const,
    title: continueItem.title,
    client_name: continueItem.title, // Use title as client_name for now
    updated_at: continueItem.updatedAt,
    status: continueItem.stage,
  };
  
  return <ContinueCard item={item} locale={locale} />;
}

async function RecentPoliciesWrapper({ orgId, locale }: { orgId: string; locale: Locale }) {
  const policies = await getRecentPolicies(orgId);
  
  // Adapt RecentPolicy to RecentItem format
  const items = policies.map((policy: RecentPolicy) => ({
    id: policy.id,
    title: policy.title,
    client: policy.client_name,
    status: policy.status,
    updated_at: policy.updated_at,
    href: pathForEntity('policy', policy.id, locale),
  }));
  
  return (
    <Recents
      title="Recientes: Pólizas"
      items={items}
      viewAllHref={`${pathForCases(locale)}?filter=policies`}
      emptyActionHref={pathForEntity('case', 'new', locale)}
      emptyActionLabel="Crear nueva póliza"
    />
  );
}

async function RecentProposalsWrapper({ orgId, locale }: { orgId: string; locale: Locale }) {
  const proposals = await getRecentProposals(orgId);
  
  // Adapt RecentProposal to RecentItem format
  const items = proposals.map((proposal: RecentProposal) => ({
    id: proposal.id,
    title: proposal.title,
    client: proposal.client_name,
    status: proposal.status,
    updated_at: proposal.updated_at,
    href: pathForEntity('proposal', proposal.id, locale),
  }));
  
  return (
    <Recents
      title="Recientes: Propuestas"
      items={items}
      viewAllHref={`${pathForCases(locale)}?filter=proposals`}
      emptyActionHref={pathForEntity('proposal', 'new', locale)}
      emptyActionLabel="Crear nueva propuesta"
    />
  );
}

async function RecentCasesWrapper({ orgId, locale }: { orgId: string; locale: Locale }) {
  const cases = await getRecentCases(orgId);
  
  // Adapt RecentCase to RecentCaseItem format
  const items = cases.map((caseItem: RecentCase) => ({
    id: caseItem.id,
    title: caseItem.title,
    client: caseItem.client_name,
    status: caseItem.status,
    updated_at: caseItem.updated_at,
  }));
  
  return (
    <RecentCases
      title="Recientes: Casos"
      items={items}
      locale={locale}
    />
  );
}

async function PinnedCasesWrapper({ userId, orgId, locale }: { userId: string; orgId: string; locale: Locale }) {
  return <PinnedCases userId={userId} orgId={orgId} locale={locale} />;
}

async function PinnedClientsWrapper({ userId, orgId, locale }: { userId: string; orgId: string; locale: Locale }) {
  return <PinnedClients userId={userId} orgId={orgId} locale={locale} />;
}

async function PinnedPoliciesWrapper({ userId, orgId, locale }: { userId: string; orgId: string; locale: Locale }) {
  return <PinnedPolicies userId={userId} orgId={orgId} locale={locale} />;
}

// ============================================================================
// MAIN DASHBOARD PAGE
// ============================================================================

export default async function DashboardPage({
  params,
}: {
  params: { locale: string };
}) {
  // ✅ CORRECCIÓN CRÍTICA: Manejo robusto de errores de conexión
  let user, currentOrg, orgId, userId, locale, stats, hasContent;
  
  try {
    const orgData = await getCurrentOrg();
    user = orgData.user;
    currentOrg = orgData.currentOrg;
    const awaitedParams = await params;
    orgId = currentOrg.id;
    userId = user.id;
    locale = awaitedParams.locale as 'en' | 'es';

    // Obtener estadísticas para detectar zero-state
    stats = await getCaseStatsByOrg(orgId);
    hasContent = stats.total > 0;
  } catch (error: any) {
    // ✅ CORRECCIÓN: Detectar errores de conexión a la base de datos
    const isDatabaseError = 
      error.message?.includes('Database connection') ||
      error.message?.includes('Can\'t reach database server') ||
      error.message?.includes('database server is running') ||
      error.name === 'PrismaClientInitializationError' ||
      error.code === 'P1001' ||
      error.code === 'P2024';
    
    if (isDatabaseError) {
      console.error('❌ [Dashboard] Error de conexión a la base de datos:', error.message);
      
      // Obtener locale para el redirect
      const awaitedParams = await params;
      const errorLocale = awaitedParams.locale as 'en' | 'es';
      const dashboardPath = `/${errorLocale}/dashboard`;
      
      // Mostrar página de error amigable
      return (
        <div className="container mx-auto py-8 px-4 md:px-6">
          <div className="rounded-card shadow-elev-sm bg-[var(--card)] p-8 text-center">
            <h1 className="text-2xl font-bold mb-4 text-[var(--foreground)]">
              Error de Conexión
            </h1>
            <p className="text-[var(--muted-foreground)] mb-6">
              No se pudo conectar con la base de datos. Esto puede ser un problema temporal.
            </p>
            <div className="space-y-2 text-sm text-[var(--muted-foreground)] mb-6">
              <p>Por favor, intenta:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Esperar unos segundos y recargar la página</li>
                <li>Verificar tu conexión a internet</li>
                <li>Contactar al administrador si el problema persiste</li>
              </ul>
            </div>
            <form action={async () => { redirect(dashboardPath); }}>
              <button
                type="submit"
                className="px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-md hover:opacity-90"
              >
                Reintentar
              </button>
            </form>
          </div>
        </div>
      );
    }
    
    // Para otros errores, lanzar normalmente para que Next.js los maneje
    throw error;
  }
  
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <DashboardViewTracker />
      <h1 className="text-3xl font-bold mb-8 text-[var(--foreground)]">
        Resumen
      </h1>
      
      {hasContent ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Row 1: Continuar (2/3) + Acciones rápidas (1/3) */}
          <div className="md:col-span-8">
            <Suspense fallback={<ContinueCardSkeleton />}>
              <ContinueCardWrapper userId={userId} orgId={orgId} locale={locale} />
            </Suspense>
          </div>
          
          <div className="md:col-span-4">
            <Suspense fallback={<QuickActionsSkeleton />}>
              <QuickActions orgId={orgId} locale={locale} />
            </Suspense>
          </div>
          
          {/* Row 2: Recientes: Casos (izquierda) + Recientes: Pólizas (derecha) */}
          <div className="md:col-span-6">
            <Suspense fallback={<RecentsSkeleton />}>
              <RecentCasesWrapper orgId={orgId} locale={locale} />
            </Suspense>
          </div>
          
          <div className="md:col-span-6">
            <Suspense fallback={<RecentsSkeleton />}>
              <RecentPoliciesWrapper orgId={orgId} locale={locale} />
            </Suspense>
          </div>
          
          {/* Row 3: Casos anclados (full width) */}
          <div className="md:col-span-12">
            <Suspense fallback={<PinnedSkeleton />}>
              <PinnedCasesWrapper userId={userId} orgId={orgId} locale={locale} />
            </Suspense>
          </div>
          
          {/* Row 4: Clientes anclados (full width) */}
          <div className="md:col-span-12">
            <Suspense fallback={<PinnedSkeleton />}>
              <PinnedClientsWrapper userId={userId} orgId={orgId} locale={locale} />
            </Suspense>
          </div>
          
          {/* Row 5: Pólizas ancladas (full width) */}
          <div className="md:col-span-12">
            <Suspense fallback={<PinnedSkeleton />}>
              <PinnedPoliciesWrapper userId={userId} orgId={orgId} locale={locale} />
            </Suspense>
          </div>
        </div>
      ) : (
        <ZeroState locale={locale} />
      )}
    </div>
  );
}


