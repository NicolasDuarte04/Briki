"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUI } from "@/lib/ui/state";
import { useTranslations } from "next-intl";

export default function CaseBrief() {
  const { brief } = useUI();
  const t = useTranslations("workspace.caseBrief");
  const placeholder = "—";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="pb-1">
        <h1 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
          {t("title")}
        </h1>
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
              {brief.employees != null && (
              <div className="grid gap-x-6 gap-y-1 pb-2 last:pb-0 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-start">
                <dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground/70 sm:text-right">
                  {t("fields.employees")}
                </dt>
                <dd className="text-sm font-medium leading-6 text-foreground/90 break-words">
                  {brief.employees ?? placeholder}
                </dd>
              </div>
              )}
              {brief.insurance_category && (
              <div className="grid gap-x-6 gap-y-1 pb-2 last:pb-0 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-start">
                <dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground/70 sm:text-right">
                  {t("fields.category")}
                </dt>
                <dd className="text-sm font-medium leading-6 text-foreground/90 break-words">
                  {brief.insurance_category}
                </dd>
              </div>
              )}
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


