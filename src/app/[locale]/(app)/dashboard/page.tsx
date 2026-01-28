import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { getCaseStatsByOrg } from '@/lib/database';
import { 
  getContinueItem,
  getRecentOrgPolicies, 
  getRecentProposals,
  getRecentCases,
  getUserPins
} from '@/lib/data/workspace';
import type { 
  RecentPolicy, 
  RecentProposal,
  RecentCase
} from '@/lib/data/workspace';
import { Skeleton } from '@/components/ui/skeleton';
import { ContinueCard } from '@/components/Workspace/ContinueCard';
import { QuickActions } from '@/components/Workspace/QuickActions';
import { RecentCases } from '@/components/Workspace/RecentCases';
import { RecentPolicies } from '@/components/Workspace/RecentPolicies';
import { PinnedCases } from '@/components/Workspace/PinnedCases';
import { PinnedClients } from '@/components/Workspace/PinnedClients';
import { PinnedPolicies } from '@/components/Workspace/PinnedPolicies';
import { ZeroState } from '@/components/Workspace/ZeroState';
import type { Locale } from '@/lib/routes/workspace';
import DashboardViewTracker from './DashboardViewTracker';

export const dynamic = 'force-dynamic';

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================

function DashboardContentSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-pulse">
      {/* Row 1: Continue Card + Quick Actions */}
      <div className="md:col-span-8">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-4" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      </div>
      
      <div className="md:col-span-4">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-36 mb-4" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </div>
      </div>
      
      {/* Row 2: Recent Cases + Recent Policies */}
      <div className="md:col-span-6">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
      
      <div className="md:col-span-6">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
      
      {/* Row 3-5: Pinned sections */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="md:col-span-12">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-5 w-36" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-8 w-36 rounded-full" />
              <Skeleton className="h-8 w-32 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PinnedSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-32 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>
    </div>
  );
}

function RecentsSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD CONTENT (STREAMED)
// ============================================================================

/**
 * DashboardContent - Main dashboard content loaded via streaming
 * 
 * All heavy data fetching happens here, allowing the page shell
 * to render immediately while this component loads in background.
 */
async function DashboardContent({ locale }: { locale: Locale }) {
  const t = await getTranslations('dashboard');
  // ✅ FASE 3: Obtener auth y datos en paralelo donde sea posible
  const { user, currentOrg } = await getCurrentOrg();
  const orgId = currentOrg.id;
  const userId = user.id;
  
  // ✅ FASE 3: Paralelizar todas las queries de datos
  const [stats, continueItem, recentCases, userPins] = await Promise.all([
    getCaseStatsByOrg(orgId),
    getContinueItem(userId, orgId),
    getRecentCases(orgId),
    getUserPins(userId),
  ]);
  
  const hasContent = stats.total > 0;
  
  if (!hasContent) {
    return <ZeroState locale={locale} />;
  }
  
  // Prepare continue item for ContinueCard
  const continueCardItem = continueItem ? {
    id: continueItem.id,
    entity_type: 'case' as const,
    title: continueItem.title,
    client_name: continueItem.title,
    updated_at: continueItem.updatedAt,
    status: continueItem.stage,
  } : null;
  
  // Prepare recent cases items
  const recentCaseItems = recentCases.map((caseItem: RecentCase) => ({
    id: caseItem.id,
    title: caseItem.title,
    client: caseItem.client_name,
    status: caseItem.status,
    updated_at: caseItem.updated_at,
  }));
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Row 1: Continuar (2/3) + Acciones rápidas (1/3) */}
      <div className="md:col-span-8">
        {continueCardItem && <ContinueCard item={continueCardItem} locale={locale} />}
      </div>
      
      <div className="md:col-span-4">
        <QuickActions orgId={orgId} locale={locale} />
      </div>
      
      {/* Row 2: Recent Cases + Recent Policies */}
      <div className="md:col-span-6">
        <RecentCases
          title={t('recents.cases')}
          items={recentCaseItems}
          locale={locale}
        />
      </div>
      
      <div className="md:col-span-6">
        <Suspense fallback={<RecentsSkeleton />}>
          <RecentPoliciesSection orgId={orgId} locale={locale} />
        </Suspense>
      </div>
      
      {/* Row 3: Casos anclados (full width) */}
      <div className="md:col-span-12">
        <Suspense fallback={<PinnedSkeleton />}>
          <PinnedCases userId={userId} orgId={orgId} locale={locale} />
        </Suspense>
      </div>
      
      {/* Row 4: Clientes anclados (full width) */}
      <div className="md:col-span-12">
        <Suspense fallback={<PinnedSkeleton />}>
          <PinnedClients userId={userId} orgId={orgId} locale={locale} />
        </Suspense>
      </div>
      
      {/* Row 5: Pólizas ancladas (full width) */}
      <div className="md:col-span-12">
        <Suspense fallback={<PinnedSkeleton />}>
          <PinnedPolicies userId={userId} orgId={orgId} locale={locale} />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * RecentPoliciesSection - Separate async component for organizational policies
 * Allows independent streaming of this section
 * 
 * Shows recent policies from the org's policy container (/policies/analysis)
 * Uses the same stacked card style as RecentCases with a single "Análisis" button
 */
async function RecentPoliciesSection({ orgId, locale }: { orgId: string; locale: Locale }) {
  const t = await getTranslations('dashboard');
  const policies = await getRecentOrgPolicies(orgId);
  
  const items = policies.map((policy: RecentPolicy) => ({
    id: policy.id,
    title: policy.title,
    client: policy.client_name,
    status: policy.status,
    updated_at: policy.updated_at,
  }));
  
  return (
    <RecentPolicies
      title={t('recents.policies')}
      items={items}
      locale={locale}
    />
  );
}

// ============================================================================
// MAIN DASHBOARD PAGE
// ============================================================================

/**
 * DashboardPage - Main dashboard entry point
 * 
 * ✅ FASE 5: Page shell renders immediately
 * ✅ Heavy content streams via Suspense
 * ✅ User sees title instantly, content loads progressively
 */
export default async function DashboardPage({
  params,
}: {
  params: { locale: string };
}) {
  const awaitedParams = await params;
  const locale = awaitedParams.locale as Locale;
  const t = await getTranslations('dashboard');
  
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <DashboardViewTracker />
      <h1 className="text-3xl font-bold mb-8 text-[var(--foreground)]">
        {t('title')}
      </h1>
      
      {/* ✅ FASE 5: Todo el contenido pesado va dentro de Suspense */}
      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardContent locale={locale} />
      </Suspense>
    </div>
  );
}
