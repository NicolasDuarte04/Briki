'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle } from 'lucide-react';
import type { RenewalsBuckets, RenewalItem } from '@/lib/data/workspace';
import { trackRenewalAction } from '@/lib/telemetry';
import { pathForCaseWithAction, type Locale } from '@/lib/routes/workspace';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface RenewalsRadarProps {
  renewals: RenewalsBuckets;
  locale: string;
}

interface RenewalRowProps {
  item: RenewalItem;
  locale: string;
  bucket: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formats a date as "dd MMM yyyy" in Spanish (e.g., "15 dic 2025")
 */
function formatExpirationDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return '—';
    }
    
    const formatter = new Intl.DateTimeFormat('es', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    
    return formatter.format(date);
  } catch {
    return '—';
  }
}

/**
 * Builds WhatsApp URL with prefilled message template in Spanish
 */
function buildWhatsAppUrl(clientName: string, policyLabel: string, expireAt: string): string {
  const formattedDate = formatExpirationDate(expireAt);
  const message = `Hola ${clientName}, te escribo para la renovación de tu póliza ${policyLabel}. Vence el ${formattedDate}. ¿Podemos agendar una llamada esta semana?`;
  
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * RenewalRow - Individual renewal item with CTAs
 */
function RenewalRow({ item, locale, bucket }: RenewalRowProps) {
  const formattedDate = formatExpirationDate(item.expire_at);
  const whatsappUrl = buildWhatsAppUrl(item.client_name, item.title, item.expire_at);
  const analysisUrl = pathForCaseWithAction(item.id, 'renewal', locale as Locale);

  const handleRenewalClick = () => {
    trackRenewalAction({
      policyId: item.id,
      bucket,
      action: 'click',
    });
  };

  return (
    <div className="flex items-center justify-between gap-4 py-3 px-4 border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors">
      {/* Client & Policy Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">
            {item.client_name}
          </span>
          <span className="text-xs text-muted-foreground" aria-hidden="true">•</span>
          <span className="text-xs text-muted-foreground truncate">
            {item.title}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Vence el {formattedDate}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Primary: Iniciar análisis */}
        <Button
          asChild
          size="sm"
          className="shrink-0 rounded-button"
          onClick={handleRenewalClick}
        >
          <Link href={analysisUrl}>
            Iniciar análisis
          </Link>
        </Button>

        {/* Secondary: WhatsApp */}
        <Button
          asChild
          variant="outline"
          size="icon-sm"
          className="shrink-0 rounded-button"
          aria-label={`Enviar mensaje de WhatsApp a ${item.client_name}`}
        >
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}

/**
 * EmptyState - Shown when a tab has no renewals
 */
function EmptyState() {
  return (
    <div className="py-12 text-center">
      <p className="text-sm text-muted-foreground">
        No hay renovaciones en este rango.
      </p>
    </div>
  );
}

/**
 * RenewalsList - Renders list of renewals or empty state
 */
function RenewalsList({
  items,
  locale,
  bucket,
}: {
  items: RenewalItem[];
  locale: string;
  bucket: string;
}) {
  if (!items || items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="border border-border rounded-card bg-card shadow-elev-sm overflow-hidden">
      {items.map(item => (
        <RenewalRow key={item.id} item={item} locale={locale} bucket={bucket} />
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * RenewalsRadar - Displays policy renewals grouped by urgency
 * 
 * Server component that renders tabbed lists of renewals grouped into
 * three time buckets: <30 days, 30-60 days, and 60-90 days. Each renewal
 * row includes client/policy info, expiration date, and CTAs for analysis
 * and WhatsApp outreach.
 * 
 * @param renewals - Renewals grouped into time buckets
 * @param locale - Current locale for building localized routes
 */
export function RenewalsRadar({ renewals, locale }: RenewalsRadarProps) {
  return (
    <section aria-labelledby="renewals-radar-title">
      <h2 id="renewals-radar-title" className="text-lg font-semibold text-foreground mb-4">
        Radar de Renovaciones
      </h2>

      <Tabs defaultValue="lt30" className="w-full">
        <TabsList className="w-full justify-start bg-muted/30 rounded-button">
          <TabsTrigger value="lt30" className="flex-1">
            &lt;30 días
          </TabsTrigger>
          <TabsTrigger value="d30_60" className="flex-1">
            30–60 días
          </TabsTrigger>
          <TabsTrigger value="d60_90" className="flex-1">
            60–90 días
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lt30" className="mt-4">
          <RenewalsList items={renewals.lt30} locale={locale} bucket="lt30" />
        </TabsContent>

        <TabsContent value="d30_60" className="mt-4">
          <RenewalsList
            items={renewals.d30_60}
            locale={locale}
            bucket="d30_60"
          />
        </TabsContent>

        <TabsContent value="d60_90" className="mt-4">
          <RenewalsList
            items={renewals.d60_90}
            locale={locale}
            bucket="d60_90"
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

