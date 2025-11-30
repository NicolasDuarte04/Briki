
import { useLocale } from "next-intl";
import { ComparisonCell as IComparisonCell } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, X, Minus, AlertCircle } from "lucide-react";

interface ComparisonCellProps {
    cell: IComparisonCell;
    currency?: string;
}

export function ComparisonCell({ cell, currency = 'COP' }: ComparisonCellProps) {
    const locale = useLocale();
    const { value, status, userNote } = cell;

    if (status === 'missing' || !value) {
        return (
            <div className="flex items-center justify-center p-2 text-muted-foreground/50">
                <Minus className="h-4 w-4" />
            </div>
        );
    }

    // Determine status color
    const statusColor = {
        better: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400",
        worse: "text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400",
        equal: "text-slate-600 bg-slate-50 dark:bg-slate-900/30 dark:text-slate-400",
        missing: "text-gray-400"
    }[status];

    // Format the main value
    let displayValue: React.ReactNode = value.name;

    if (value.limitAmount !== undefined && value.limitAmount !== null) {
        displayValue = formatMoney(
            { amountMinor: value.limitAmount * 100, currency: (value.limitUnit as any) || currency },
            { locale, maximumFractionDigits: 0 }
        );
    } else if (typeof value === 'string') {
        displayValue = value;
    }

    return (
        <div className={cn("relative flex flex-col gap-1 p-3 text-sm transition-colors hover:bg-muted/50",
            status === 'better' && "bg-emerald-50/30 dark:bg-emerald-950/10"
        )}>
            <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-foreground">{displayValue}</span>

                {status !== 'equal' && (
                    <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px] uppercase tracking-wider border-0", statusColor)}>
                        {status}
                    </Badge>
                )}
            </div>

            {value.description && (
                <p className="text-xs text-muted-foreground line-clamp-2" title={value.description}>
                    {value.description}
                </p>
            )}

            {value.deductibleAmount && (
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="font-medium">Deducible:</span>
                    {formatMoney(
                        { amountMinor: value.deductibleAmount * 100, currency: (value.deductibleUnit as any) || currency },
                        { locale, maximumFractionDigits: 0 }
                    )}
                </div>
            )}

            {userNote && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="absolute bottom-1 right-1 text-amber-500">
                                <AlertCircle className="h-3 w-3" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{userNote}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    );
}
