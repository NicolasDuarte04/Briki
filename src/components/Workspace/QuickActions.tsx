// /src/components/Workspace/QuickActions.tsx
'use client';

import Link from 'next/link';
import { FileText, UserPlus, MessageSquare, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackDashboardActionFirst } from '@/lib/telemetry';
import { pathForNewEntity, pathForAgent, getProfilePath, pathForPoliciesUpload, type Locale } from '@/lib/routes/workspace';
import { useUI } from '@/lib/ui/state';
import { useTranslations } from 'next-intl';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface QuickActionsProps {
  orgId: string;
  locale: Locale;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * QuickActions - Core workspace actions for instant workflow entry
 * 
 * Provides four primary actions: Create Case, Analyze Policy,
 * New Client, and Manage Profile. Each action includes proper
 * accessibility features and event tracking.
 */
export function QuickActions({ orgId, locale }: QuickActionsProps) {
  const dashboardViewTime = useUI((s) => s.dashboardViewTime);
  const t = useTranslations('dashboard.quickActions');

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleActionClick = (actionType: 'create_case' | 'analyze_policy' | 'new_client' | 'manage_profile') => {
    const msFromView = dashboardViewTime ? Date.now() - dashboardViewTime : 0;
    trackDashboardActionFirst({
      actionType: actionType,
      msFromView: msFromView,
    });
  };

  const handleCreateCaseClick = () => {
    handleActionClick('create_case');
  };

  const handleAnalyzePolicyClick = () => {
    handleActionClick('analyze_policy');
  };

  const handleClientClick = () => {
    handleActionClick('new_client');
  };

  const handleProfileClick = () => {
    handleActionClick('manage_profile');
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Button 1: Create Case */}
      <Button
        asChild
        variant="outline"
        className="h-auto flex-col gap-3 p-6 rounded-card shadow-elev-sm hover:shadow-elev-md transition-shadow bg-card border-border"
        aria-label={t('ariaCreateCase')}
        title={t('ariaCreateCase')}
      >
        <Link 
          href={pathForAgent(locale)}
          onClick={handleCreateCaseClick}
        >
          <MessageSquare className="size-8 text-primary" aria-hidden="true" />
          <span className="text-base font-semibold text-foreground">{t('createCase')}</span>
        </Link>
      </Button>

      {/* Button 2: Analyze Policy */}
      <Button
        asChild
        variant="outline"
        className="h-auto flex-col gap-3 p-6 rounded-card shadow-elev-sm hover:shadow-elev-md transition-shadow bg-card border-border"
        aria-label={t('ariaAnalyzePolicy')}
        title={t('ariaAnalyzePolicy')}
      >
        <Link 
          href={pathForPoliciesUpload(locale)}
          onClick={handleAnalyzePolicyClick}
        >
          <FileText className="size-8 text-primary" aria-hidden="true" />
          <span className="text-base font-semibold text-foreground">{t('analyzePolicy')}</span>
        </Link>
      </Button>

      {/* Button 3: New Client */}
      <Button
        asChild
        variant="outline"
        className="h-auto flex-col gap-3 p-6 rounded-card shadow-elev-sm hover:shadow-elev-md transition-shadow bg-card border-border"
        aria-label={t('ariaNewClient')}
        title={t('ariaNewClient')}
      >
        <Link 
          href={pathForNewEntity('client', locale)}
          onClick={handleClientClick}
        >
          <UserPlus className="size-8 text-primary" aria-hidden="true" />
          <span className="text-base font-semibold text-foreground">{t('newClient')}</span>
        </Link>
      </Button>

      {/* Button 4: Manage Profile */}
      <Button
        asChild
        variant="outline"
        className="h-auto flex-col gap-3 p-6 rounded-card shadow-elev-sm hover:shadow-elev-md transition-shadow bg-card border-border"
        aria-label={t('ariaManageProfile')}
        title={t('ariaManageProfile')}
      >
        <Link 
          href={getProfilePath(locale)}
          onClick={handleProfileClick}
        >
          <Settings className="size-8 text-primary" aria-hidden="true" />
          <span className="text-base font-semibold text-foreground">{t('manageProfile')}</span>
        </Link>
      </Button>
    </div>
  );
}
