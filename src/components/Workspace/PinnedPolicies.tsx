import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pin } from 'lucide-react';
import { getPinnedPolicies, type PinnedPolicy } from '@/lib/data/workspace';
import { pathForPolicyAnalysisDetail, type Locale } from '@/lib/routes/workspace';
import { getTranslations } from 'next-intl/server';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PinnedPoliciesProps {
  userId: string;
  orgId: string;
  locale: Locale;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets a tokenized color class for a policy based on index
 * Uses the chart color palette for visual variety
 */
function getPolicyColorClass(index: number): string {
  const colors = [
    'bg-chart-1/10 text-chart-1 border-chart-1/20 hover:bg-chart-1/20',
    'bg-chart-2/10 text-chart-2 border-chart-2/20 hover:bg-chart-2/20',
    'bg-chart-3/10 text-chart-3 border-chart-3/20 hover:bg-chart-3/20',
    'bg-chart-4/10 text-chart-4 border-chart-4/20 hover:bg-chart-4/20',
    'bg-chart-5/10 text-chart-5 border-chart-5/20 hover:bg-chart-5/20',
  ];
  
  const colorIndex = index % colors.length;
  const color = colors[colorIndex];
  
  if (!color) {
    console.warn(
      `[PinnedPolicies.getPolicyColorClass] Unexpected: color not found for index ${index}. Falling back to first color.`
    );
    return colors[0]!;
  }
  
  return color;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * PinnedPolicies - Personal shortcuts to frequently accessed policies
 * 
 * Server component that displays up to 10 pinned policies as compact chips.
 * Each chip links to the policy detail page with tokenized colors for
 * quick visual recognition.
 */
export async function PinnedPolicies({ userId, orgId, locale }: PinnedPoliciesProps) {
  const [pinnedPolicies, t] = await Promise.all([
    getPinnedPolicies(userId, orgId),
    getTranslations('dashboard.pinned')
  ]);

  return (
    <Card className="bg-card rounded-card shadow-elev-sm border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Pin className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">
            {t('policies')}
          </h2>
        </div>
      </CardHeader>
      <CardContent>
        {pinnedPolicies.length === 0 ? (
          // Empty state
          <div className="text-center py-6 space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('emptyPolicies')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('hint')}
            </p>
          </div>
        ) : (
          // Pinned policies chips
          <div className="flex flex-wrap gap-2">
            {pinnedPolicies.map((policy, index) => (
              <Badge
                key={policy.id}
                asChild
                variant="outline"
                className={`
                  transition-all duration-200
                  rounded-button
                  ${getPolicyColorClass(index)}
                `}
              >
                <Link
                  href={pathForPolicyAnalysisDetail(policy.policyId, locale)}
                  className="flex items-center gap-1.5"
                  aria-label={`${policy.policyName}`}
                >
                  <span className="font-medium truncate max-w-[120px]">
                    {policy.policyName}
                  </span>
                </Link>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

