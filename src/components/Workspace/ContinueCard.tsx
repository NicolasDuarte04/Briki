'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Circle } from 'lucide-react';
import { pathForEntity, type Locale, type EntityType } from '@/lib/routes/workspace';
import { useTranslations } from 'next-intl';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ContinueCardProps {
  item?: {
    id: string;
    entity_type: 'analysis' | 'comparison' | 'proposal' | 'case' | 'policy' | 'client';
    title: string;
    client_name: string;
    updated_at: string;
    status?: string;
  };
  locale?: Locale;
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
 * Maps entity types to route helper compatible types
 */
function mapToEntityType(entityType: string): EntityType {
  // Map 'comparison' to 'case' since comparisons are handled as cases
  if (entityType === 'comparison') return 'case';
  
  // Ensure type safety
  const validTypes: EntityType[] = ['policy', 'proposal', 'analysis', 'case', 'client'];
  return validTypes.includes(entityType as EntityType) 
    ? (entityType as EntityType) 
    : 'case'; // Default fallback
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ContinueCard - Displays the most recent work item for quick resume
 * 
 * Client component that shows a clear CTA to continue working on the last
 * updated case/analysis/proposal. Includes client name, relative time, and
 * optional status badge.
 * 
 * @example
 * ```tsx
 * // In client component
 * <ContinueCard item={recentItem} locale={params.locale} />
 * ```
 */
export function ContinueCard({ item, locale = 'en' }: ContinueCardProps) {
  const t = useTranslations('dashboard.continue');
  const tTime = useTranslations('dashboard.relativeTime');

  if (!item) {
    return (
      <Card className="bg-card rounded-card shadow-elev-sm border border-border">
        <CardHeader className="pb-3">
          <h2 className="text-sm font-semibold text-foreground">
            {t('title')}
          </h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('noRecent')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Use route helper for type-safe, locale-aware paths
  const entityType = mapToEntityType(item.entity_type);
  const entityPath = pathForEntity(entityType, item.id, locale);
  const relativeTime = formatRelativeTime(item.updated_at, tTime, locale);

  return (
    <Card className="bg-card rounded-card shadow-elev-sm border border-border hover:shadow-elev-md transition-shadow">
      <CardHeader className="pb-3">
        <h2 className="text-sm font-semibold text-foreground">
          {t('title')}
        </h2>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Last item info */}
        <div className="flex items-start gap-3">
          <Circle 
            className="size-2 fill-primary text-primary mt-1.5 shrink-0" 
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {item.title || item.client_name}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {item.client_name}
              </span>
              <span className="text-xs text-muted-foreground" aria-hidden="true">
                •
              </span>
              <span className="text-xs text-muted-foreground">
                {relativeTime}
              </span>
              {item.status && (
                <>
                  <span className="text-xs text-muted-foreground" aria-hidden="true">
                    •
                  </span>
                  <Badge 
                    variant="outline" 
                    className="text-xs h-5 px-1.5 rounded-sm border-border"
                  >
                    {item.status}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons: Summary + Continue */}
        <div className="flex gap-2">
          <Button 
            asChild 
            variant="outline"
            className="flex-1"
            aria-label={`${t('viewButton')} ${item.title || item.client_name}`}
          >
            <Link href={entityPath}>
              {t('viewButton')}
            </Link>
          </Button>
          <Button 
            asChild 
            className="flex-1 justify-center group"
            aria-label={`${t('continueButton')} ${item.title || item.client_name}`}
          >
            <Link href={`/${locale}/agent/${item.id}`} className="flex items-center gap-1">
              <span>{t('continueButton')}</span>
              <ChevronRight 
                className="size-4 transition-transform group-hover:translate-x-0.5" 
                aria-hidden="true"
              />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SKELETON VARIANT
// ============================================================================

/**
 * ContinueCard.Skeleton - Loading state with shimmer animation
 */
ContinueCard.Skeleton = function ContinueCardSkeleton() {
  return (
    <Card 
      className="bg-card rounded-card shadow-elev-sm border border-border"
      aria-busy="true"
      aria-label="Loading recent item"
    >
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-40 bg-muted animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Item info skeleton */}
        <div className="flex items-start gap-3">
          <Skeleton className="size-2 rounded-full mt-1.5 shrink-0 bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 bg-muted animate-pulse" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-24 bg-muted animate-pulse" />
              <Skeleton className="h-3 w-16 bg-muted animate-pulse" />
              <Skeleton className="h-5 w-20 rounded-sm bg-muted animate-pulse" />
            </div>
          </div>
        </div>

        {/* Button skeleton */}
        <Skeleton className="h-10 w-full rounded-button" />
      </CardContent>
    </Card>
  );
};

