import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getInboxItems, type InboxItem } from '@/lib/data/workspace';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Extended payload type for inbox items
 */
interface InboxPayload {
  clientName?: string;
  policyLabel?: string;
  expire_at?: string | Date;
  expireDateFmt?: string;
  analysisId?: string;
  comparisonId?: string;
  proposalId?: string;
  clientId?: string;
  caseId?: string;
  link?: string;
  docName?: string;
}

/**
 * Text and link generated from inbox item
 */
interface InboxText {
  label: string;
  link?: string;
}

// ============================================================================
// INBOX TEXT MAPPING
// ============================================================================

/**
 * Maps inbox item kinds to verb-first Spanish text and links
 */
const INBOX_TEXT: Record<string, (p: InboxPayload) => InboxText> = {
  analysis_ready: (p) => ({
    label: `Revisar análisis de ${p.policyLabel ?? 'póliza'} de ${p.clientName}`,
    link: p.link,
  }),
  comparison_ready: (p) => ({
    label: `Comparación lista para ${p.clientName}`,
    link: p.link,
  }),
  policy_expiring: (p) => ({
    label: `Renovación vence el ${p.expireDateFmt} — ${p.policyLabel} (${p.clientName})`,
    link: p.link,
  }),
  proposal_sent_followup: (p) => ({
    label: `Dar seguimiento a propuesta para ${p.clientName}`,
    link: p.link,
  }),
  document_missing: (p) => ({
    label: `Falta documento: ${p.docName ?? 'archivo'} — ${p.clientName}`,
    link: p.link,
  }),
};

/**
 * Fallback for unknown inbox item kinds
 */
const fallback = (p: InboxPayload): InboxText => ({
  label: `Tarea pendiente — ${p.clientName ?? 'cliente'}`,
  link: p.link,
});

/**
 * Gets text and link for an inbox item based on its kind
 */
function getInboxText(item: InboxItem): InboxText {
  const payload = item.payload as InboxPayload;
  const mapper = INBOX_TEXT[item.kind] ?? fallback;
  return mapper(payload);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Inbox - Displays actionable inbox items with verb-first Spanish text
 * 
 * Server component that renders a list of inbox items with primary "Abrir"
 * action and secondary "Marcar como hecho" action.
 */
export default function Inbox({ items }: { items: InboxItem[] }) {
  // Empty state
  if (!items || items.length === 0) {
    return (
      <Card 
        className="bg-card rounded-card shadow-elev-sm border border-border"
        role="region"
        aria-labelledby="inbox-heading"
      >
        <CardHeader className="pb-3">
          <h2 id="inbox-heading" className="text-lg font-semibold text-foreground">
            Bandeja de entrada
          </h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Todo al día por ahora.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="bg-card rounded-card shadow-elev-sm border border-border"
      role="region"
      aria-labelledby="inbox-heading"
    >
      <CardHeader className="pb-3">
        <h2 id="inbox-heading" className="text-lg font-semibold text-foreground">
          Bandeja de entrada
        </h2>
      </CardHeader>
      <CardContent>
        <ul role="list" className="space-y-3">
          {items.map((item) => (
            <InboxItemRow key={item.id} item={item} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * InboxItemRow - Individual inbox item with actions
 */
function InboxItemRow({ item }: { item: InboxItem }) {
  const { label, link } = getInboxText(item);

  return (
    <li 
      role="listitem" 
      className="flex items-center justify-between gap-3 p-3 rounded-button border border-border hover:bg-accent/50 transition-colors"
    >
      {/* Item label */}
      <p className="text-sm text-foreground flex-1 min-w-0">
        {label}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Primary action: Abrir */}
        {link && (
          <Button asChild size="sm" variant="default" className="rounded-button">
            <Link href={link}>
              Abrir
            </Link>
          </Button>
        )}

        {/* Secondary action: Marcar como hecho (stub) */}
        <Link
          href={`/api/inbox/complete?id=${item.id}`}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
        >
          Marcar como hecho
        </Link>
      </div>
    </li>
  );
}

// ============================================================================
// SERVER WRAPPER
// ============================================================================

/**
 * InboxServer - Server wrapper that fetches inbox items
 * 
 * Convenience wrapper for dashboard usage that handles data fetching.
 */
export async function InboxServer({ 
  userId, 
  orgId,
}: { 
  userId: string; 
  orgId: string;
}) {
  const items = await getInboxItems(userId, orgId);
  return <Inbox items={items} />;
}
