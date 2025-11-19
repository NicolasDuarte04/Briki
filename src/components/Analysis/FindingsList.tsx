"use client";

import React from 'react';
import { PolicyAnalysis } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUI } from '@/lib/ui/state';
import { FileText, CheckCircle, XCircle, AlertCircle, DollarSign, Calendar, Building2 } from 'lucide-react';

interface FindingsListProps {
  analysis: PolicyAnalysis;
  onNavigateToPage?: (pageNumber: number) => void;
}

/**
 * FindingsList Component - FASE 5 (Mejorado)
 * 
 * Lista de hallazgos del análisis de la póliza:
 * - Agrupados por categoría (financials, coverages, exclusions, etc.)
 * - Chips de confianza
 * - Click para navegación automática al PDF
 * - Sincronización con PdfViewer
 * 
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 6.2.1
 */
export function FindingsList({ analysis, onNavigateToPage }: FindingsListProps) {
  const setSelectedField = useUI(s => s.setSelectedField);
  
  const { extractedData, overallConfidence, pageReferences } = analysis;

  function handleFindingClick(fieldName: string, pageNumber?: number) {
    console.log('🔍 [FindingsList] Field clicked:', fieldName, 'Page:', pageNumber);
    
    // Actualizar campo seleccionado en el estado global
    setSelectedField(fieldName);
    
    // Si hay una página asociada, navegar a ella
    if (pageNumber && onNavigateToPage) {
      console.log('🔍 [FindingsList] Navigating to page:', pageNumber);
      onNavigateToPage(pageNumber);
    }
  }

  function getConfidenceBadge(confidence: number) {
    if (confidence >= 0.9) {
      return <Badge className="text-xs bg-green-500/10 text-green-700 border-green-500/20">Alto</Badge>;
    } else if (confidence >= 0.7) {
      return <Badge className="text-xs bg-yellow-500/10 text-yellow-700 border-yellow-500/20">Medio</Badge>;
    } else {
      return <Badge className="text-xs bg-red-500/10 text-red-700 border-red-500/20">Bajo</Badge>;
    }
  }

  function getPageForField(fieldName: string): number | null {
    const ref = pageReferences?.find(r => r.fieldName === fieldName);
    return ref?.pageNumber || null;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Hallazgos</h3>
        {getConfidenceBadge(overallConfidence)}
      </div>

      {/* Información General */}
      {extractedData?.policy_number && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Información General
          </h4>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs h-auto py-2"
            onClick={() => handleFindingClick('policy_number', getPageForField('policy_number') || undefined)}
          >
            <div className="flex flex-col items-start w-full">
              <span className="text-muted-foreground">Número de Póliza</span>
              <span className="font-medium">{extractedData.policy_number}</span>
              {getPageForField('policy_number') && (
                <span className="text-[10px] text-primary">
                  📄 Pág. {getPageForField('policy_number')}
                </span>
              )}
            </div>
          </Button>

          {extractedData?.insured_name && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-auto py-2"
              onClick={() => handleFindingClick('insured_name', getPageForField('insured_name') || undefined)}
            >
              <div className="flex flex-col items-start w-full">
                <span className="text-muted-foreground">Asegurado</span>
                <span className="font-medium">{extractedData.insured_name}</span>
                {getPageForField('insured_name') && (
                  <span className="text-[10px] text-primary">
                    📄 Pág. {getPageForField('insured_name')}
                  </span>
                )}
              </div>
            </Button>
          )}

          {extractedData?.insurer?.name && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-auto py-2"
              onClick={() => handleFindingClick('insurer_name', getPageForField('insurer_name') || undefined)}
            >
              <div className="flex flex-col items-start w-full">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Aseguradora
                </span>
                <span className="font-medium">{extractedData.insurer.name}</span>
                {getPageForField('insurer_name') && (
                  <span className="text-[10px] text-primary">
                    📄 Pág. {getPageForField('insurer_name')}
                  </span>
                )}
              </div>
            </Button>
          )}
        </div>
      )}

      {/* Financials */}
      {extractedData?.financials && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Financieros
          </h4>
          
          {extractedData.financials.premium_total && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-auto py-2"
              onClick={() => handleFindingClick('premium_total', getPageForField('premium_total') || undefined)}
            >
              <div className="flex flex-col items-start w-full">
                <span className="text-muted-foreground">Prima Total</span>
                <span className="font-medium text-lg">
                  {new Intl.NumberFormat('es-MX', {
                    style: 'currency',
                    currency: extractedData.currency || 'MXN'
                  }).format(extractedData.financials.premium_total)}
                </span>
                {getPageForField('premium_total') && (
                  <span className="text-[10px] text-primary">
                    📄 Pág. {getPageForField('premium_total')}
                  </span>
                )}
              </div>
            </Button>
          )}

          {extractedData.financials.premium_net && (
            <div className="pl-4 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prima Neta:</span>
                <span>
                  {new Intl.NumberFormat('es-MX', {
                    style: 'currency',
                    currency: extractedData.currency || 'MXN'
                  }).format(extractedData.financials.premium_net)}
                </span>
              </div>
              {extractedData.financials.taxes && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Impuestos:</span>
                  <span>
                    {new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: extractedData.currency || 'MXN'
                    }).format(extractedData.financials.taxes)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Vigencia */}
      {(extractedData?.effective_from || extractedData?.effective_to) && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Vigencia
          </h4>
          <div className="text-xs space-y-1">
            {extractedData.effective_from && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inicio:</span>
                <span>{new Date(extractedData.effective_from).toLocaleDateString('es-MX')}</span>
              </div>
            )}
            {extractedData.effective_to && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fin:</span>
                <span>{new Date(extractedData.effective_to).toLocaleDateString('es-MX')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Coberturas */}
      {extractedData?.coverages && extractedData.coverages.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Coberturas ({extractedData.coverages.length})
          </h4>
          <div className="space-y-1">
            {extractedData.coverages.slice(0, 3).map((coverage: any, index: number) => (
              <div key={index} className="text-xs p-2 bg-muted/50 rounded">
                <div className="font-medium">{coverage.name}</div>
                {coverage.limit_amount && (
                  <div className="text-muted-foreground">
                    Límite: {new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: coverage.limit_unit || 'MXN'
                    }).format(coverage.limit_amount)}
                  </div>
                )}
              </div>
            ))}
            {extractedData.coverages.length > 3 && (
              <div className="text-xs text-muted-foreground text-center py-1">
                +{extractedData.coverages.length - 3} más
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exclusiones */}
      {extractedData?.exclusions && extractedData.exclusions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Exclusiones ({extractedData.exclusions.length})
          </h4>
          <div className="space-y-1">
            {extractedData.exclusions.slice(0, 2).map((exclusion: any, index: number) => (
              <div key={index} className="text-xs p-2 bg-destructive/5 rounded">
                <div className="font-medium">{exclusion.name}</div>
              </div>
            ))}
            {extractedData.exclusions.length > 2 && (
              <div className="text-xs text-muted-foreground text-center py-1">
                +{extractedData.exclusions.length - 2} más
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nota sobre confianza general */}
      <div className="pt-4 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3" />
          <span>Confianza general: {Math.round(overallConfidence * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

