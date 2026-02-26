"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
import { useUI } from "@/lib/ui/state";
import { type CaseBrief, type CurrencyCode, type Money, type Policy, type Proposal, type ProposalSelectedPlan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckCircle2, FileText } from "lucide-react";

const PROPOSAL_PREFIX = "workspace.proposal.";

// ✅ FASE 31: Updated interface to use embedded data
interface EmbeddedPlanSummary {
  planId: string;
  insurerName: string;
  policyNumber: string;
  premiumTotal: number;
  currency: string;
  coverages: Array<{ name: string; description?: string; limitAmount?: number }>;
  confidence: number;
  fileName?: string;
  rationale: string;
}

function EmptyProposalState() {
  const t = useTranslations("workspace.proposal");
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 border-2 border-dashed rounded-xl bg-muted/10">
      <FileText className="h-16 w-16 text-muted-foreground/50" />
      <h3 className="text-xl font-semibold">No hay propuesta generada</h3>
      <p className="text-muted-foreground text-center max-w-md">
        Genera una comparación primero, y luego crea una propuesta desde el tab de Comparaciones.
      </p>
      <Button
        variant="outline"
        onClick={() => {
          const setActiveTab = useUI.getState().setActiveTab;
          setActiveTab('comparisons');
        }}
      >
        Ir a Comparaciones
      </Button>
    </div>
  );
}

export default function Proposal() {
  const t = useTranslations("workspace.proposal");
  const tComparisonCards = useTranslations("workspace.comparisons.cards");
  const locale = useLocale();

  // ✅ FASE 31.3: Removed generic type to avoid CurrencyCode incompatibility
  const brief = useUI((state) => state.brief);

  // ✅ FASE 31: Read from activeProposal if available, fallback to legacy state
  const activeProposal = useUI((state) => state.activeProposal);
  const currentCaseId = useUI((state) => state.currentCaseId);
  const loadProposalByCase = useUI((state) => state.loadProposalByCase);
  const legacyBrokerProfile = useUI((state) => state.proposalBrokerProfile);
  const legacySelectedPlans = useUI<ProposalSelectedPlan[]>((state) => state.proposalSelectedPlans);
  const legacyDisclosuresKeys = useUI<Proposal["disclosuresKeys"]>((state) => state.proposalDisclosuresKeys);
  const legacyMathCheck = useUI<Proposal["mathCheck"]>((state) => state.proposalMathCheck);
  const legacyShareUrl = useUI((state) => state.proposalShareUrl);
  const legacyGeneratedOn = useUI((state) => state.proposalGeneratedOn);

  // ✅ FASE 31.5: Auto-load proposal for historical cases
  useEffect(() => {
    if (currentCaseId && currentCaseId !== 'new-thread-placeholder' && !activeProposal) {
      loadProposalByCase(currentCaseId);
    }
  }, [currentCaseId, activeProposal, loadProposalByCase]);

  // Derived values with fallback logic
  // Derived values with defensive fallback logic
  const brokerProfile = activeProposal?.content.brokerProfile
    ?? legacyBrokerProfile
    ?? { agency: "", phone: null, email: null };

  const selectedPlans = activeProposal?.content.selectedPlans
    ?? legacySelectedPlans
    ?? [];

  const disclosuresKeys = activeProposal?.content.disclosuresKeys
    ?? legacyDisclosuresKeys
    ?? [];

  const mathCheck = activeProposal?.content.mathCheck
    ?? legacyMathCheck
    ?? { passed: false, messageKey: "" };

  const shareUrl = activeProposal?.content.shareUrl
    ?? legacyShareUrl
    ?? "";

  const generatedOn = activeProposal?.content.generatedOn
    ?? legacyGeneratedOn
    ?? null;

  const loading = useUI((state) => state.proposalLoading);
  const [feedback, setFeedback] = useState<
    { id: number; message: string; tone: "default" | "destructive" } | null
  >(null);

  const canExport = useMemo(() => !loading && selectedPlans.length > 0, [loading, selectedPlans]);

  const handleExportPdf = useCallback(() => {
    if (!canExport) return;
    window.print();
  }, [canExport]);

  const handleCopy = useCallback(() => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setFeedback({ id: Date.now(), message: t("share.copySuccess"), tone: "default" });
    }).catch(() => {
      setFeedback({ id: Date.now(), message: t("share.copyError"), tone: "destructive" });
    });
  }, [shareUrl, t]);

  const formattedDate = useMemo(() => {
    const dateValue = generatedOn ? new Date(generatedOn) : new Date();
    if (Number.isNaN(dateValue.getTime())) return null;
    return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(dateValue);
  }, [generatedOn, locale]);

  // ✅ FASE 31: Updated to use embedded data directly
  const planSummaries = useMemo<EmbeddedPlanSummary[]>(() => {
    return selectedPlans
      .map((selection: any) => {
        // Use embedded data if available, otherwise create minimal fallback
        const rationaleKey = normalizeKey(selection.rationaleKey);

        return {
          planId: selection.planId,
          insurerName: selection.insurerName || 'Aseguradora',
          policyNumber: selection.policyNumber || 'N/A',
          premiumTotal: selection.premiumTotal || 0,
          currency: selection.currency || 'COP',
          coverages: selection.coverages || [],
          confidence: selection.confidence || 0.8,
          fileName: selection.fileName,
          rationale: rationaleKey ? t(rationaleKey) : t("selectedPlans.defaultRationale"),
        } satisfies EmbeddedPlanSummary;
      });
  }, [selectedPlans, t]);

  const summaryDetails = useMemo(() => {
    if (!planSummaries.length) return null;

    const premiums = planSummaries.map((plan) => plan.premiumTotal);
    const currencies = [...new Set(planSummaries.map((plan) => plan.currency))];
    const currency = currencies[0] || 'COP';

    // Collect all coverage names
    const coverageNames = new Set<string>();
    planSummaries.forEach((plan) => {
      plan.coverages.forEach((cov) => coverageNames.add(cov.name));
    });

    const minPremium = Math.min(...premiums);
    const maxPremium = Math.max(...premiums);
    const avgPremium = premiums.reduce((a, b) => a + b, 0) / premiums.length;

    const premiumRange = minPremium === maxPremium
      ? formatMoney({ amountMinor: minPremium * 100, currency: currency as CurrencyCode }, { locale })
      : `${formatMoney({ amountMinor: minPremium * 100, currency: currency as CurrencyCode }, { locale })} - ${formatMoney({ amountMinor: maxPremium * 100, currency: currency as CurrencyCode }, { locale })}`;

    return {
      premiumRange: premiumRange || "—",
      averageDeductible: "Consultar póliza",
      riders: coverageNames.size > 0 ? Array.from(coverageNames).slice(0, 4).join(", ") : t("summary.ridersFallback"),
      networks: t("summary.networkFallback"),
      services: t("summary.serviceFallback"),
    } as const;
  }, [locale, planSummaries, t]);

  const normalizedDisclosures = disclosuresKeys
    .map((key: string) => normalizeKey(key))
    .filter((key: string | undefined): key is string => Boolean(key));

  const mathMessageKey = normalizeKey(mathCheck.messageKey);

  return (
    <div className="workspace-proposal-print w-full px-6 md:px-8 pt-4 space-y-6 md:space-y-8 print:px-0 print:pt-0">
      <Card className="workspace-proposal-card w-full">
        <CardHeader className="gap-2">
          <CardTitle>{t("title")}</CardTitle>
          {formattedDate ? (
            <p className="text-xs font-normal leading-snug text-muted-foreground/90 text-balance break-words">
              {t("meta.generatedOn", { date: formattedDate })}
            </p>
          ) : null}
          {canExport ? (
            <CardAction data-print="hide">
              <Button type="button" variant="outline" size="sm" onClick={handleExportPdf}>
                {t("actions.exportPdf")}
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className="workspace-proposal-content space-y-6 md:space-y-8 text-sm text-muted-foreground">
          <section aria-labelledby="proposal-brief" className="grid gap-4 lg:grid-cols-2">
            <article className="workspace-proposal-surface rounded-2xl border border-border/70 bg-background/60 p-5 shadow-sm">
              <header className="mb-3">
                <h2 id="proposal-brief" className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                  {t("briefCard.title")}
                </h2>
                <p className="text-xs text-muted-foreground/70">{t("briefCard.subtitle")}</p>
              </header>
              <dl className="space-y-3 text-sm text-foreground/90">
                {brief.employees != null && (
                <div className="grid gap-1">
                  <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">{t("briefCard.fields.employees")}</dt>
                  <dd className="font-medium leading-snug break-words">{brief.employees ?? "—"}</dd>
                </div>
                )}
                {brief.insurance_category && (
                <div className="grid gap-1">
                  <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">{t("briefCard.fields.category")}</dt>
                  <dd className="font-medium leading-snug break-words">{brief.insurance_category}</dd>
                </div>
                )}
                {brief.freeText?.trim() && brief.freeText !== "Por definir..." ? (
                  <div className="grid gap-1">
                    <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">{t("briefCard.notesLabel")}</dt>
                    <dd className="leading-snug break-words text-muted-foreground/90">{brief.freeText}</dd>
                  </div>
                ) : null}
              </dl>
            </article>

            <article className="workspace-proposal-surface rounded-2xl border border-border/70 bg-background/60 p-5 shadow-sm">
              <header className="mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                  {t("brokerCard.title")}
                </h2>
              </header>
              <dl className="space-y-3 text-sm text-foreground/90">
                <div className="grid gap-1">
                  <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">{t("brokerCard.agencyLabel")}</dt>
                  <dd className="font-medium leading-snug break-words">{brokerProfile.agency}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">{t("brokerCard.phoneLabel")}</dt>
                  <dd className="font-medium leading-snug break-words">{brokerProfile.phone ?? "—"}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">{t("brokerCard.emailLabel")}</dt>
                  <dd className="font-medium leading-snug">
                    {brokerProfile.email ? (
                      <a
                        href={`mailto:${brokerProfile.email}`}
                        className="break-all underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {brokerProfile.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            </article>
          </section>

          <section aria-labelledby="proposal-plans" className="space-y-6 md:space-y-8">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="proposal-plans" className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                {t("selectedPlans.title")}
              </h2>
              {planSummaries.length ? (
                <span className="text-xs text-muted-foreground/75">{t("selectedPlans.countLabel", { count: planSummaries.length })}</span>
              ) : null}
            </header>
            {planSummaries.length ? (
              <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-4">
                {planSummaries.map((plan, index) => {
                  const cardId = `proposal-plan-${index}`;
                  const confidenceText = `${Math.round(plan.confidence * 100)}%`;
                  return (
                    <article
                      key={plan.planId}
                      role="group"
                      aria-labelledby={`${cardId}-title`}
                      tabIndex={0}
                      className="workspace-proposal-surface focus-visible:ring-ring focus-visible:ring-offset-background flex h-full flex-col rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-offset-2"
                    >
                      <header className="space-y-1">
                        <h3 id={`${cardId}-title`} className="text-lg font-semibold text-foreground/90">
                          {plan.insurerName} - {plan.policyNumber}
                        </h3>
                        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground/70">{t("plans.scoreLabel", { value: confidenceText })}</p>
                      </header>
                      <div className="my-4 h-px w-full bg-border/60" aria-hidden />
                      <dl className="space-y-3 text-sm text-foreground/90">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">{t("plans.premiumLabel")}</dt>
                          <dd className="min-w-0 text-right font-semibold text-foreground/90 break-words">
                            {formatMoney({ amountMinor: plan.premiumTotal * 100, currency: plan.currency as CurrencyCode }, { locale })}
                          </dd>
                        </div>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">{t("plans.deductibleLabel")}</dt>
                          <dd className="min-w-0 text-right font-semibold text-foreground/90 break-words">
                            {t("plans.deductibleConsult")}
                          </dd>
                        </div>
                        <div className="flex flex-col gap-1">
                          <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">{t("plans.ridersLabel")}</dt>
                          <dd>
                            {plan.coverages.length ? (
                              <span className="font-medium text-foreground/90">{plan.coverages.map(c => c.name).join(", ")}</span>
                            ) : (
                              <span className="text-muted-foreground/70">{t("plans.ridersEmpty")}</span>
                            )}
                          </dd>
                        </div>
                      </dl>
                      <div className="my-4 h-px w-full bg-border/60" aria-hidden />
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">{t("plans.benefitsLabel")}</p>
                          <ul className="mt-1 space-y-1 text-sm text-foreground/85">
                            {plan.coverages.length ? (
                              plan.coverages.slice(0, 5).map((coverage) => (
                                <li key={coverage.name} className="flex items-start gap-2">
                                  <span aria-hidden className="mt-1 inline-block size-1.5 rounded-full bg-muted-foreground/50" />
                                  <span>{coverage.name}{coverage.description ? `: ${coverage.description}` : ''}</span>
                                </li>
                              ))
                            ) : (
                              <li className="text-muted-foreground/70">{t("plans.benefitsFallback")}</li>
                            )}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">{t("plans.rationaleLabel")}</p>
                          <p className="text-sm leading-snug text-muted-foreground/90">{plan.rationale}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-border/80 bg-muted/10 p-6 text-sm text-muted-foreground/80">
                {t("selectedPlans.emptyState")}
              </p>
            )}
          </section>

          {summaryDetails ? (
            <section aria-labelledby="proposal-summary" className="space-y-6 md:space-y-8">
              <header>
                <h2 id="proposal-summary" className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                  {t("summary.title")}
                </h2>
              </header>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <SummaryTile label={t("summary.premiumRange")}>{summaryDetails.premiumRange}</SummaryTile>
                <SummaryTile label={t("summary.avgDeductible")}>{summaryDetails.averageDeductible}</SummaryTile>
                <SummaryTile label={t("summary.ridersLabel")}>{summaryDetails.riders}</SummaryTile>
                <SummaryTile label={t("summary.networkLabel")}>{summaryDetails.networks}</SummaryTile>
                <SummaryTile label={t("summary.serviceLabel")}>{summaryDetails.services}</SummaryTile>
              </div>
            </section>
          ) : null}

          <section aria-labelledby="proposal-disclosures" className="space-y-6 md:space-y-8">
            <h2 id="proposal-disclosures" className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
              {t("disclosures.title")}
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground/90">
              {normalizedDisclosures.map((key: string) => (
                <li key={key} className="flex items-start gap-2">
                  <span aria-hidden className="mt-1 inline-block size-1.5 rounded-full bg-muted-foreground/40" />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="proposal-math" className="space-y-6 md:space-y-8">
            <h2 id="proposal-math" className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
              {t("mathCheck.label")}
            </h2>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200">
              <Badge
                variant="secondary"
                className={cn("flex items-center gap-1.5 border-transparent bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300")}
                aria-live="polite"
              >
                <CheckCircle2 aria-hidden className="size-4" />
                {mathCheck.passed ? t("mathCheck.badgePassed") : t("mathCheck.badgeReview")}
              </Badge>
              <p className="text-sm text-foreground/90">{mathMessageKey ? t(mathMessageKey) : ""}</p>
            </div>
          </section>

          <section aria-labelledby="proposal-share" className="space-y-6 md:space-y-8">
            <h2 id="proposal-share" className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
              {t("share.label")}
            </h2>
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3">
              <p className="text-sm font-medium text-foreground">{t("share.message")}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopy}
                disabled={!shareUrl}
                data-print="hide"
              >
                {t("share.copyAction")}
              </Button>
            </div>
            <div aria-live="polite" role="status" className="text-xs" data-print="hide">
              {feedback ? (
                <Badge
                  variant={feedback.tone}
                  className="flex items-center gap-1.5 border-transparent"
                  aria-live="polite"
                >
                  {feedback.tone === "default" ? (
                    <CheckCircle2 aria-hidden className="size-4" />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-4 text-red-500"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <path d="M15 3h6v6" />
                      <path d="M10 14L21 3" />
                    </svg>
                  )}
                  {feedback.message}
                </Badge>
              ) : null}
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

function normalizeKey(key?: string) {
  if (!key) return undefined;
  if (key.startsWith(PROPOSAL_PREFIX)) return key.slice(PROPOSAL_PREFIX.length);
  return key;
}

// formatLines removed — coverage field deprecated

function formatMoneyRange(values: Money[], locale: string): string | null {
  const filtered = values.filter((value): value is Money => Boolean(value) && Number.isFinite(value.amountMinor));
  if (!filtered.length) {
    return null;
  }

  const groups = new Map<Money["currency"], Money[]>();
  for (const money of filtered) {
    const existing = groups.get(money.currency);
    if (existing) {
      existing.push(money);
    } else {
      groups.set(money.currency, [money]);
    }
  }

  if (groups.size === 1) {
    const [group] = groups.values();
    if (!group) return null;
    const sorted = [...group].sort((a, b) => a.amountMinor - b.amountMinor);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    if (!min || !max) {
      return null;
    }
    const minFormatted = formatMoney(min, { locale });
    if (min.amountMinor === max.amountMinor) {
      return minFormatted;
    }
    const maxFormatted = formatMoney(max, { locale });
    return `${minFormatted} – ${maxFormatted}`;
  }

  return filtered
    .map((money) => formatMoney(money, { locale }))
    .join(" / ");
}

function formatMoneyAverage(values: Money[], locale: string): string | null {
  const filtered = values.filter((value): value is Money => Boolean(value) && Number.isFinite(value.amountMinor));
  if (!filtered.length) {
    return null;
  }

  const first = filtered[0];
  if (!first) {
    return null;
  }
  const currency = first.currency;
  if (filtered.some((money) => money.currency !== currency)) {
    return null;
  }

  const totalMinor = filtered.reduce((sum, money) => sum + money.amountMinor, 0);
  const averageMinor = Math.round(totalMinor / filtered.length);
  const averageMoney: Money = { amountMinor: averageMinor, currency };
  return formatMoney(averageMoney, { locale });
}

function getInitials(text: string) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function SummaryTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <article className="workspace-proposal-surface relative max-w-full min-w-0 rounded-2xl border border-border/70 bg-background/60 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70 break-words">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground/90 break-words">{children}</p>
    </article>
  );
}


