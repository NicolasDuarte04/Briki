import { Suspense } from 'react';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { getCaseStatsByOrg } from '@/lib/database';
import { 
  getContinueItem,
  getRecentPolicies, 
  getRecentProposals,
  getRenewalsBuckets
} from '@/lib/data/workspace';
import type { 
  RecentPolicy, 
  RecentProposal 
} from '@/lib/data/workspace';
import { Skeleton } from '@/components/ui/skeleton';
import { InboxServer } from '@/components/Workspace/Inbox';
import { ContinueCard } from '@/components/Workspace/ContinueCard';
import { QuickActions } from '@/components/Workspace/QuickActions';
import { Recents } from '@/components/Workspace/Recents';
import { RenewalsRadar } from '@/components/Workspace/RenewalsRadar';
import { PinnedClients } from '@/components/Workspace/PinnedClients';
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

function RenewalsRadarSkeleton() {
  return (
    <div className="rounded-card shadow-elev-sm bg-[var(--card)] p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

function InboxSkeleton() {
  return (
    <div className="rounded-card shadow-elev-sm bg-[var(--card)] p-6">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

function PinnedClientsSkeleton() {
  return (
    <div className="rounded-card shadow-elev-sm bg-[var(--card)] p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
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

async function RenewalsRadarWrapper({ orgId, locale }: { orgId: string; locale: Locale }) {
  const renewals = await getRenewalsBuckets(orgId);
  
  return <RenewalsRadar renewals={renewals} locale={locale} />;
}

async function PinnedClientsWrapper({ userId, orgId, locale }: { userId: string; orgId: string; locale: Locale }) {
  return <PinnedClients userId={userId} orgId={orgId} locale={locale} />;
}

// ============================================================================
// MAIN DASHBOARD PAGE
// ============================================================================

export default async function DashboardPage({
  params,
}: {
  params: { locale: string };
}) {
  const { user, currentOrg } = await getCurrentOrg();
  const awaitedParams = await params;
  const orgId = currentOrg.id;
  const userId = user.id;
  const locale = awaitedParams.locale as 'en' | 'es';

  // Obtener estadísticas para detectar zero-state
  const stats = await getCaseStatsByOrg(orgId);
  const hasContent = stats.total > 0;
  
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
          
          {/* Row 2: Recientes: Pólizas + Recientes: Propuestas */}
          <div className="md:col-span-6">
            <Suspense fallback={<RecentsSkeleton />}>
              <RecentPoliciesWrapper orgId={orgId} locale={locale} />
            </Suspense>
          </div>
          
          <div className="md:col-span-6">
            <Suspense fallback={<RecentsSkeleton />}>
              <RecentProposalsWrapper orgId={orgId} locale={locale} />
            </Suspense>
          </div>
          
          {/* Row 3: Radar de Renovaciones (full width) */}
          <div className="md:col-span-12">
            <Suspense fallback={<RenewalsRadarSkeleton />}>
              <RenewalsRadarWrapper orgId={orgId} locale={locale} />
            </Suspense>
          </div>
          
          {/* Row 4: Bandeja de entrada (full width) */}
          <div className="md:col-span-12">
            <Suspense fallback={<InboxSkeleton />}>
              <InboxServer userId={userId} orgId={orgId} />
            </Suspense>
          </div>
          
          {/* Row 5: Clientes anclados (full width) */}
          <div className="md:col-span-12">
            <Suspense fallback={<PinnedClientsSkeleton />}>
              <PinnedClientsWrapper userId={userId} orgId={orgId} locale={locale} />
            </Suspense>
          </div>
        </div>
      ) : (
        <ZeroState locale={locale} />
      )}
    </div>
  );
}


