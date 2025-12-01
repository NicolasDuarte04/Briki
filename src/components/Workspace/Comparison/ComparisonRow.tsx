
import { ComparisonRow as IComparisonRow, ComparisonCell as IComparisonCell } from "@/lib/types";
import { ComparisonCell } from "./ComparisonCell";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ComparisonRowProps {
    row: IComparisonRow;
    analysisIds: string[];
    isEven: boolean;
}

export function ComparisonRow({ row, analysisIds, isEven }: ComparisonRowProps) {
    return (
        <div className={cn(
            "grid grid-cols-[200px_repeat(auto-fit,minmax(200px,1fr))] border-b border-border/50 transition-colors",
            isEven ? "bg-muted/10" : "bg-background"
        )}>
            {/* Row Header (Coverage Name) */}
            <div className="flex flex-col justify-center p-3 border-r border-border/50">
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

                // Handle missing cells gracefully
                // Note: userNote is omitted intentionally to comply with exactOptionalPropertyTypes
                const safeCell: IComparisonCell = cell || {
                    value: null,
                    reference: null,
                    status: 'missing'
                };

                return (
                    <div key={id} className="border-r border-border/50 last:border-r-0">
                        <ComparisonCell cell={safeCell} />
                    </div>
                );
            })}
        </div>
    );
}
