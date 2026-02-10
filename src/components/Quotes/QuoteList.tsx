// /src/components/Quotes/QuoteList.tsx
/**
 * Lista de cotizaciones con grid, búsqueda y filtros
 * 
 * Sigue el patrón de PolicyList:
 * - Grid responsive de tarjetas
 * - Búsqueda por texto
 * - Filtros por aseguradora y estado de validez
 * - Diálogo de confirmación para eliminación
 * 
 * IMPORTANTE: Recibe extractedData como JSON y extrae los campos internamente,
 * siguiendo el mismo patrón que PolicyList.
 */
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { QuoteCard, type QuoteCardData } from './QuoteCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Receipt } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============================================================================
// TYPES
// ============================================================================

export interface QuoteListProps {
  quotes: QuoteCardData[];
  orgId: string;
  /** Set of pinned quote IDs */
  pinnedQuoteIds?: Set<string>;
  /** Base path for quote detail links */
  basePath?: string;
  /** Show filters (default: true) */
  showFilters?: boolean;
}

// ============================================================================
// HELPERS: Extracción de datos anidados (igual que QuoteCard)
// ============================================================================

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

function extractString(data: Record<string, unknown> | null, ...paths: string[]): string | null {
  for (const path of paths) {
    const value = getNestedValue(data, path);
    if (value !== null && value !== undefined) {
      if (typeof value === 'string' && value.trim()) return value;
      if (typeof value === 'number') return String(value);
      if (typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        if (obj.name && typeof obj.name === 'string') return obj.name;
        if (obj.value && typeof obj.value === 'string') return obj.value;
      }
    }
  }
  return null;
}

function extractDate(data: Record<string, unknown> | null, ...paths: string[]): string | null {
  for (const path of paths) {
    const value = getNestedValue(data, path);
    if (value !== null && value !== undefined && typeof value === 'string') {
      return value;
    }
  }
  return null;
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
// MAIN COMPONENT
// ============================================================================

export function QuoteList({ 
  quotes, 
  orgId, 
  pinnedQuoteIds = new Set(),
  basePath = '/quotes/analysis',
  showFilters = true,
}: QuoteListProps) {
  const router = useRouter();
  const t = useTranslations('quotes.filters');
  const tDelete = useTranslations('quotes.delete');
  const [searchTerm, setSearchTerm] = useState('');
  const [insurerFilter, setInsurerFilter] = useState<string>('all');
  const [validityFilter, setValidityFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Extract unique insurers for filter - extraer de extractedData
  const uniqueInsurers = useMemo(() => {
    const insurers = new Set<string>();
    quotes.forEach(quote => {
      const insurer = extractString(quote.extractedData, 'insurer.name', 'insurer');
      if (insurer) insurers.add(insurer);
    });
    return Array.from(insurers).sort();
  }, [quotes]);
  
  // Filter quotes - usando extracción de datos anidados
  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote => {
      const data = quote.extractedData;
      const searchLower = searchTerm.toLowerCase();
      
      // Extraer campos de extractedData
      const insurer = extractString(data, 'insurer.name', 'insurer') || '';
      const product = extractString(data, 'quote.product_name', 'quote.product', 'product') || '';
      const quoteNumber = extractString(data, 'quote.number', 'quote_number') || '';
      const prospectName = extractString(data, 'prospect.name', 'prospect_name', 'insured_name') || '';
      const validUntil = extractDate(data, 'quote.valid_until', 'valid_until', 'validity_end');
      const fileName = quote.artifact?.fileName || '';
      
      // Search match
      const matchesSearch = !searchTerm || 
        insurer.toLowerCase().includes(searchLower) ||
        product.toLowerCase().includes(searchLower) ||
        quoteNumber.toLowerCase().includes(searchLower) ||
        prospectName.toLowerCase().includes(searchLower) ||
        fileName.toLowerCase().includes(searchLower);
      
      // Insurer filter
      const matchesInsurer = insurerFilter === 'all' || insurer === insurerFilter;
      
      // Validity filter
      let matchesValidity = true;
      if (validityFilter === 'valid') {
        matchesValidity = !isQuoteExpired(validUntil);
      } else if (validityFilter === 'expired') {
        matchesValidity = isQuoteExpired(validUntil);
      }
      
      return matchesSearch && matchesInsurer && matchesValidity;
    });
  }, [quotes, searchTerm, insurerFilter, validityFilter]);

  const handleDeleteClick = (quoteId: string) => {
    setQuoteToDelete(quoteId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!quoteToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch('/api/org-quotes/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ artifactId: quoteToDelete }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete quote');
      }
      
      // Refresh page to show updated list
      router.refresh();
    } catch (error) {
      console.error('Error deleting quote:', error);
      alert(error instanceof Error ? error.message : 'Error al eliminar cotización');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
    }
  };
  
  // Find quote info for delete dialog
  const quoteToDeleteInfo = quoteToDelete 
    ? quotes.find(q => q.id === quoteToDelete || q.artifactId === quoteToDelete)
    : null;

  return (
    <div className="space-y-6">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Insurer Filter */}
          <Select value={insurerFilter} onValueChange={setInsurerFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('filterByInsurer')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allInsurers')}</SelectItem>
              {uniqueInsurers.map(insurer => (
                <SelectItem key={insurer} value={insurer}>
                  {insurer}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Validity Filter */}
          <Select value={validityFilter} onValueChange={setValidityFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t('filterByValidity')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatus')}</SelectItem>
              <SelectItem value="valid">{t('validOnly')}</SelectItem>
              <SelectItem value="expired">{t('expiredOnly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {t('showing', { count: filteredQuotes.length, total: quotes.length })}
      </div>
      
      {/* Quote Grid */}
      {filteredQuotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">{t('noResults')}</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {searchTerm || insurerFilter !== 'all' || validityFilter !== 'all'
              ? t('tryDifferentFilters')
              : t('uploadFirstQuote')
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              onDelete={() => handleDeleteClick(quote.artifactId || quote.id)}
              isPinned={pinnedQuoteIds.has(quote.id)}
              basePath={basePath}
            />
          ))}
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tDelete('title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tDelete('description', { 
                fileName: quoteToDeleteInfo?.artifact?.fileName || 'esta cotización' 
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {tDelete('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? tDelete('deleting') : tDelete('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
