"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { formatMoney } from "@/lib/format";
import { comparisonMetrics, useUI } from "@/lib/ui/state";
import {
  type ComparisonMetric,
  type ComparisonPlaybook,
  type ComparisonWeights,
  type PolicyComparisonScore,
  type PolicyView,
} from "@/lib/types";
import { cn } from "@/lib/utils";


interface PolicySummary {
  policy: PolicyView;
  score: PolicyComparisonScore;
}

const PLAYBOOK_KEYS: ComparisonPlaybook[] = ["sme", "hnwi", "auto", "travel"];

type AttributeStatus = "better" | "neutral" | "worse";

type AttributeStatusMap = Record<string, Partial<Record<ComparisonMetric, AttributeStatus>>>;

const HIGHLIGHT_WEIGHT_THRESHOLD = 5;
const MIN_SPREAD_FOR_STATUS = 0.05;
const MIN_STATUS_TOLERANCE = 0.015;

const STATUS_TEXT_CLASSES: Record<AttributeStatus, string> = {
  better: "text-[color:var(--success)]",
  neutral: "text-foreground/90",
  worse: "text-[color:var(--destructive)]",
};

const STATUS_INDICATOR_CLASSES: Record<AttributeStatus, string> = {
  better: "bg-[color:var(--success)]",
  neutral: "bg-[color:var(--muted-foreground)]",
  worse: "bg-[color:var(--destructive)]",
};

export default function Comparison() {
  const t = useTranslations("workspace.comparisons");
  // Use separate selectors to avoid object recreation and improve performance
  // Get selector function to avoid infinite loops
  const selectPoliciesView = useUI((state) => state.selectPoliciesView);
  const policies = useMemo(() => selectPoliciesView(), [selectPoliciesView]);
  const fetchPolicies = useUI((state) => state.fetchPolicies);
  const fetchProducts = useUI((state) => state.fetchProducts);
  const fetchRiders = useUI((state) => state.fetchRiders);
  const fetchPricingBands = useUI((state) => state.fetchPricingBands);
  const policiesLoading = useUI((state) => state.policiesLoading);
  const policiesLoaded = useUI((state) => state.policiesLoaded);
  const productsLoading = useUI((state) => state.productsLoading);
  const productsLoaded = useUI((state) => state.productsLoaded);
  const ridersLoading = useUI((state) => state.ridersLoading);
  const ridersLoaded = useUI((state) => state.ridersLoaded);
  const pricingBandsLoading = useUI((state) => state.pricingBandsLoading);
  const pricingBandsLoaded = useUI((state) => state.pricingBandsLoaded);
  const comparisonScores = useUI((state) => state.comparisonScores);
  const comparisonPlaybook = useUI((state) => state.comparisonPlaybook);
  const comparisonWeights = useUI((state) => state.comparisonWeights);
  const setComparisonPlaybook = useUI((state) => state.setComparisonPlaybook);
  const setComparisonWeights = useUI((state) => state.setComparisonWeights);
  const resetComparisonWeights = useUI((state) => state.resetComparisonWeights);

  const locale = useLocale();

  useEffect(() => {
    void fetchPolicies();
    void fetchProducts();
    void fetchRiders();
    void fetchPricingBands();
  }, [fetchPolicies, fetchProducts, fetchRiders, fetchPricingBands]);

  const playbookOptions = useMemo(() =>
    PLAYBOOK_KEYS.map((key) => ({
      key,
      label: t(`playbooks.options.${key}.label`),
      description: t(`playbooks.options.${key}.description`),
    })),
    [t]
  );

  // Local state for slider values to prevent excessive updates
  const [localWeights, setLocalWeights] = useState<ComparisonWeights>(comparisonWeights);
  const lastCommittedWeightsRef = useRef<ComparisonWeights>(comparisonWeights);
  const pointerActiveRef = useRef(false);

  // Sync local weights when store weights change (e.g., from playbook selection)
  useEffect(() => {
    setLocalWeights(comparisonWeights);
    lastCommittedWeightsRef.current = { ...comparisonWeights };
  }, [comparisonWeights]);

  const commitWeight = useCallback(
    (key: ComparisonMetric, value: number) => {
      if (lastCommittedWeightsRef.current[key] === value) {
        return;
      }

      lastCommittedWeightsRef.current = {
        ...lastCommittedWeightsRef.current,
        [key]: value,
      };

      setComparisonWeights({ [key]: value } as Partial<ComparisonWeights>);
    },
    [setComparisonWeights]
  );

  // Update local weights immediately for smooth UI
  const handleWeightChange = useCallback(
    (key: ComparisonMetric, value: number) => {
      setLocalWeights((prev) => {
        if (prev[key] === value) {
          return prev;
        }

        return { ...prev, [key]: value };
      });

      if (!pointerActiveRef.current) {
        commitWeight(key, value);
      }
    },
    [commitWeight]
  );

  const handleInteractionStart = useCallback(() => {
    pointerActiveRef.current = true;
  }, []);

  const handleInteractionEnd = useCallback(
    (key: ComparisonMetric, value: number) => {
      pointerActiveRef.current = false;
      commitWeight(key, value);
    },
    [commitWeight]
  );

  const policiesByPlan = useMemo(() => new Map(policies.map((policy) => [policy.plan, policy])), [policies]);

  const policySummaries = useMemo<PolicySummary[]>(() =>
    comparisonScores
      .map((score) => {
        const policy = policiesByPlan.get(score.plan);
        if (!policy) {
          return undefined;
        }
        return { policy, score } satisfies PolicySummary;
      })
      .filter((value): value is PolicySummary => Boolean(value))
      .sort((a, b) => b.score.total - a.score.total), [comparisonScores, policiesByPlan]);

  const attributeStatuses = useMemo<AttributeStatusMap>(() =>
    computeAttributeStatuses(policySummaries, localWeights), [localWeights, policySummaries]);

  const dataReady = policiesLoaded && productsLoaded && ridersLoaded && pricingBandsLoaded;
  const showLoading = !dataReady || policiesLoading || productsLoading || ridersLoading || pricingBandsLoading;
  const showEmpty = dataReady && policySummaries.length === 0;

  const totalWeight = useMemo(
    () => comparisonMetrics.reduce((sum, metric) => sum + (localWeights[metric] ?? 0), 0),
    [localWeights]
  );

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <PlaybookSelector
          ariaLabel={t("playbooks.ariaLabel")}
          options={playbookOptions}
          value={comparisonPlaybook}
          onChange={setComparisonPlaybook}
        />
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden py-6">
        <section className="space-y-4" aria-label={t("sliderSection.ariaLabel")}>
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
              {t("sliderSection.title")}
            </h2>
            <span className="text-xs text-muted-foreground/75">
              {t("sliderSection.summary", { value: totalWeight })}
            </span>
          </header>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {comparisonMetrics.map((metric) => {
              const titleId = `comparison-weight-${metric}-label`;
              const sliderId = `comparison-weight-${metric}-slider`;
              return (
                <article key={metric} className="grid gap-2 rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 id={titleId} className="text-sm font-semibold text-foreground/90">
                        {t(`weights.${metric}.label`)}
                      </h3>
                      <p className="text-xs text-muted-foreground/80">
                        {t(`weights.${metric}.description`)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs">
                      {localWeights[metric]}
                    </Badge>
                  </div>
                  <Slider
                    id={sliderId}
                    value={localWeights[metric]}
                    max={100}
                    min={0}
                    step={1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleWeightChange(metric, getSliderValue(e.currentTarget))
                    }
                    onPointerDown={handleInteractionStart}
                    onPointerUp={(e: React.PointerEvent<HTMLInputElement>) =>
                      handleInteractionEnd(metric, getSliderValue(e.currentTarget))
                    }
                    onPointerCancel={(e: React.PointerEvent<HTMLInputElement>) =>
                      handleInteractionEnd(metric, getSliderValue(e.currentTarget))
                    }
                    onBlur={(e: React.FocusEvent<HTMLInputElement>) =>
                      handleInteractionEnd(metric, getSliderValue(e.currentTarget))
                    }
                    aria-labelledby={titleId}
                    aria-valuenow={localWeights[metric]}
                    aria-valuetext={t("weights.valueText", { value: localWeights[metric] })}
                  />
                </article>
              );
            })}
          </div>
        </section>
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-sm font-medium text-muted-foreground">{t("scores.title")}</h3>
              <p className="text-xs text-muted-foreground/80">{t("scores.subtitle")}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resetComparisonWeights()}
              aria-label={t("actions.resetAria")}
            >
              {t("actions.reset")}
            </Button>
          </div>
          {showLoading ? (
            <LoadingSkeleton
              ariaLabel={t("loading.ariaLabel")}
              title={t("loading.title")}
              description={t("loading.description")}
            />
          ) : policySummaries.length ? (
            <div
              role="list"
              aria-label={t("cards.ariaLabel")}
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {policySummaries.map(({ policy, score }, index) => {
                const headingId = `comparison-card-${index}-title`;
                const scoreText = score.total.toFixed(1);
                const networkKey = policy.network ?? "unknown";
                const serviceKey = policy.service ?? "unknown";
                const networkLabel = t(`cards.networkLevels.${networkKey}`);
                const serviceLabel = t(`cards.serviceLevels.${serviceKey}`);

                return (
                  <article key={policy.plan} role="listitem" aria-labelledby={headingId}>
                    <Card
                      tabIndex={0}
                      aria-labelledby={headingId}
                      aria-label={t("cards.ariaCard", { plan: policy.plan })}
                      className="h-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <CardContent className="flex h-full flex-col gap-5 px-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <h3 id={headingId} className="text-base font-semibold text-foreground">
                              {policy.plan}
                            </h3>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">
                              {t("cards.scoreLabel")}
                            </span>
                            <span
                              className="text-lg font-semibold tabular-nums text-foreground"
                              aria-live="polite"
                              aria-label={t("cards.scoreValueText", { value: scoreText })}
                            >
                              {scoreText}
                            </span>
                          </div>
                        </div>
                        <dl className="space-y-3 text-sm">
                          <MetricRow
                            plan={policy.plan}
                            metric="premium"
                            label={t("cards.premiumLabel")}
                            value={formatMoney(
                              { amountMinor: Math.round(policy.premium * 100), currency: policy.currency },
                              { locale, maximumFractionDigits: 0 }
                            )}
                            statuses={attributeStatuses}
                            indicatorAria={t("cards.indicators.premium")}
                          />
                          <MetricRow
                            plan={policy.plan}
                            metric="deductible"
                            label={t("cards.deductibleLabel")}
                            value={formatMoney(
                              { amountMinor: Math.round(policy.deductible * 100), currency: policy.currency },
                              { locale, maximumFractionDigits: 0 }
                            )}
                            statuses={attributeStatuses}
                            indicatorAria={t("cards.indicators.deductible")}
                          />
                          <MetricRow
                            plan={policy.plan}
                            metric="riders"
                            label={t("cards.ridersCountLabel")}
                            value={policy.riders.length.toString()}
                            statuses={attributeStatuses}
                            indicatorAria={t("cards.indicators.riders")}
                          />
                        </dl>
                        <AttributeChips
                          plan={policy.plan}
                          policy={policy}
                          attributeStatuses={attributeStatuses}
                          networkLabel={networkLabel}
                          serviceLabel={serviceLabel}
                          indicatorAria={{
                            network: t("cards.indicators.network"),
                            service: t("cards.indicators.service"),
                            riders: t("cards.indicators.riders"),
                          }}
                        />
                      </CardContent>
                    </Card>
                  </article>
                );
              })}
            </div>
          ) : showEmpty ? (
            <EmptyState
              title={t("empty.title")}
              description={t("empty.description")}
              hint={t("empty.hint")}
            />
          ) : null}
        </section>
      </CardContent>
    </Card>
  );
}

interface PlaybookOption {
  key: ComparisonPlaybook;
  label: string;
  description: string;
}

interface LoadingSkeletonProps {
  ariaLabel: string;
  title: string;
  description: string;
}

function LoadingSkeleton({ ariaLabel, title, description }: LoadingSkeletonProps) {
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      <span className="sr-only">{title}</span>
      <span className="sr-only">{description}</span>
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="h-full">
          <CardContent className="flex h-full flex-col gap-5 px-6 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 3 }).map((__, chipIndex) => (
                  <Skeleton key={chipIndex} className="h-5 w-16 rounded-full" />
                ))}
              </div>
            </div>
            <Skeleton className="h-3 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  hint: string;
}

function EmptyState({ title, description, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 px-5 py-8 text-center">
      <p className="text-sm font-semibold text-foreground/90">{title}</p>
      <p className="text-sm text-muted-foreground/90">{description}</p>
      <p className="text-xs text-muted-foreground/80">{hint}</p>
    </div>
  );
}

interface PlaybookSelectorProps {
  ariaLabel: string;
  options: PlaybookOption[];
  value: ComparisonPlaybook;
  onChange: (value: ComparisonPlaybook) => void;
}

function PlaybookSelector({ ariaLabel, options, value, onChange }: PlaybookSelectorProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(val: string) => onChange(val as ComparisonPlaybook)}
      className="grid gap-2 sm:grid-cols-2 md:grid-cols-4"
      aria-label={ariaLabel}
    >
      {options.map(({ key, label, description }) => (
        <div key={key} className="group relative flex flex-col">
          <RadioGroupItem value={key} id={`playbook-${key}`} className="peer sr-only" />
          <Label
            htmlFor={`playbook-${key}`}
            className="flex cursor-pointer select-none flex-col gap-1 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-background peer-data-[state=checked]:text-foreground"
          >
            <span>{label}</span>
            <span className="text-xs font-normal text-muted-foreground/80">{description}</span>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

interface AttributeChipsProps {
  plan: string;
  policy: PolicyView;
  attributeStatuses: AttributeStatusMap;
  networkLabel: string;
  serviceLabel: string;
  indicatorAria: {
    network: string;
    service: string;
    riders: string;
  };
}

function AttributeChips({
  plan,
  policy,
  attributeStatuses,
  networkLabel,
  serviceLabel,
  indicatorAria,
}: AttributeChipsProps) {
  const t = useTranslations("workspace.comparisons");
  const riderStatus = attributeStatuses[plan]?.riders ?? "neutral";

  return (
    <div className="space-y-3">
      <StatusValue
        label={t("cards.networkLabel")}
        value={networkLabel}
        status={attributeStatuses[plan]?.network ?? "neutral"}
        indicatorAria={indicatorAria.network}
      />
      <StatusValue
        label={t("cards.serviceLabel")}
        value={serviceLabel}
        status={attributeStatuses[plan]?.service ?? "neutral"}
        indicatorAria={indicatorAria.service}
      />
      <StatusValue
        label={t("cards.ridersLabel")}
        value={t("cards.ridersStatus", { count: policy.riders.length })}
        status={riderStatus}
        indicatorAria={indicatorAria.riders}
      />
    </div>
  );
}

interface StatusValueProps {
  label: string;
  value: ReactNode;
  status: AttributeStatus;
  indicatorAria: string;
}

function StatusValue({ label, value, status, indicatorAria }: StatusValueProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground/75">{label}</span>
      <span className="flex items-center gap-2 text-sm font-medium" data-status={status}>
        <span
          className={cn("inline-flex h-1.5 w-1.5 rounded-full", STATUS_INDICATOR_CLASSES[status])}
          aria-hidden="true"
          role="img"
          aria-label={indicatorAria}
        />
        <span className={STATUS_TEXT_CLASSES[status]}>{value}</span>
      </span>
    </div>
  );
}

interface MetricRowProps {
  plan: string;
  metric: ComparisonMetric;
  label: string;
  value: string;
  statuses: AttributeStatusMap;
  indicatorAria: string;
}

function MetricRow({ plan, metric, label, value, statuses, indicatorAria }: MetricRowProps) {
  const status = statuses[plan]?.[metric] ?? "neutral";
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground/75">{label}</dt>
      <dd className="flex items-center gap-2">
        <span
          className={cn("inline-flex h-1.5 w-1.5 rounded-full", STATUS_INDICATOR_CLASSES[status])}
          aria-hidden="true"
          role="img"
          aria-label={indicatorAria}
        />
        <span className={cn("tabular-nums font-medium", STATUS_TEXT_CLASSES[status])}>{value}</span>
      </dd>
    </div>
  );
}

function computeAttributeStatuses(
  summaries: PolicySummary[],
  weights: ComparisonWeights
): AttributeStatusMap {
  if (!summaries.length) {
    return {};
  }

  const statusMap: AttributeStatusMap = {};

  for (const { policy } of summaries) {
    statusMap[policy.plan] = {};
  }

  for (const metric of comparisonMetrics) {
    const weight = weights[metric] ?? 0;
    if (weight < HIGHLIGHT_WEIGHT_THRESHOLD) {
      for (const summary of summaries) {
        statusMap[summary.policy.plan]![metric] = "neutral";
      }
      continue;
    }

    const values = summaries.map((summary) => summary.score.breakdown[metric] ?? 0);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const spread = max - min;

    if (spread < MIN_SPREAD_FOR_STATUS) {
      for (const summary of summaries) {
        statusMap[summary.policy.plan]![metric] = "neutral";
      }
      continue;
    }

    const tolerance = Math.max(MIN_STATUS_TOLERANCE, spread * 0.1);

    summaries.forEach((summary, index) => {
      const value = values[index];
      if (value === undefined) {
        statusMap[summary.policy.plan]![metric] = "neutral";
        return;
      }
      
      const closeToMax = Math.abs(value - max) <= tolerance;
      const closeToMin = Math.abs(value - min) <= tolerance;

      if (closeToMax && !closeToMin) {
        statusMap[summary.policy.plan]![metric] = "better";
      } else if (closeToMin && !closeToMax) {
        statusMap[summary.policy.plan]![metric] = "worse";
      } else {
        statusMap[summary.policy.plan]![metric] = "neutral";
      }
    });
  }

  return statusMap;
}

const getSliderValue = (input: HTMLInputElement): number => Number.parseInt(input.value, 10);


