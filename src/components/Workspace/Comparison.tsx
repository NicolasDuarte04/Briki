
"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUI } from "@/lib/ui/state";
import { ComparisonTable } from "./Comparison/ComparisonTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Sparkles, FileText, RefreshCw } from "lucide-react";

export default function Comparison() {
  const t = useTranslations("workspace.comparisons");

  // Global State
  const policyAnalyses = useUI((state) => state.policyAnalyses);
  const activeComparison = useUI((state) => state.activeComparison);
  const comparisonLoading = useUI((state) => state.comparisonLoading);
  const alignCoveragesSemantically = useUI((state) => state.alignCoveragesSemantically);
  const loadActiveComparison = useUI((state) => state.loadActiveComparison);
  const currentCaseId = useUI((state) => state.currentCaseId);
  
  // Selection state - Set<string> from store
  const selectedAnalysisIds = useUI((state) => state.selectedAnalysisIds);
  const selectionCount = selectedAnalysisIds.size;
  const canGenerateProposal = selectionCount >= 1;

  // ✅ Filter analyses to include both:
  // - Direct analyses (caseId matches current case)
  // - Linked analyses (linkType === 'linked' from org policies via CasePolicyLink)
  const validAnalyses = useMemo(() => {
    if (!currentCaseId) return [];
    return policyAnalyses.filter(a => 
      a.caseId === currentCaseId || a.linkType === 'linked'
    );
  }, [policyAnalyses, currentCaseId]);

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

  const handleAlign = async () => {
    // Error handling is managed in state.ts with toasts
    if (currentCaseId && validAnalyses.length >= 2) {
      console.log(`🔍 Comparing ${validAnalyses.length} analyses for case ${currentCaseId}`);
      await alignCoveragesSemantically(currentCaseId, validAnalyses.map(a => a.id));
    }
  };

  // ✅ FASE 30.4: Cargar comparación existente al montar
  useEffect(() => {
    if (currentCaseId && !activeComparison && !comparisonLoading) {
      loadActiveComparison(currentCaseId);
    }
  }, [currentCaseId, loadActiveComparison]); // activeComparison y comparisonLoading omitidos intencionalmente para evitar loops

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

          {showGenerateButton && (
            <Button
              onClick={handleAlign}
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
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-6 px-0 pb-0">
        {comparisonLoading ? (
          <ComparisonSkeleton />
        ) : activeComparison ? (
          <ComparisonTable
            comparison={activeComparison}
            analyses={policyAnalyses}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 border-2 border-dashed rounded-xl bg-muted/10">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">{t("semantic.readyToCompare")}</h3>
            <p className="text-muted-foreground max-w-md mt-2">
              {t("semantic.clickToGenerate", { count: validAnalyses.length })}
            </p>
            <Button
              onClick={handleAlign}
              variant="outline"
              className="mt-6"
            >
              {t("semantic.startComparison")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComparisonSkeleton() {
  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background shadow-sm">
      {/* Header Skeleton */}
      <div className="grid grid-cols-[200px_repeat(3,1fr)] bg-muted/30 border-b border-border">
        <div className="p-4"><Skeleton className="h-4 w-24" /></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border-l border-border/50 flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Body Skeleton */}
      <div className="flex-1 p-0">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col">
            <div className="bg-muted/50 px-4 py-2 border-y border-border/50">
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="grid grid-cols-[200px_repeat(3,1fr)] border-b border-border/50">
              <div className="p-4"><Skeleton className="h-4 w-40" /></div>
              {[1, 2, 3].map((j) => (
                <div key={j} className="p-4 border-l border-border/50">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[200px_repeat(3,1fr)] border-b border-border/50">
              <div className="p-4"><Skeleton className="h-4 w-36" /></div>
              {[1, 2, 3].map((j) => (
                <div key={j} className="p-4 border-l border-border/50">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
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
