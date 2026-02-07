
import { PolicyComparison, PolicyAnalysis } from "@/lib/types";
import { ComparisonRow } from "./ComparisonRow";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield } from "lucide-react";
import { useUI } from "@/lib/ui/state";
import { useTranslations } from "next-intl";

interface ComparisonTableProps {
    comparison: PolicyComparison;
    analyses: PolicyAnalysis[];
    baselineAnalysisId?: string; // ✅ FASE BASELINE vs CHALLENGERS: ID del análisis baseline
}

export function ComparisonTable({ comparison, analyses, baselineAnalysisId }: ComparisonTableProps) {
    const t = useTranslations("workspace.comparisons.semantic");
    // Selection state from global store
    const selectedAnalysisIds = useUI((state) => state.selectedAnalysisIds);
    const toggleAnalysisSelection = useUI((state) => state.toggleAnalysisSelection);

    // Group rows by category
    // Defensive check: ensure rows exists and is an array
    const rows = Array.isArray(comparison.rows) ? comparison.rows : [];
    const groupedRows = rows.reduce((acc, row) => {
        const category = row.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(row);
        return acc;
    }, {} as Record<string, typeof comparison.rows>);

    // Sort categories (Coverage first, then others)
    const categoryOrder = ['coverage', 'deductible', 'exclusion', 'benefit', 'financial', 'requirement', 'other'];
    const sortedCategories = Object.keys(groupedRows).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    return (
        <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background shadow-sm">
            {/* Table Header */}
            <div className="grid grid-cols-[200px_repeat(auto-fit,minmax(200px,1fr))] bg-muted/30 border-b border-border">
                <div className="p-4 font-semibold text-sm text-muted-foreground flex items-center">
                    Concepto
                </div>
                {comparison.analysisIds.map((id) => {
                    const analysis = analyses.find(a => a.id === id);
                    const insurerName = (analysis?.extractedData as any)?.insurer?.name || 'Unknown Insurer';
                    const policyNumber = (analysis?.extractedData as any)?.policyNumber || 'N/A';
                    const isSelected = selectedAnalysisIds.has(id);
                    const isBaseline = id === baselineAnalysisId; // ✅ FASE BASELINE vs CHALLENGERS

                    return (
                        <div 
                            key={id} 
                            className={`p-4 border-l border-border/50 flex flex-col gap-1 ${
                                isBaseline 
                                    ? 'bg-blue-50/80 dark:bg-blue-950/30 border-l-2 border-l-blue-400' 
                                    : ''
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Checkbox
                                    id={`select-${id}`}
                                    checked={isSelected}
                                    onCheckedChange={() => toggleAnalysisSelection(id)}
                                    aria-label={`Incluir ${insurerName} en propuesta`}
                                />
                                <label
                                    htmlFor={`select-${id}`}
                                    className="text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer"
                                >
                                    Incluir
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-foreground">{insurerName}</span>
                                {isBaseline && (
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-[10px] flex items-center gap-1">
                                        <Shield className="h-3 w-3" />
                                        {t("baseline")}
                                    </Badge>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground">{policyNumber}</span>
                            {analysis?.overallConfidence && (
                                <Badge variant="secondary" className="w-fit text-[10px] mt-1">
                                    {Math.round(analysis.overallConfidence * 100)}% Confianza
                                </Badge>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Table Body */}
            <ScrollArea className="flex-1">
                <div className="flex flex-col">
                    {sortedCategories.map((category) => (
                        <div key={category} className="flex flex-col">
                            {/* Category Header */}
                            <div className="bg-muted/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-y border-border/50 sticky top-0 z-10">
                                {category === 'financial' ? 'Condiciones Financieras' :
                                    category === 'coverage' ? 'Coberturas' :
                                        category === 'deductible' ? 'Deducibles' :
                                            category === 'exclusion' ? 'Exclusiones' :
                                                category}
                            </div>

                            {/* Rows */}
                            {(groupedRows[category] || []).map((row, index) => (
                                <ComparisonRow
                                    key={row.id}
                                    row={row}
                                    analysisIds={comparison.analysisIds}
                                    isEven={index % 2 === 0}
                                    {...(baselineAnalysisId && { baselineAnalysisId })}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
