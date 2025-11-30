
import { PolicyComparison, PolicyAnalysis } from "@/lib/types";
import { ComparisonRow } from "./ComparisonRow";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ComparisonTableProps {
    comparison: PolicyComparison;
    analyses: PolicyAnalysis[];
}

export function ComparisonTable({ comparison, analyses }: ComparisonTableProps) {
    // Group rows by category
    const groupedRows = comparison.rows.reduce((acc, row) => {
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

                    return (
                        <div key={id} className="p-4 border-l border-border/50 flex flex-col gap-1">
                            <span className="font-bold text-sm text-foreground">{insurerName}</span>
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
                            {groupedRows[category].map((row, index) => (
                                <ComparisonRow
                                    key={row.id}
                                    row={row}
                                    analysisIds={comparison.analysisIds}
                                    isEven={index % 2 === 0}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
