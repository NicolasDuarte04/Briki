"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProvenanceChip, type ProvenanceTag } from "@/components/Sourcing/ProvenanceChip";
import { cn } from "@/lib/utils";

type SourcingRow = {
  name: string;
  provenance: ProvenanceTag;
};

interface SourcingProgressWidgetProps {
  rows?: SourcingRow[];
  isLoading?: boolean;
  onStop?: () => void;
  className?: string;
  compact?: boolean;
}

export function SourcingProgressWidget({
  rows: rowsProp,
  isLoading = true,
  onStop,
  className,
  compact = false,
}: SourcingProgressWidgetProps = {}) {
  const t = useTranslations("sourcing.status");
  
  // Usar datos estáticos en lugar de t.raw() que puede devolver objetos React
  const defaultRows: SourcingRow[] = [
    { name: "API Sources", provenance: "API" },
    { name: "Portal Data", provenance: "Portal" },
    { name: "PDF Analysis", provenance: "PDF" }
  ];
  
  const rows = rowsProp ?? defaultRows;

  return (
    <Card
      className={cn(
        "border-border/60 bg-background/95 py-0 shadow-[0_18px_42px_-24px_rgba(15,23,42,0.35)]",
        compact && "gap-3 rounded-2xl border-border/50",
        className
      )}
    >
      <CardHeader
        className={cn(
          "items-center gap-2 px-4 py-4",
          compact && "px-4 py-3"
        )}
      >
        <CardTitle
          className={cn(
            "text-sm font-semibold leading-5 text-foreground",
            compact && "text-xs font-semibold leading-5 text-foreground/90"
          )}
        >
          {t("cardTitle")}
        </CardTitle>
        {onStop ? (
          <CardAction className="row-auto row-span-1 row-start-1 self-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 rounded-full border border-border/40 bg-transparent px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-accent/40 hover:text-foreground",
                compact && "px-2.5 text-[11px]"
              )}
              onClick={onStop}
            >
              {t("stopAction")}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className={cn("px-4 pb-4", compact && "pb-3 pt-0")}>
        <ul className={cn("flex flex-col gap-2", compact && "gap-1.5")} role="list">
          {rows.map((row) => (
            <li
              key={`${row.name}-${row.provenance}`}
              className={cn(
                "rounded-lg border border-border/40 bg-muted/30 px-3 py-2.5",
                compact && "rounded-xl border-border/30 px-3 py-2"
              )}
            >
              <div
                className={cn(
                  "flex flex-wrap items-center gap-x-3 gap-y-2",
                  compact && "gap-y-1.5"
                )}
              >
                <div
                  className={cn(
                    "relative min-w-0 flex-1 text-sm font-medium leading-5 text-foreground",
                    compact && "text-xs leading-5"
                  )}
                >
                  <Skeleton
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute inset-0 h-full w-full rounded-full transition-opacity duration-150",
                      !isLoading && "!animate-none opacity-0"
                    )}
                  />
                  <span className={cn("block truncate", isLoading && "invisible")}>{row.name}</span>
                  {isLoading ? <span className="sr-only">{row.name}</span> : null}
                </div>
                <div className="flex w-full justify-start sm:w-auto sm:justify-end">
                  <ProvenanceChip
                    provenance={row.provenance}
                    ariaLabel={t("chipAria", { provenance: row.provenance })}
                    className="flex-1 justify-center sm:flex-none"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default SourcingProgressWidget;


