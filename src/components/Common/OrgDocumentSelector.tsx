// src/components/Common/OrgDocumentSelector.tsx
/**
 * Selector combinado de documentos de la organización (pólizas + cotizaciones).
 * 
 * Permite:
 * - Vincular pólizas existentes de la organización a un caso
 * - Vincular cotizaciones existentes de la organización a un caso
 * - Interfaz unificada con pestañas
 * - Búsqueda y filtrado independiente por tipo
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Shield,
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
  FileText,
  User,
  Clock,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

// ============================================================================
// TYPES
// ============================================================================

export interface LinkablePolicy {
  id: string;
  artifactId: string;
  fileName: string;
  fileId?: string;
  extractedAt: string;
  overallConfidence: number;
  policyNumber: string | null;
  insurer: string | null;
  policyType: string | null;
  sumInsured: string | null;
  startDate: string | null;
  endDate: string | null;
  insuredName: string | null;
}

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

interface OrgDocumentSelectorProps {
  orgId: string;
  excludeCaseId?: string;
  selectedPolicyIds: string[];
  selectedQuoteIds: string[];
  onPolicySelectionChange: (ids: string[]) => void;
  onQuoteSelectionChange: (ids: string[]) => void;
  disabled?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

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

function isQuoteExpired(expirationDate: string | null): boolean {
  if (!expirationDate) return false;
  try {
    return new Date(expirationDate) < new Date();
  } catch {
    return false;
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function PolicyCard({
  policy,
  isSelected,
  onToggle,
}: {
  policy: LinkablePolicy;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`
        p-3 rounded-lg border cursor-pointer transition-all
        ${isSelected 
          ? 'border-primary bg-primary/5 shadow-sm' 
          : 'border-border hover:border-muted-foreground/50 hover:bg-muted/30'
        }
      `}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="font-medium text-sm truncate">
              {policy.insurer || 'Aseguradora no especificada'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {policy.policyNumber && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span className="truncate">#{policy.policyNumber}</span>
              </div>
            )}
            {policy.policyType && (
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{policy.policyType}</span>
              </div>
            )}
            {policy.insuredName && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="truncate">{policy.insuredName}</span>
              </div>
            )}
            {policy.sumInsured && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span className="truncate">{formatCurrency(policy.sumInsured)}</span>
              </div>
            )}
            {(policy.startDate || policy.endDate) && (
              <div className="flex items-center gap-1 col-span-2">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDate(policy.startDate)} - {formatDate(policy.endDate)}
                </span>
              </div>
            )}
          </div>

          <div className="mt-2 text-xs text-muted-foreground truncate">
            📄 {policy.fileName}
          </div>
        </div>
        
        {isSelected && (
          <Check className="h-5 w-5 text-primary shrink-0" />
        )}
      </div>
    </div>
  );
}

function QuoteCard({
  quote,
  isSelected,
  onToggle,
}: {
  quote: LinkableQuote;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const expired = isQuoteExpired(quote.expirationDate);
  
  return (
    <div
      className={`
        p-3 rounded-lg border cursor-pointer transition-all
        ${isSelected 
          ? 'border-primary bg-primary/5 shadow-sm' 
          : 'border-border hover:border-muted-foreground/50 hover:bg-muted/30'
        }
        ${expired ? 'opacity-60' : ''}
      `}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="h-4 w-4 text-green-600 shrink-0" />
            <span className="font-medium text-sm truncate">
              {quote.insurer || 'Aseguradora no especificada'}
            </span>
            {expired && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0">
                Expirada
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {quote.product && (
              <div className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                <span className="truncate">{quote.product}</span>
              </div>
            )}
            {quote.quotedPremium && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span className="truncate">{formatCurrency(quote.quotedPremium)}</span>
              </div>
            )}
            {quote.expirationDate && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Válida hasta: {formatDate(quote.expirationDate)}</span>
              </div>
            )}
          </div>

          <div className="mt-2 text-xs text-muted-foreground truncate">
            📄 {quote.fileName}
          </div>
        </div>
        
        {isSelected && (
          <Check className="h-5 w-5 text-primary shrink-0" />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OrgDocumentSelector({
  orgId,
  excludeCaseId,
  selectedPolicyIds,
  selectedQuoteIds,
  onPolicySelectionChange,
  onQuoteSelectionChange,
  disabled = false,
}: OrgDocumentSelectorProps) {
  const t = useTranslations('Brief.orgDocuments');
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'policies' | 'quotes'>('policies');
  
  // Policy state
  const [isPoliciesLoading, setIsPoliciesLoading] = useState(false);
  const [policiesError, setPoliciesError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<LinkablePolicy[]>([]);
  const [policySearchTerm, setPolicySearchTerm] = useState('');
  const [localPolicyIds, setLocalPolicyIds] = useState<string[]>(selectedPolicyIds);
  
  // Quote state
  const [isQuotesLoading, setIsQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<LinkableQuote[]>([]);
  const [quoteSearchTerm, setQuoteSearchTerm] = useState('');
  const [localQuoteIds, setLocalQuoteIds] = useState<string[]>(selectedQuoteIds);

  // Sync local with props
  useEffect(() => {
    setLocalPolicyIds(selectedPolicyIds);
  }, [selectedPolicyIds]);

  useEffect(() => {
    setLocalQuoteIds(selectedQuoteIds);
  }, [selectedQuoteIds]);

  // Load policies
  const loadPolicies = useCallback(async () => {
    setIsPoliciesLoading(true);
    setPoliciesError(null);

    try {
      const params = new URLSearchParams();
      if (excludeCaseId) {
        params.set('excludeCaseId', excludeCaseId);
      }

      const response = await fetch(`/api/org-policies/linkable?${params.toString()}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al cargar pólizas');
      }

      const data = await response.json();
      setPolicies(data.policies || []);
    } catch (err: any) {
      console.error('❌ Error cargando pólizas:', err);
      setPoliciesError(err.message || 'Error desconocido');
    } finally {
      setIsPoliciesLoading(false);
    }
  }, [excludeCaseId]);

  // Load quotes
  const loadQuotes = useCallback(async () => {
    setIsQuotesLoading(true);
    setQuotesError(null);

    try {
      const params = new URLSearchParams();
      if (excludeCaseId) {
        params.set('caseId', excludeCaseId);
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
      setQuotesError(err.message || 'Error desconocido');
    } finally {
      setIsQuotesLoading(false);
    }
  }, [excludeCaseId]);

  // Load data when opened
  useEffect(() => {
    if (isOpen) {
      loadPolicies();
      loadQuotes();
    }
  }, [isOpen, loadPolicies, loadQuotes]);

  // Toggle handlers
  const togglePolicy = (policyId: string) => {
    setLocalPolicyIds(prev => 
      prev.includes(policyId) 
        ? prev.filter(id => id !== policyId) 
        : [...prev, policyId]
    );
  };

  const toggleQuote = (quoteId: string) => {
    setLocalQuoteIds(prev => 
      prev.includes(quoteId) 
        ? prev.filter(id => id !== quoteId) 
        : [...prev, quoteId]
    );
  };

  // Confirm selection
  const handleConfirm = () => {
    console.log('🔍 [OrgDocumentSelector] Confirming - policies:', localPolicyIds.length, 'quotes:', localQuoteIds.length);
    onPolicySelectionChange(localPolicyIds);
    onQuoteSelectionChange(localQuoteIds);
    setIsOpen(false);
  };

  // Cancel and restore
  const handleCancel = () => {
    setLocalPolicyIds(selectedPolicyIds);
    setLocalQuoteIds(selectedQuoteIds);
    setIsOpen(false);
  };

  // Filter by search
  const filteredPolicies = policies.filter(policy => {
    if (!policySearchTerm.trim()) return true;
    const term = policySearchTerm.toLowerCase();
    return (
      policy.fileName?.toLowerCase().includes(term) ||
      policy.insurer?.toLowerCase().includes(term) ||
      policy.policyNumber?.toLowerCase().includes(term) ||
      policy.policyType?.toLowerCase().includes(term) ||
      policy.insuredName?.toLowerCase().includes(term)
    );
  });

  const filteredQuotes = quotes.filter(quote => {
    if (!quoteSearchTerm.trim()) return true;
    const term = quoteSearchTerm.toLowerCase();
    return (
      quote.insurer?.toLowerCase().includes(term) ||
      quote.product?.toLowerCase().includes(term) ||
      quote.fileName?.toLowerCase().includes(term)
    );
  });

  // Get selected items for badges
  const selectedPoliciesData = policies.filter(p => selectedPolicyIds.includes(p.id));
  const selectedQuotesData = quotes.filter(q => selectedQuoteIds.includes(q.id));
  const totalSelected = selectedPolicyIds.length + selectedQuoteIds.length;

  return (
    <div className="space-y-3">
      {/* Badges de documentos seleccionados */}
      {totalSelected > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedPoliciesData.map(policy => (
            <Badge
              key={`policy-${policy.id}`}
              variant="secondary"
              className="flex items-center gap-1.5 py-1 px-2 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-700"
            >
              <Shield className="h-3 w-3" />
              <span className="truncate max-w-[120px]">
                {policy.insurer || policy.fileName}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onPolicySelectionChange(selectedPolicyIds.filter(id => id !== policy.id))}
                  className="ml-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {selectedQuotesData.map(quote => (
            <Badge
              key={`quote-${quote.id}`}
              variant="secondary"
              className="flex items-center gap-1.5 py-1 px-2 bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-700"
            >
              <Receipt className="h-3 w-3" />
              <span className="truncate max-w-[120px]">
                {quote.insurer || quote.fileName}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onQuoteSelectionChange(selectedQuoteIds.filter(id => id !== quote.id))}
                  className="ml-1 rounded-full hover:bg-green-200 dark:hover:bg-green-800 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Dialog Trigger */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="w-full justify-start gap-2"
          >
            <LinkIcon className="h-4 w-4" />
            {t('linkDocuments')}
            {totalSelected > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {totalSelected}
              </Badge>
            )}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              {t('title')}
            </DialogTitle>
            <DialogDescription>
              {t('description')}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'policies' | 'quotes')} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="policies" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {t('policiesTab')}
                {localPolicyIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {localPolicyIds.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="quotes" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                {t('quotesTab')}
                {localQuoteIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {localQuoteIds.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Policies Tab */}
            <TabsContent value="policies" className="flex-1 flex flex-col min-h-0 mt-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchPolicies')}
                  value={policySearchTerm}
                  onChange={(e) => setPolicySearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <ScrollArea className="flex-1 min-h-0 h-[300px]">
                {isPoliciesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : policiesError ? (
                  <div className="flex flex-col items-center justify-center py-8 text-destructive">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p className="text-sm">{policiesError}</p>
                    <Button variant="ghost" size="sm" onClick={loadPolicies} className="mt-2">
                      {t('retry')}
                    </Button>
                  </div>
                ) : filteredPolicies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Shield className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">{t('noPolicies')}</p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-4">
                    {filteredPolicies.map(policy => (
                      <PolicyCard
                        key={policy.id}
                        policy={policy}
                        isSelected={localPolicyIds.includes(policy.id)}
                        onToggle={() => togglePolicy(policy.id)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Quotes Tab */}
            <TabsContent value="quotes" className="flex-1 flex flex-col min-h-0 mt-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchQuotes')}
                  value={quoteSearchTerm}
                  onChange={(e) => setQuoteSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <ScrollArea className="flex-1 min-h-0 h-[300px]">
                {isQuotesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : quotesError ? (
                  <div className="flex flex-col items-center justify-center py-8 text-destructive">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p className="text-sm">{quotesError}</p>
                    <Button variant="ghost" size="sm" onClick={loadQuotes} className="mt-2">
                      {t('retry')}
                    </Button>
                  </div>
                ) : filteredQuotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Receipt className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">{t('noQuotes')}</p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-4">
                    {filteredQuotes.map(quote => (
                      <QuoteCard
                        key={quote.id}
                        quote={quote}
                        isSelected={localQuoteIds.includes(quote.id)}
                        onToggle={() => toggleQuote(quote.id)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <div className="flex items-center gap-2 mr-auto text-sm text-muted-foreground">
              {localPolicyIds.length > 0 && (
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" /> {localPolicyIds.length}
                </span>
              )}
              {localQuoteIds.length > 0 && (
                <span className="flex items-center gap-1">
                  <Receipt className="h-3 w-3" /> {localQuoteIds.length}
                </span>
              )}
            </div>
            <Button variant="outline" onClick={handleCancel}>
              {t('cancel')}
            </Button>
            <Button onClick={handleConfirm}>
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
