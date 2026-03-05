
"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUI } from "@/lib/ui/state";
import { ComparisonTable } from "./Comparison/ComparisonTable";
import { ComparisonSelector } from "./Comparison/ComparisonSelector";
import { ReformulateDialog } from "./Comparison/ReformulateDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Sparkles, FileText, RefreshCw, AlertTriangle, IterationCw, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ReformulationOptions } from "@/lib/types";

// ✅ FASE BASELINE vs CHALLENGERS: Props para recibir caseData con artifacts
interface ComparisonProps {
  caseData?: {
    id: string;
    artifacts?: Array<{
      id: string;
      fileName?: string;
      metadata?: { documentRole?: 'baseline' | 'challenger' };
    }>;
  } | null;
}

export default function Comparison({ caseData }: ComparisonProps = {}) {
  const t = useTranslations("workspace.comparisons");

  // Global State
  const policyAnalyses = useUI((state) => state.policyAnalyses);
  const comparisons = useUI((state) => state.comparisons);
  const activeComparison = useUI((state) => state.activeComparison);
  const activeComparisonId = useUI((state) => state.activeComparisonId);
  const comparisonLoading = useUI((state) => state.comparisonLoading);
  const alignCoveragesSemantically = useUI((state) => state.alignCoveragesSemantically);
  const loadComparisons = useUI((state) => state.loadComparisons);
  const setActiveComparisonId = useUI((state) => state.setActiveComparisonId);
  const deleteComparison = useUI((state) => state.deleteComparison);
  const currentCaseId = useUI((state) => state.currentCaseId);

  // Reformulation dialog state
  const [reformulateOpen, setReformulateOpen] = useState(false);
  
  // Excel export state
  const [exporting, setExporting] = useState(false);
  const exportComparison = useUI((state) => state.exportComparison);

  // Selection state - Set<string> from store
  const selectedAnalysisIds = useUI((state) => state.selectedAnalysisIds);
  const selectionCount = selectedAnalysisIds.size;
  const canGenerateProposal = selectionCount >= 1;

  // ✅ Filter analyses to include both:
  // - Direct analyses (caseId matches current case)
  // - Linked analyses (linkType === 'linked' from org policies via CasePolicyLink)
  // ✅ FIX: Include all link types (direct, linked, linked_quote) — consistent with Policies.tsx
  const validAnalyses = useMemo(() => {
    if (!currentCaseId) return [];
    return policyAnalyses.filter(a => 
      a.caseId === currentCaseId || a.linkType === 'linked' || a.linkType === 'linked_quote'
    );
  }, [policyAnalyses, currentCaseId]);

  // ✅ FASE MULTI-BASELINE: Identificar TODOS los análisis baseline
  // Fuente 1: Artifacts con provenance.documentRole === 'baseline' (subidos al caso)
  // Fuente 2: Analyses con linkType === 'linked' (pólizas vinculadas desde org)
  const baselineAnalysisIds = useMemo(() => {
    const ids = new Set<string>();

    // Fuente 1: Artifacts directos marcados como baseline
    if (caseData?.artifacts) {
      for (const artifact of caseData.artifacts) {
        const prov = typeof (artifact as any).provenance === 'object' ? (artifact as any).provenance : null;
        if ((prov as any)?.documentRole === 'baseline') {
          const match = validAnalyses.find(a => a.artifactId === artifact.id);
          if (match) ids.add(match.id);
        }
      }
    }

    // Fuente 2: Pólizas vinculadas desde org (linkType === 'linked') — patrón de Policies.tsx
    for (const analysis of validAnalyses) {
      if (analysis.linkType === 'linked') {
        ids.add(analysis.id);
      }
    }

    return ids;
  }, [caseData, validAnalyses]);

  // Derived State - use validAnalyses instead of all policyAnalyses
  const hasEnoughPolicies = validAnalyses.length >= 2;

  // ✅ Check if comparison is outdated (new analyses added or removed)
  const isComparisonOutdated = useMemo(() => {
    if (!activeComparison) return false;
    
    const currentAnalysisIds = validAnalyses.map(a => a.id).sort();
    const comparisonAnalysisIds = [...activeComparison.analysisIds].sort();
    
    // Different count = outdated
    if (currentAnalysisIds.length !== comparisonAnalysisIds.length) {
      return true;
    }
    
    // Different IDs = outdated
    return !currentAnalysisIds.every((id, idx) => id === comparisonAnalysisIds[idx]);
  }, [activeComparison, validAnalyses]);

  // Show regeneration button when there's no comparison OR comparison is outdated
  const showGenerateButton = !activeComparison || isComparisonOutdated;

  const handleAlign = async (reformulationOptions?: ReformulationOptions) => {
    // Error handling is managed in state.ts with toasts
    if (currentCaseId && validAnalyses.length >= 2) {
      console.log(`🔍 Comparing ${validAnalyses.length} analyses for case ${currentCaseId}`);
      await alignCoveragesSemantically(currentCaseId, validAnalyses.map(a => a.id), reformulationOptions);
    }
  };

  const handleReformulate = async (options: ReformulationOptions) => {
    setReformulateOpen(false);
    await handleAlign(options);
  };

  const handleDownloadMatrix = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await exportComparison({
        format: 'excel',
        title: activeComparison?.id ?? '',
        includeReferences: false,
        version: 'technical',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comparison-matrix-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Error toast is handled inside exportComparison (state.ts)
    } finally {
      setExporting(false);
    }
  };

  // ✅ FASE 30.4: Cargar comparaciones existentes al montar
  useEffect(() => {
    if (currentCaseId && comparisons.length === 0 && !comparisonLoading) {
      loadComparisons(currentCaseId);
    }
  }, [currentCaseId, loadComparisons]); // comparisons y comparisonLoading omitidos intencionalmente para evitar loops

  if (!hasEnoughPolicies) {
    return (
      <EmptyState
        title={t("empty.title")}
        description={t("empty.needMorePolicies")}
        hint={t("empty.uploadMoreHint")}
      />
    );
  }

  return (
    <Card className="flex h-full flex-col border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>
              {t("semantic.description")}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {activeComparison && (
              <Button
                variant="outline"
                onClick={() => setReformulateOpen(true)}
                disabled={comparisonLoading}
                className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <IterationCw className="mr-2 h-4 w-4" />
                {t("semantic.reformulateButton")}
              </Button>
            )}

            {activeComparison && (
              <Button
                variant="outline"
                onClick={handleDownloadMatrix}
                disabled={exporting || comparisonLoading}
                title={t("semantic.exportTooltip")}
                className="border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                {exporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("semantic.exportLoading")}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    {t("semantic.downloadMatrix")}
                  </>
                )}
              </Button>
            )}

            {showGenerateButton && (
              <Button
                onClick={() => handleAlign()}
                disabled={comparisonLoading}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md"
              >
                {comparisonLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isComparisonOutdated ? t("semantic.regenerating") : t("semantic.aligning")}
                  </>
                ) : isComparisonOutdated ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t("semantic.regenerateButton", { count: validAnalyses.length })}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t("semantic.generateButton")}
                  </>
                )}
              </Button>
            )}

            {activeComparison && (
              <div className="flex items-center gap-3">
                {selectionCount > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {selectionCount === 1 ? t("semantic.policiesSelected", { count: selectionCount }) : t("semantic.policiesSelectedPlural", { count: selectionCount })}
                  </span>
                )}
                <Button
                  onClick={() => {
                    if (!currentCaseId) {
                      console.error('No active case ID available');
                      return;
                    }
                    const generateProposal = useUI.getState().generateProposal;
                    const setActiveTab = useUI.getState().setActiveTab;
                    // generateProposal uses selectedAnalysisIds from state internally
                    generateProposal(currentCaseId, activeComparison.id)
                      .then(() => {
                        setActiveTab('proposal');
                      })
                      .catch((err) => {
                        console.error('Error generating proposal:', err);
                      });
                  }}
                  disabled={comparisonLoading || !canGenerateProposal}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md disabled:opacity-50"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {canGenerateProposal ? t("semantic.generateProposal") : t("semantic.selectAtLeastOne")}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Comparison Selector — only renders when >1 comparison */}
        <ComparisonSelector
          comparisons={comparisons}
          activeComparisonId={activeComparisonId}
          onSelect={setActiveComparisonId}
          onDelete={deleteComparison}
        />
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-6 px-0 pb-0">
        {/* ✅ FASE MULTI-BASELINE: Advertencia solo si cero baselines */}
        {activeComparison && baselineAnalysisIds.size === 0 && (
          <Alert variant="default" className="mx-4 mb-2 bg-amber-50 dark:bg-amber-950/20 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              {t("semantic.noBaselineWarning")}
            </AlertDescription>
          </Alert>
        )}
        
        {comparisonLoading ? (
          <ComparisonSkeleton />
        ) : activeComparison ? (
          <ComparisonTable
            comparison={activeComparison}
            analyses={policyAnalyses}
            {...(baselineAnalysisIds.size > 0 && { baselineAnalysisIds })}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 border-2 border-dashed rounded-xl bg-muted/10">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">{t("semantic.readyToCompare")}</h3>
            <p className="text-muted-foreground max-w-md mt-2">
              {t("semantic.clickToGenerate", { count: validAnalyses.length })}
            </p>
            <Button
              onClick={() => handleAlign()}
              variant="outline"
              className="mt-6"
            >
              {t("semantic.startComparison")}
            </Button>
          </div>
        )}
      </CardContent>

      {/* Reformulate Dialog */}
      <ReformulateDialog
        open={reformulateOpen}
        onOpenChange={setReformulateOpen}
        onConfirm={handleReformulate}
        comparisons={comparisons}
        loading={comparisonLoading}
      />
    </Card>
  );
}

function ComparisonSkeleton() {
  return (
    <div className="border rounded-lg overflow-x-auto bg-background shadow-sm">
      {/* ✅ FIX: Estructura de scroll único, consistente con ComparisonTable */}
      <div className="min-w-max">
        {/* Header Skeleton */}
        <div className="grid bg-muted/30 border-b border-border" style={{ gridTemplateColumns: '200px repeat(4, minmax(220px, 1fr))' }}>
          <div className="p-4 sticky left-0 bg-muted/30 z-10"><Skeleton className="h-4 w-24" /></div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 border-l border-border/50 flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>

        {/* Body Skeleton */}
        <div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col">
              <div className="grid bg-muted/50 border-y border-border/50" style={{ gridTemplateColumns: '200px repeat(4, minmax(220px, 1fr))' }}>
                <div className="px-4 py-2 sticky left-0 bg-muted/50 z-10"><Skeleton className="h-3 w-32" /></div>
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="border-l border-border/30" />
                ))}
              </div>
              <div className="grid border-b border-border/50" style={{ gridTemplateColumns: '200px repeat(4, minmax(220px, 1fr))' }}>
                <div className="p-4 sticky left-0 bg-background z-10"><Skeleton className="h-4 w-40" /></div>
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="p-4 border-l border-border/50">
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



function EmptyState({ title, description, hint }: { title: string; description: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 px-5 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <FileText className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold text-foreground/90">{title}</p>
        <p className="text-sm text-muted-foreground/90 max-w-xs mx-auto">{description}</p>
      </div>
      <p className="text-xs text-muted-foreground/80 mt-2 bg-muted/50 px-3 py-1 rounded-full">{hint}</p>
    </div>
  );
}
