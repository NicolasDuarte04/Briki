// /src/components/Workspace/PinnedCompanies.tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pin, Building2 } from 'lucide-react';
import { getPinnedCompanies, type CompanySummary } from '@/lib/companiesDb';
import { pathForCompanies, type Locale } from '@/lib/routes/workspace';
import { getTranslations } from 'next-intl/server';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PinnedCompaniesProps {
  orgId: string;
  locale: Locale;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets risk classification badge styling
 * Uses semantic colors based on risk level
 */
function getRiskColorClass(risk: string): string {
  const colors: Record<string, string> = {
    bajo: 'bg-green-100/80 text-green-700 border-green-200 hover:bg-green-100',
    medio: 'bg-yellow-100/80 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
    alto: 'bg-orange-100/80 text-orange-700 border-orange-200 hover:bg-orange-100',
    muy_alto: 'bg-red-100/80 text-red-700 border-red-200 hover:bg-red-100',
  };
  
  return colors[risk] ?? colors['bajo']!;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * PinnedCompanies - Personal shortcuts to frequently accessed companies
 * 
 * Server component that displays up to 5 pinned companies as compact chips.
 * Each chip links to the company detail page with risk-based color coding.
 * Designed for SARLAFT compliance with visual risk indicators.
 */
export async function PinnedCompanies({ orgId, locale }: PinnedCompaniesProps) {
  const [pinnedCompanies, t] = await Promise.all([
    getPinnedCompanies(orgId, 5),
    getTranslations('dashboard.pinned')
  ]);

  return (
    <Card className="bg-card rounded-card shadow-elev-sm border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">
            {t('companies')}
          </h2>
        </div>
      </CardHeader>
      <CardContent>
        {pinnedCompanies.length === 0 ? (
          // Empty state
          <div className="text-center py-6 space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('emptyCompanies')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('hint')}
            </p>
          </div>
        ) : (
          // Pinned companies chips
          <div className="flex flex-wrap gap-2">
            {pinnedCompanies.map((company) => (
              <Badge
                key={company.id}
                asChild
                variant="outline"
                className={`
                  transition-all duration-200
                  rounded-button
                  ${getRiskColorClass(company.riskClassification)}
                `}
              >
                <Link
                  href={`/${locale}/workspace/companies/${company.id}`}
                  className="flex items-center gap-1.5"
                  aria-label={`${company.legalName} - ${company.riskClassification}`}
                >
                  <Building2 className="size-3" aria-hidden="true" />
                  <span className="font-medium truncate max-w-[120px]">
                    {company.tradeName || company.legalName}
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
