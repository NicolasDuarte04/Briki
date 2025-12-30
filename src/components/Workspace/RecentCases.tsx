import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Circle, ChevronRight } from 'lucide-react';
import { pathForEntity, pathForAgent, type Locale } from '@/lib/routes/workspace';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface RecentCaseItem {
  id: string;
  title: string;
  client: string;
  status: string;
  updated_at: string;
}

interface RecentCasesProps {
  title: string;
  items: RecentCaseItem[];
  locale: Locale;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formats a timestamp as relative time in Spanish (e.g., "hace 5 min")
 */
function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'hace un momento';
    } else if (diffMinutes < 60) {
      return `hace ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    } else if (diffDays < 7) {
      return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
    } else {
      return new Date(isoString).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
      });
    }
  } catch {
    return '—';
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * RecentCases - Displays a list of recent cases with action buttons
 * 
 * Server-compatible component that renders a vertical list of recent cases.
 * Each case has two action buttons: "Resumen" (view details) and "Continuar" (continue in agent).
 * 
 * @param title - Section title (e.g., "Recientes: Casos")
 * @param items - Array of recent case items to display
 * @param locale - Current locale for route generation
 */
export function RecentCases({ title, items, locale }: RecentCasesProps) {
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
            No hay casos recientes
          </p>
          <Button asChild variant="outline" size="sm" className="rounded-button">
            <Link href={pathForAgent(locale)}>
              Crear caso
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
          <RecentCaseCard key={item.id} item={item} locale={locale} />
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * RecentCaseCard - Individual case item with action buttons
 */
function RecentCaseCard({ item, locale }: { item: RecentCaseItem; locale: Locale }) {
  const relativeTime = formatRelativeTime(item.updated_at);
  const resumeHref = pathForEntity('case', item.id, locale);
  const continueHref = `/${locale}/agent/${item.id}`;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors">
      {/* Status indicator */}
      <Circle 
        className="size-2 fill-primary text-primary mt-1.5 shrink-0" 
        aria-hidden="true"
      />
      
      <div className="flex-1 min-w-0 space-y-2">
        {/* Title and metadata */}
        <div>
          <p className="text-sm font-medium text-foreground truncate">
            {item.title}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
            <span className="truncate">{item.client}</span>
            <span aria-hidden="true">•</span>
            <time dateTime={item.updated_at}>{relativeTime}</time>
            {item.status && (
              <>
                <span aria-hidden="true">•</span>
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

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button 
            asChild 
            variant="outline" 
            size="sm" 
            className="flex-1 rounded-button"
          >
            <Link href={resumeHref}>
              Resumen
            </Link>
          </Button>
          <Button 
            asChild 
            size="sm" 
            className="flex-1 rounded-button group"
          >
            <Link href={continueHref} className="flex items-center justify-center gap-1">
              <span>Continuar</span>
              <ChevronRight 
                className="size-3 transition-transform group-hover:translate-x-0.5" 
                aria-hidden="true"
              />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

