// src/components/Quotes/OrgQuoteSelector.tsx
/**
 * Selector de cotizaciones de la organización para vincular a casos.
 * 
 * Permite:
 * - Ver cotizaciones disponibles de la organización (desde el contenedor virtual)
 * - Buscar/filtrar cotizaciones
 * - Seleccionar múltiples cotizaciones
 * - Preview de datos extraídos
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Receipt,
  Search,
  Building2,
  Calendar,
  DollarSign,
  Package,
  Check,
  X,
  Loader2,
  AlertCircle,
  LinkIcon,
  Clock,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface LinkableQuote {
  id: string;
  artifactId: string;
  insurer: string | null;
  product: string | null;
  quotedPremium: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  status: string | null;
  fileName: string;
  uploadedAt: string;
  displayLabel: string;
}

interface OrgQuoteSelectorProps {
  orgId: string;
  caseId?: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  disabled?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function isQuoteExpired(validUntil: string | null | undefined): boolean {
  if (!validUntil) return false;
  try {
    return new Date(validUntil) < new Date();
  } catch {
    return false;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(value: string | null): string {
  if (!value) return 'N/A';
  try {
    const num = parseFloat(value);
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(num);
  } catch {
    return value;
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OrgQuoteSelector({
  orgId,
  caseId,
  selectedIds,
  onSelectionChange,
  disabled = false,
}: OrgQuoteSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<LinkableQuote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);

  // Sincronizar selección local con props
  useEffect(() => {
    setLocalSelectedIds(selectedIds);
  }, [selectedIds]);

  // Cargar cotizaciones cuando se abre el dialog
  const loadQuotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (caseId) {
        params.set('caseId', caseId);
      }
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }

      const response = await fetch(`/api/org-quotes/linkable?${params.toString()}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al cargar cotizaciones');
      }

      const data = await response.json();
      setQuotes(data.quotes || []);
    } catch (err: any) {
      console.error('❌ Error cargando cotizaciones:', err);
      setError(err.message || 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [caseId, searchTerm]);

  // Cargar al abrir
  useEffect(() => {
    if (isOpen) {
      loadQuotes();
    }
  }, [isOpen, loadQuotes]);

  // Toggle selección de una cotización
  const toggleQuote = (quoteId: string) => {
    setLocalSelectedIds(prev => {
      if (prev.includes(quoteId)) {
        return prev.filter(id => id !== quoteId);
      }
      return [...prev, quoteId];
    });
  };

  // Confirmar selección
  const handleConfirm = () => {
    onSelectionChange(localSelectedIds);
    setIsOpen(false);
  };

  // Cancelar y restaurar selección original
  const handleCancel = () => {
    setLocalSelectedIds(selectedIds);
    setIsOpen(false);
  };

  // Filtrar cotizaciones por búsqueda local
  const filteredQuotes = quotes.filter(quote => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      quote.insurer?.toLowerCase().includes(term) ||
      quote.product?.toLowerCase().includes(term) ||
      quote.fileName?.toLowerCase().includes(term)
    );
  });

  // Obtener datos de cotizaciones seleccionadas para mostrar badges
  const selectedQuotes = quotes.filter(q => selectedIds.includes(q.id));

  return (
    <div className="space-y-3">
      {/* Badges de cotizaciones seleccionadas */}
      {selectedQuotes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedQuotes.map(quote => (
            <Badge
              key={quote.id}
              variant="secondary"
              className="flex items-center gap-1 py-1 px-2"
            >
              <Receipt className="h-3 w-3" />
              <span className="truncate max-w-[150px]">
                {quote.insurer || quote.fileName}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectionChange(selectedIds.filter(id => id !== quote.id));
                  }}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Botón para abrir dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="gap-2"
          >
            <LinkIcon className="h-4 w-4" />
            {selectedIds.length > 0
              ? `${selectedIds.length} cotización(es) vinculada(s)`
              : 'Vincular cotizaciones'
            }
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Seleccionar cotizaciones
            </DialogTitle>
            <DialogDescription>
              Selecciona las cotizaciones de tu organización para vincular a este caso.
            </DialogDescription>
          </DialogHeader>

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por aseguradora, producto o archivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Lista de cotizaciones */}
          <ScrollArea className="flex-1 min-h-[300px] max-h-[400px] border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Cargando cotizaciones...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadQuotes}
                  className="mt-4"
                >
                  Reintentar
                </Button>
              </div>
            ) : filteredQuotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'No se encontraron cotizaciones con ese criterio'
                    : 'No hay cotizaciones disponibles para vincular'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredQuotes.map(quote => {
                  const isSelected = localSelectedIds.includes(quote.id);
                  const expired = isQuoteExpired(quote.expirationDate);

                  return (
                    <div
                      key={quote.id}
                      className={`
                        flex items-start gap-3 p-4 cursor-pointer transition-colors
                        ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'}
                        ${expired ? 'opacity-60' : ''}
                      `}
                      onClick={() => toggleQuote(quote.id)}
                    >
                      {/* Checkbox */}
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleQuote(quote.id)}
                        className="mt-1"
                      />

                      {/* Info de la cotización */}
                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Título */}
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {quote.insurer || 'Aseguradora desconocida'}
                          </span>
                          {expired && (
                            <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Expirada
                            </Badge>
                          )}
                        </div>

                        {/* Producto */}
                        {quote.product && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Package className="h-3 w-3" />
                            {quote.product}
                          </div>
                        )}

                        {/* Prima y fechas */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {quote.quotedPremium && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(quote.quotedPremium)}
                            </span>
                          )}
                          {quote.effectiveDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(quote.effectiveDate)}
                            </span>
                          )}
                        </div>

                        {/* Archivo */}
                        <div className="text-xs text-muted-foreground/70 truncate">
                          {quote.fileName}
                        </div>
                      </div>

                      {/* Check visual */}
                      {isSelected && (
                        <div className="shrink-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <DialogFooter className="gap-2 sm:gap-0">
            <div className="flex-1 text-sm text-muted-foreground">
              {localSelectedIds.length} cotización(es) seleccionada(s)
            </div>
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>
              Confirmar selección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
