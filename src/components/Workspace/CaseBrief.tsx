"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUI } from "@/lib/ui/state";
import { useTranslations } from "next-intl";

export default function CaseBrief() {
  const { brief } = useUI();
  const t = useTranslations("workspace.caseBrief");
  const lines = (brief.coverage ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const placeholder = "—";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="pb-1">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
          {t("title")}
        </h2>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        <Card aria-readonly>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
              {t("sections.keyFacts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4 text-sm">
              <div className="grid gap-x-6 gap-y-1 pb-2 last:pb-0 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-start">
                <dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground/70 sm:text-right">
                  {t("fields.business")}
                </dt>
                <dd className="text-sm font-medium leading-6 text-foreground/90 break-words">
                  {brief.businessType ?? placeholder}
                </dd>
              </div>
              <div className="grid gap-x-6 gap-y-1 pb-2 last:pb-0 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-start">
                <dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground/70 sm:text-right">
                  {t("fields.employees")}
                </dt>
                <dd className="text-sm font-medium leading-6 text-foreground/90 break-words">
                  {brief.employees ?? placeholder}
                </dd>
              </div>
              <div className="grid gap-x-6 gap-y-2 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-start">
                <dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground/70 sm:text-right">
                  {t("fields.lines")}
                </dt>
                <dd>
                  {lines.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {lines.map((line) => (
                        <Badge
                          key={line}
                          variant="secondary"
                          className="rounded-full border border-border/50 bg-background px-2.5 py-1 text-[11px] font-medium leading-tight text-foreground/80 shadow-none"
                        >
                          {line}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-foreground/50">{placeholder}</span>
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card aria-readonly>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
              {t("sections.notes")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
              {brief.freeText?.trim() && brief.freeText !== "Por definir..." ? brief.freeText.trim() : placeholder}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


