"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
import { useUI } from "@/lib/ui/state";
import { type Case, type Money, type Policy, type Proposal, type ProposalSelectedPlan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

const PROPOSAL_PREFIX = "workspace.proposal.";

interface PlanSummary {
  policy: Policy;
  score: number | null;
  rationale: string;
  benefits: string[];
}

export default function Proposal() {
  const t = useTranslations("workspace.proposal");
  const tComparisonCards = useTranslations("workspace.comparisons.cards");
  const locale = useLocale();

  const brief = useUI<Case["brief"]>((state) => state.brief);
  const brokerProfile = useUI((state) => state.proposalBrokerProfile);
  const selectedPlans = useUI<ProposalSelectedPlan[]>((state) => state.proposalSelectedPlans);
  const disclosuresKeys = useUI<Proposal["disclosuresKeys"]>((state) => state.proposalDisclosuresKeys);
  const mathCheck = useUI<Proposal["mathCheck"]>((state) => state.proposalMathCheck);
  const policies = useUI<Policy[]>((state) => state.policies);
  const policyLookup = useMemo(() => new Map(policies.map((policy) => [policy.id, policy])), [policies]);
  const comparisonScores = useUI((state) => state.comparisonScores);
  const loading = useUI((state) => state.proposalLoading);
  const shareUrl = useUI((state) => state.proposalShareUrl);
  const generatedOn = useUI((state) => state.proposalGeneratedOn);
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

  const scoreFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    [locale]
  );

  const planSummaries = useMemo<PlanSummary[]>(() => {
    return selectedPlans
      .map((selection) => {
        const policy = policyLookup.get(selection.planId);
        if (!policy) return null;

        const matchingScore = comparisonScores.find((score) => score.plan === policy.plan)?.total;
        const computedScore = matchingScore ?? 0; // Default to 0 if no score found

        const benefits = new Set<string>();
        policy.riders.forEach((rider) => benefits.add(rider));
        const networkLabel = policy.network ? tComparisonCards(`networkLevels.${policy.network}`) : undefined;
        const serviceLabel = policy.service ? tComparisonCards(`serviceLevels.${policy.service}`) : undefined;
        if (networkLabel) benefits.add(networkLabel);
        if (serviceLabel) benefits.add(serviceLabel);

        const rationaleKey = normalizeKey(selection.rationaleKey);

        const transformedPolicy: Policy = {
          ...policy,
          premium: {
            amountMinor: (policy.premium as unknown as number) * 100,
            currency: "USD",
          },
          deductible: {
            amountMinor: (policy.deductible as unknown as number) * 100,
            currency: "USD",
          },
        };

        return {
          policy: transformedPolicy,
          score: Number.isFinite(computedScore) ? computedScore : null,
          rationale: rationaleKey ? t(rationaleKey) : t("selectedPlans.defaultRationale"),
          benefits: Array.from(benefits).slice(0, 5),
        } satisfies PlanSummary;
      })
      .filter(Boolean) as PlanSummary[];
  }, [comparisonScores, policyLookup, selectedPlans, t, tComparisonCards]);

  const summaryDetails = useMemo(() => {
    if (!planSummaries.length) return null;

    const premiums = planSummaries.map((plan) => plan.policy.premium);
    const deductibles = planSummaries.map((plan) => plan.policy.deductible);
    const riderFrequency = new Map<string, number>();
    const networkLabels = new Set<string>();
    const serviceLabels = new Set<string>();

    planSummaries.forEach((summary) => {
      summary.policy.riders.forEach((rider) => riderFrequency.set(rider, (riderFrequency.get(rider) ?? 0) + 1));
      const networkLabel = summary.policy.network ? tComparisonCards(`networkLevels.${summary.policy.network}`) : undefined;
      const serviceLabel = summary.policy.service ? tComparisonCards(`serviceLevels.${summary.policy.service}`) : undefined;
      if (networkLabel) networkLabels.add(networkLabel);
      if (serviceLabel) serviceLabels.add(serviceLabel);
    });

    const riders = Array.from(riderFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 4);

    const premiumRange = formatMoneyRange(premiums, locale);
    const averageDeductible = formatMoneyAverage(deductibles, locale);

    return {
      premiumRange: premiumRange ?? "—",
      averageDeductible: averageDeductible ?? "—",
      riders: riders.length ? riders.join(", ") : t("summary.ridersFallback"),
      networks: networkLabels.size ? Array.from(networkLabels).join(" • ") : t("summary.networkFallback"),
      services: serviceLabels.size ? Array.from(serviceLabels).join(" • ") : t("summary.serviceFallback"),
    } as const;
  }, [locale, planSummaries, t, tComparisonCards]);

  const normalizedDisclosures = disclosuresKeys
    .map((key) => normalizeKey(key))
    .filter((key): key is string => Boolean(key));

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
                <div className="grid gap-1">
                  <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">{t("briefCard.fields.business")}</dt>
                  <dd className="font-medium leading-snug break-words">{brief.businessType ?? "—"}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">{t("briefCard.fields.employees")}</dt>
                  <dd className="font-medium leading-snug break-words">{brief.employees ?? "—"}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">{t("briefCard.fields.lines")}</dt>
                  <dd className="font-medium leading-snug break-words">{formatLines(brief.coverage)}</dd>
                </div>
                {brief.freeText ? (
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
                  const scoreText = plan.score !== null ? scoreFormatter.format(plan.score) : "—";
                  return (
                    <article
                      key={plan.policy.plan}
                      role="group"
                      aria-labelledby={`${cardId}-title`}
                      tabIndex={0}
                      className="workspace-proposal-surface focus-visible:ring-ring focus-visible:ring-offset-background flex h-full flex-col rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-offset-2"
                    >
                      <header className="space-y-1">
                        <h3 id={`${cardId}-title`} className="text-lg font-semibold text-foreground/90">
                          {plan.policy.plan}
                        </h3>
                        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground/70">{t("plans.scoreLabel", { value: scoreText })}</p>
                      </header>
                      <div className="my-4 h-px w-full bg-border/60" aria-hidden />
                      <dl className="space-y-3 text-sm text-foreground/90">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">{t("plans.premiumLabel")}</dt>
                          <dd className="min-w-0 text-right font-semibold text-foreground/90 break-words">
                            {formatMoney(plan.policy.premium, { locale })}
                          </dd>
                        </div>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">{t("plans.deductibleLabel")}</dt>
                          <dd className="min-w-0 text-right font-semibold text-foreground/90 break-words">
                            {formatMoney(plan.policy.deductible, { locale })}
                          </dd>
                        </div>
                        <div className="flex flex-col gap-1">
                          <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">{t("plans.ridersLabel")}</dt>
                          <dd>
                            {plan.policy.riders.length ? (
                              <span className="font-medium text-foreground/90">{plan.policy.riders.join(", ")}</span>
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
                            {plan.benefits.length ? (
                              plan.benefits.map((benefit) => (
                                <li key={benefit} className="flex items-start gap-2">
                                  <span aria-hidden className="mt-1 inline-block size-1.5 rounded-full bg-muted-foreground/50" />
                                  <span>{benefit}</span>
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
              {normalizedDisclosures.map((key) => (
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
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <Badge
                variant="secondary"
                className={cn("flex items-center gap-1.5 border-transparent bg-emerald-600/10 text-emerald-700")}
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

function formatLines(value?: string) {
  if (!value) return "—";
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

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


