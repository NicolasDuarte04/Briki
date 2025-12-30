import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pin } from 'lucide-react';
import { getPinnedCases, type PinnedCase } from '@/lib/data/workspace';
import { pathForEntity, type Locale } from '@/lib/routes/workspace';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PinnedCasesProps {
  userId: string;
  orgId: string;
  locale: Locale;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets a tokenized color class for a case based on index
 * Uses the chart color palette for visual variety
 */
function getCaseColorClass(index: number): string {
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
      `[PinnedCases.getCaseColorClass] Unexpected: color not found for index ${index}. Falling back to first color.`
    );
    return colors[0]!;
  }
  
  return color;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * PinnedCases - Personal shortcuts to frequently accessed cases
 * 
 * Server component that displays up to 10 pinned cases as compact chips.
 * Each chip links to the case detail page with tokenized colors for
 * quick visual recognition.
 */
export async function PinnedCases({ userId, orgId, locale }: PinnedCasesProps) {
  const pinnedCases = await getPinnedCases(userId, orgId);

  return (
    <Card className="bg-card rounded-card shadow-elev-sm border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Pin className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">
            Casos anclados
          </h2>
        </div>
      </CardHeader>
      <CardContent>
        {pinnedCases.length === 0 ? (
          // Empty state
          <div className="text-center py-6 space-y-2">
            <p className="text-sm text-muted-foreground">
              Aún no tienes casos anclados.
            </p>
            <p className="text-xs text-muted-foreground">
              Ancla tus casos favoritos desde sus páginas de detalle para acceso rápido.
            </p>
          </div>
        ) : (
          // Pinned cases chips
          <div className="flex flex-wrap gap-2">
            {pinnedCases.map((caseItem, index) => (
              <Badge
                key={caseItem.id}
                asChild
                variant="outline"
                className={`
                  transition-all duration-200
                  rounded-button
                  ${getCaseColorClass(index)}
                `}
              >
                <Link
                  href={pathForEntity('case', caseItem.caseId, locale)}
                  className="flex items-center gap-1.5"
                  aria-label={`Ver caso ${caseItem.caseName}`}
                >
                  <span className="font-medium truncate max-w-[120px]">
                    {caseItem.caseName}
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

