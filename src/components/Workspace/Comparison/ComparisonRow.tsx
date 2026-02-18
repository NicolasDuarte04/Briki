
import { ComparisonRow as IComparisonRow, ComparisonCell as IComparisonCell } from "@/lib/types";
import { ComparisonCell } from "./ComparisonCell";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ComparisonRowProps {
    row: IComparisonRow;
    analysisIds: string[];
    columnCount: number; // ✅ FIX: Número explícito de columnas para grid fijo
    isEven: boolean;
    baselineAnalysisId?: string; // ✅ FASE BASELINE vs CHALLENGERS
}

export function ComparisonRow({ row, analysisIds, columnCount, isEven, baselineAnalysisId }: ComparisonRowProps) {
    // ✅ FIX: Grid con número fijo de columnas (no auto-fit que oculta columnas)
    const gridTemplateColumns = `200px repeat(${columnCount}, minmax(220px, 1fr))`;

    return (
        <div 
            className={cn(
                "grid border-b border-border/50 transition-colors min-w-max",
                isEven ? "bg-muted/10" : "bg-background"
            )}
            style={{ gridTemplateColumns }}
        >
            {/* Row Header (Coverage Name) - ✅ Sticky para scroll horizontal */}
            <div className={cn(
                "flex flex-col justify-center p-3 border-r border-border/50 sticky left-0 z-10",
                isEven ? "bg-muted/10" : "bg-background" // ✅ Mismo color que la fila para continuidad visual
            )}>
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{row.coverageName}</span>
                    {row.isMandatory && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-3 w-3 text-blue-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Cobertura obligatoria o crítica</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
                <span className="text-xs text-muted-foreground capitalize">{row.category}</span>
            </div>

            {/* Cells */}
            {analysisIds.map((id) => {
                const cell = row.values[id];
                const isBaseline = id === baselineAnalysisId; // ✅ FASE BASELINE vs CHALLENGERS

                // Handle missing cells gracefully
                // Note: userNote is omitted intentionally to comply with exactOptionalPropertyTypes
                const safeCell: IComparisonCell = cell || {
                    value: null,
                    reference: null,
                    status: 'missing'
                };

                return (
                    <div 
                        key={id} 
                        className={cn(
                            "border-r border-border/50 last:border-r-0",
                            isBaseline && "bg-blue-50/50 dark:bg-blue-950/20" // ✅ FASE BASELINE vs CHALLENGERS: Highlight baseline column
                        )}
                    >
                        <ComparisonCell cell={safeCell} />
                    </div>
                );
            })}
        </div>
    );
}
