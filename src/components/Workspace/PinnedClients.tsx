import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pin, X } from 'lucide-react';
import { getPinnedClients, type PinnedClient } from '@/lib/data/workspace';
import { pathForClient, type Locale } from '@/lib/routes/workspace';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PinnedClientsProps {
  userId: string;
  orgId: string;
  locale: Locale;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets a tokenized color class for a client based on index
 * Uses the chart color palette for visual variety
 */
function getClientColorClass(index: number): string {
  const colors = [
    'bg-chart-1/10 text-chart-1 border-chart-1/20 hover:bg-chart-1/20',
    'bg-chart-2/10 text-chart-2 border-chart-2/20 hover:bg-chart-2/20',
    'bg-chart-3/10 text-chart-3 border-chart-3/20 hover:bg-chart-3/20',
    'bg-chart-4/10 text-chart-4 border-chart-4/20 hover:bg-chart-4/20',
    'bg-chart-5/10 text-chart-5 border-chart-5/20 hover:bg-chart-5/20',
  ];
  return colors[index % colors.length];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * PinnedClients - Personal shortcuts to frequently accessed clients
 * 
 * Server component that displays up to 10 pinned clients as compact chips.
 * Each chip links to the client detail page with tokenized colors for
 * quick visual recognition.
 */
export async function PinnedClients({ userId, orgId, locale }: PinnedClientsProps) {
  const pinnedClients = await getPinnedClients(userId, orgId);

  return (
    <Card className="bg-card rounded-card shadow-elev-sm border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Pin className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">
            Clientes anclados
          </h2>
        </div>
      </CardHeader>
      <CardContent>
        {pinnedClients.length === 0 ? (
          // Empty state
          <div className="text-center py-6 space-y-2">
            <p className="text-sm text-muted-foreground">
              Aún no tienes clientes anclados.
            </p>
            <p className="text-xs text-muted-foreground">
              Ancla tus clientes favoritos desde sus páginas de detalle para acceso rápido.
            </p>
          </div>
        ) : (
          // Pinned clients chips
          <div className="flex flex-wrap gap-2">
            {pinnedClients.map((client, index) => (
              <div
                key={client.id}
                className="group relative inline-flex items-center"
              >
                <Badge
                  asChild
                  variant="outline"
                  className={`
                    transition-all duration-200
                    pr-7
                    rounded-button
                    ${getClientColorClass(index)}
                  `}
                >
                  <Link
                    href={pathForClient(client.clientId, locale)}
                    className="flex items-center gap-1.5"
                    aria-label={`Ver cliente ${client.clientName}`}
                  >
                    <span className="font-medium truncate max-w-[120px]">
                      {client.clientName}
                    </span>
                  </Link>
                </Badge>
                
                {/* Unpin button (stub) */}
                <button
                  type="button"
                  className="
                    absolute right-1 top-1/2 -translate-y-1/2
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-150
                    p-0.5 rounded-button
                    hover:bg-destructive/10
                    focus-visible:opacity-100
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                  "
                  aria-label={`Desanclar ${client.clientName}`}
                  title="Desanclar cliente"
                  onClick={(e) => {
                    e.preventDefault();
                    // TODO: Implement unpin action
                    console.log('Unpin client:', client.clientId);
                  }}
                >
                  <X className="size-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


