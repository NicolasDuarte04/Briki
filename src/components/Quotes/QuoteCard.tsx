// /src/components/Quotes/QuoteCard.tsx
/**
 * Tarjeta compacta de cotización para listados
 * 
 * Sigue el patrón de PolicyCard:
 * - Link a página de detalle
 * - PinButton para anclar/desanclar
 * - Botón de eliminación
 * - Información resumida de la cotización
 * 
 * IMPORTANTE: Recibe extractedData como JSON y extrae los campos internamente,
 * siguiendo el mismo patrón que PolicyCard.
 */
'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PinButton } from '@/components/Workspace/PinButton';
import { 
  Receipt, 
  Building2, 
  Calendar,
  DollarSign,
  Trash2,
  Package,
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Datos de cotización para la tarjeta.
 * Recibe extractedData como JSON (estructura anidada de la IA)
 * y overallConfidence del modelo QuoteAnalysis.
 */
export interface QuoteCardData {
  id: string;
  artifactId?: string;
  /** JSON con datos extraídos por IA (estructura anidada) */
  extractedData: Record<string, unknown> | null;
  /** Confianza global del análisis (0-1) */
  overallConfidence: number;
  /** Fecha de análisis */
  extractedAt?: Date | string | null;
  /** Artifact relacionado */
  artifact?: {
    fileName?: string | null;
  } | null;
}

export interface QuoteCardProps {
  quote: QuoteCardData;
  onDelete?: (quoteId: string) => void;
  /** Whether this quote is pinned by the user */
  isPinned?: boolean;
  /** Base path for quote detail (default: /quotes/analysis) */
  basePath?: string;
}

// ============================================================================
// HELPERS: Extracción de datos anidados
// ============================================================================

/**
 * Extrae valor de estructura anidada de forma segura.
 * Maneja paths como "insurer.name", "quote.number", "financials.quoted_premium"
 */
function getNestedValue(data: Record<string, unknown> | null, path: string, fallback: unknown = null): unknown {
  if (!data) return fallback;
  
  const keys = path.split('.');
  let current: unknown = data;
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return fallback;
    }
    current = (current as Record<string, unknown>)[key];
  }
  
  return current ?? fallback;
}

/**
 * Extrae string de datos anidados, buscando múltiples paths posibles
 */
function extractString(data: Record<string, unknown> | null, ...paths: string[]): string | null {
  for (const path of paths) {
    const value = getNestedValue(data, path);
    if (value !== null && value !== undefined) {
      if (typeof value === 'string' && value.trim()) return value;
      if (typeof value === 'number') return String(value);
      if (typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        // Si es objeto, buscar .name o .value
        if (obj.name && typeof obj.name === 'string') return obj.name;
        if (obj.value && typeof obj.value === 'string') return obj.value;
      }
    }
  }
  return null;
}

/**
 * Extrae número de datos anidados
 */
function extractNumber(data: Record<string, unknown> | null, ...paths: string[]): number | null {
  for (const path of paths) {
    const value = getNestedValue(data, path);
    if (value !== null && value !== undefined) {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) return num;
      }
    }
  }
  return null;
}

/**
 * Extrae fecha de datos anidados
 */
function extractDate(data: Record<string, unknown> | null, ...paths: string[]): string | null {
  for (const path of paths) {
    const value = getNestedValue(data, path);
    if (value !== null && value !== undefined && typeof value === 'string') {
      return value;
    }
  }
  return null;
}

function formatDateWithLocale(dateStr: string | Date | null | undefined, fallback: string, locale: string): string {
  if (!dateStr) return fallback;
  try {
    return new Date(dateStr).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return String(dateStr);
  }
}

function formatCurrency(value: number | null | undefined, currency: string = 'MXN', fallback: string): string {
  if (value === null || value === undefined) return fallback;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function isQuoteExpired(validUntil: string | null | undefined): boolean {
  if (!validUntil) return false;
  try {
    return new Date(validUntil) < new Date();
  } catch {
    return false;
  }
}

// ============================================================================
// CONFIDENCE BADGE
// ============================================================================

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = confidence * 100;
  
  if (percentage >= 80) {
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 text-xs">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {percentage.toFixed(0)}%
      </Badge>
    );
  }
  if (percentage >= 50) {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 text-xs">
        <AlertCircle className="h-3 w-3 mr-1" />
        {percentage.toFixed(0)}%
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 text-xs">
      <Info className="h-3 w-3 mr-1" />
      {percentage.toFixed(0)}%
    </Badge>
  );
}

// ============================================================================
// VALIDITY BADGE
// ============================================================================

function ValidityBadge({ validUntil, t }: { validUntil: string | null | undefined; t: (key: string) => string }) {
  const isExpired = isQuoteExpired(validUntil);
  
  if (!validUntil) {
    return null;
  }
  
  if (isExpired) {
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 text-xs">
        <Clock className="h-3 w-3 mr-1" />
        {t('expired')}
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200 text-xs">
      <Clock className="h-3 w-3 mr-1" />
      {t('valid')}
    </Badge>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function QuoteCard({ 
  quote, 
  onDelete, 
  isPinned = false,
  basePath = '/quotes/analysis',
}: QuoteCardProps) {
  const t = useTranslations('quotes.card');
  const locale = useLocale();
  
  const data = quote.extractedData;
  const confidence = quote.overallConfidence ?? 0;
  
  // Extraer valores de la estructura anidada de extractedData
  // La IA retorna: { insurer: { name: "AXA" }, quote: { number: "123", valid_until: "2025-02-15" }, financials: { quoted_premium: 15000 }, ... }
  const insurer = extractString(data, 'insurer.name', 'insurer') || t('noInsurer');
  const product = extractString(data, 'quote.product_name', 'quote.product', 'product', 'quote.branch_type') || t('noProduct');
  const branchType = extractString(data, 'quote.branch_type', 'branch_type', 'insurance_type');
  const quoteNumber = extractString(data, 'quote.number', 'quote_number') || t('noNumber');
  const validUntil = extractDate(data, 'quote.valid_until', 'valid_until', 'validity_end');
  const quotedPremium = extractNumber(data, 'financials.quoted_premium', 'financials.total_premium', 'quoted_premium', 'total_premium');
  const currency = extractString(data, 'financials.currency', 'currency') || 'MXN';
  const effectiveDate = extractDate(data, 'proposed_term.start_date', 'effective_date', 'start_date');
  const expirationDate = extractDate(data, 'proposed_term.end_date', 'expiration_date', 'end_date');
  
  const fileName = quote.artifact?.fileName || t('untitledDocument');
  const notAvailable = t('notAvailable');
  const displayProduct = product !== t('noProduct') ? product : (branchType || t('noProduct'));
  
  // Fecha de análisis
  const analyzedAt = quote.extractedAt;
  
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(quote.id);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow h-full relative group overflow-hidden">
      <Link href={`${basePath}/${quote.id}`} className="block h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 w-full overflow-hidden">
            {/* Icon + Title */}
            <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className="font-semibold text-base truncate max-w-full" title={fileName}>
                  {fileName}
                </h3>
                <p className="text-xs text-muted-foreground truncate max-w-full">
                  #{quoteNumber}
                </p>
              </div>
            </div>
            
            {/* Actions: Badges, Pin, Delete */}
            <div className="flex items-center gap-1 shrink-0 flex-nowrap">
              <ValidityBadge validUntil={validUntil} t={t} />
              <ConfidenceBadge confidence={confidence} />
              <PinButton
                entityId={quote.id}
                entityType="quote"
                isPinned={isPinned}
              />
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title={t('deleteQuote')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-2 pt-0">
          {/* Insurer */}
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground truncate" title={insurer}>
              {insurer}
            </span>
          </div>
          
          {/* Product */}
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground truncate" title={displayProduct}>
              {displayProduct}
            </span>
          </div>
          
          {/* Quoted Premium */}
          {quotedPremium !== null && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">
                {formatCurrency(quotedPremium, currency, notAvailable)}
              </span>
            </div>
          )}
          
          {/* Proposed Term */}
          {(effectiveDate || expirationDate) && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">
                {formatDateWithLocale(effectiveDate, notAvailable, locale)} - {formatDateWithLocale(expirationDate, notAvailable, locale)}
              </span>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-3 border-t text-xs text-muted-foreground">
          {analyzedAt 
            ? t('analyzedOn', { date: formatDateWithLocale(analyzedAt, notAvailable, locale) })
            : t('pendingAnalysis')
          }
        </CardFooter>
      </Link>
    </Card>
  );
}
