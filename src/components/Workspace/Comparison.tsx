
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUI } from "@/lib/ui/state";
import { ComparisonTable } from "./Comparison/ComparisonTable";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Comparison() {
  const t = useTranslations("workspace.comparisons");

  // Global State
  const policyAnalyses = useUI((state) => state.policyAnalyses);
  const activeComparison = useUI((state) => state.activeComparison);
  const comparisonLoading = useUI((state) => state.comparisonLoading);
  const alignCoveragesSemantically = useUI((state) => state.alignCoveragesSemantically);

  // Local State
  const [error, setError] = useState<string | null>(null);

  // Derived State
  const hasEnoughPolicies = policyAnalyses.length >= 2;

  const handleAlign = async () => {
    try {
      setError(null);
      await alignCoveragesSemantically(policyAnalyses);
    } catch (err: any) {
      console.error("Alignment failed:", err);
      setError(err.message || "Failed to align policies");
    }
  };

  // ✅ FASE 30.4: Cargar comparación existente al montar
  const loadActiveComparison = useUI((state) => state.loadActiveComparison);
  const currentCaseId = useUI((state) => state.currentCaseId);

  useEffect(() => {
    if (currentCaseId && !activeComparison && !comparisonLoading) {
      loadActiveComparison(currentCaseId);
    }
  }, [currentCaseId, loadActiveComparison]); // activeComparison y comparisonLoading omitidos intencionalmente para evitar loops

  if (!hasEnoughPolicies) {
    return (
      <EmptyState
        title={t("empty.title")}
        description="Necesitas al menos 2 pólizas analizadas para realizar una comparación."
        hint="Sube y analiza más pólizas en la pestaña de Análisis."
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
              Comparación semántica impulsada por IA. Analiza coberturas, exclusiones y beneficios.
            </CardDescription>
          </div>

          {!activeComparison && (
            <Button
              onClick={handleAlign}
              disabled={comparisonLoading}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md"
            >
              {comparisonLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Alineando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generar Comparativa con IA
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-6 px-0 pb-0">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {comparisonLoading ? (
          <LoadingState />
        ) : activeComparison ? (
          <ComparisonTable
            comparison={activeComparison}
            analyses={policyAnalyses}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 border-2 border-dashed rounded-xl bg-muted/10">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Listo para comparar</h3>
            <p className="text-muted-foreground max-w-md mt-2">
              Haz clic en "Generar Comparativa con IA" para que nuestro motor semántico alinee las coberturas de las {policyAnalyses.length} pólizas disponibles.
            </p>
            <Button
              onClick={handleAlign}
              variant="outline"
              className="mt-6"
            >
              Iniciar Comparación
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <div className="relative flex items-center justify-center">
        <div className="absolute animate-ping h-12 w-12 rounded-full bg-indigo-400 opacity-20"></div>
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">
        Analizando semánticamente las pólizas...
      </p>
    </div>
  );
}

function EmptyState({ title, description, hint }: { title: string; description: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 px-5 py-8 text-center">
      <p className="text-lg font-semibold text-foreground/90">{title}</p>
      <p className="text-sm text-muted-foreground/90">{description}</p>
      <p className="text-xs text-muted-foreground/80 mt-2">{hint}</p>
    </div>
  );
}
