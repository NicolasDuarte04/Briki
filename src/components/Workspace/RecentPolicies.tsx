// /src/components/Workspace/RecentPolicies.tsx
/**
 * RecentPolicies - Displays a list of recent organizational policies
 * 
 * Styled identically to RecentCases but with a single "Analysis" button
 * that links to the policy detail page.
 */

'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, ChevronRight } from 'lucide-react';
import { pathForPoliciesUpload, type Locale } from '@/lib/routes/workspace';
import { useTranslations } from 'next-intl';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface RecentPolicyItem {
  id: string;
  title: string;
  client: string; // Insured name
  status: string; // Confidence status
  updated_at: string;
}

interface RecentPoliciesProps {
  title: string;
  items: RecentPolicyItem[];
  locale: Locale;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formats a timestamp as relative time using locale-aware translations
 */
function formatRelativeTime(isoString: string, t: ReturnType<typeof useTranslations>, locale: Locale): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return t('justNow');
    } else if (diffMinutes < 60) {
      return t('minutesAgo', { count: diffMinutes });
    } else if (diffHours < 24) {
      return t('hoursAgo', { count: diffHours });
    } else if (diffDays < 7) {
      return t('daysAgo', { count: diffDays });
    } else {
      return new Date(isoString).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-ES', {
        day: 'numeric',
        month: 'short',
      });
    }
  } catch {
    return '—';
  }
}

/**
 * Maps status to display label using translations
 */
function getStatusBadge(status: string, t: ReturnType<typeof useTranslations>): { label: string; className: string } {
  switch (status) {
    case 'analyzed':
      return { 
        label: t('analyzed'), 
        className: 'bg-green-500/10 text-green-600 border-green-200' 
      };
    case 'partial':
      return { 
        label: t('partial'), 
        className: 'bg-amber-500/10 text-amber-600 border-amber-200' 
      };
    case 'pending':
      return { 
        label: t('pending'), 
        className: 'bg-red-500/10 text-red-600 border-red-200' 
      };
    default:
      return { 
        label: status, 
        className: 'border-border' 
      };
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * RecentPolicies - Displays a list of recent policies with analysis button
 * 
 * Client component that renders a vertical list of recent policies.
 * Each policy has one action button: "Analysis" (view policy detail).
 * 
 * @param title - Section title (e.g., "Recent: Policies")
 * @param items - Array of recent policy items to display
 * @param locale - Current locale for route generation
 */
export function RecentPolicies({ title, items, locale }: RecentPoliciesProps) {
  const t = useTranslations('dashboard.recents');
  const tTime = useTranslations('dashboard.relativeTime');

  // Empty state
  if (!items || items.length === 0) {
    return (
      <Card className="bg-card rounded-card shadow-elev-sm border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('noPolicies')}
          </p>
          <Button asChild variant="outline" size="sm" className="rounded-button">
            <Link href={pathForPoliciesUpload(locale)}>
              {t('uploadPolicy')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card rounded-card shadow-elev-sm border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <RecentPolicyCard key={item.id} item={item} locale={locale} t={t} tTime={tTime} />
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * RecentPolicyCard - Individual policy item with analysis button
 */
function RecentPolicyCard({ 
  item, 
  locale, 
  t, 
  tTime 
}: { 
  item: RecentPolicyItem; 
  locale: Locale;
  t: ReturnType<typeof useTranslations>;
  tTime: ReturnType<typeof useTranslations>;
}) {
  const relativeTime = formatRelativeTime(item.updated_at, tTime, locale);
  const analysisHref = `/${locale}/policies/analysis/${item.id}`;
  const statusBadge = getStatusBadge(item.status, t);

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors">
      {/* Policy icon */}
      <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
        <FileText 
          className="size-4 text-primary" 
          aria-hidden="true"
        />
      </div>
      
      <div className="flex-1 min-w-0 space-y-2">
        {/* Title and metadata */}
        <div>
          <p className="text-sm font-medium text-foreground truncate" title={item.title}>
            {item.title}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
            <span className="truncate" title={item.client}>{item.client}</span>
            <span aria-hidden="true">•</span>
            <time dateTime={item.updated_at}>{relativeTime}</time>
            {item.status && (
              <>
                <span aria-hidden="true">•</span>
                <Badge 
                  variant="outline" 
                  className={`text-xs h-5 px-1.5 rounded-sm ${statusBadge.className}`}
                >
                  {statusBadge.label}
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Single action button */}
        <Button 
          asChild 
          size="sm" 
          className="w-full rounded-button group"
        >
          <Link href={analysisHref} className="flex items-center justify-center gap-1">
            <span>{t('summary')}</span>
            <ChevronRight 
              className="size-3 transition-transform group-hover:translate-x-0.5" 
              aria-hidden="true"
            />
          </Link>
        </Button>
      </div>
    </div>
  );
}
