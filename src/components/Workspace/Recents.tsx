import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface RecentItem {
  id: string;
  title: string;
  client: string;
  status?: string;
  updated_at: string;
  href: string;
}

interface RecentsProps {
  title: string;
  items: RecentItem[];
  viewAllHref?: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
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
 * Recents - Displays a grid of recent items (policies, proposals, etc.)
 * 
 * Server component that renders a responsive grid of cards showing recent
 * work items with consistent styling, status badges, and action menus.
 * 
 * @param title - Section title (e.g., "Pólizas recientes")
 * @param items - Array of recent items to display
 * @param viewAllHref - Optional link to view all items
 * @param emptyActionHref - Optional link for empty state CTA
 * @param emptyActionLabel - Label for empty state CTA button
 */
export function Recents({
  title,
  items,
  viewAllHref,
  emptyActionHref,
  emptyActionLabel = 'Crear nuevo',
}: RecentsProps) {
  // Empty state
  if (!items || items.length === 0) {
    return (
      <Card className="bg-card rounded-card shadow-elev-sm border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No hay elementos recientes
          </p>
          {emptyActionHref && (
            <Button asChild variant="outline" size="sm" className="rounded-button">
              <Link href={emptyActionHref}>
                {emptyActionLabel}
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <section aria-labelledby="recents-title">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 id="recents-title" className="text-lg font-semibold text-foreground">
          {title}
        </h2>
        {viewAllHref && (
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Link href={viewAllHref}>
              Ver todos
            </Link>
          </Button>
        )}
      </div>

      {/* Responsive grid of cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <RecentCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * RecentCard - Individual card for a recent item
 */
function RecentCard({ item }: { item: RecentItem }) {
  const relativeTime = formatRelativeTime(item.updated_at);

  return (
    <Card className="bg-card rounded-card shadow-elev-sm border border-border hover:shadow-elev-md transition-shadow group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Main content */}
          <Link 
            href={item.href}
            className="flex-1 min-w-0 space-y-2"
          >
            <h3 className="text-sm font-medium text-foreground truncate">
              {item.title}
            </h3>
            
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
          </Link>

          {/* Kebab menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-button opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                aria-label={`Acciones para ${item.title}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem asChild>
                <Link href={item.href}>
                  Ver
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${item.href}?action=duplicate`}>
                  Duplicar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${item.href}?action=archive`}>
                  Archivar
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

