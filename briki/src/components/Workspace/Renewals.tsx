"use client";

import type { ChangeEvent, FormEvent } from "react";
import { Fragment, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BellIcon, MessageSquareIcon, FileTextIcon, PlusIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUI } from "@/lib/ui/state";
import {
  type Money,
  type RenewalRecord,
  type RenewalStatus,
  type RenewalStatusChipProps,
  type RenewalWindowDays,
  type RenewalsSortBy,
  type RenewalsSortDir,
} from "@/lib/types";
import {
  formatDate,
  formatMoney,
  type FormatDateOptions,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

const RENEWALS_PREFIX = "workspace.renewals";

const STATUS_ORDER: RenewalStatus[] = ["ok", "dueSoon", "overdue"];
const STATUS_TONE_STYLES: Record<RenewalStatusChipProps["tone"], string> = {
  neutral: "bg-success/10 text-success border-success/50",
  warning: "bg-warning/10 text-warning border-warning/50",
  critical: "bg-destructive/10 text-destructive border-destructive/50",
};
const FOLLOWUP_PRESET_DAYS = [2, 5, 7];

// Type definitions for component-specific props and state
type NudgeType = "quote" | "message";

type ReminderDialogState = {
  open: boolean;
  targetId: string | null;
  date: string; // ISO date string in YYYY-MM-DD format
};

type ActionsGroupProps = {
  record: RenewalRecord;
  onNudge: (type: NudgeType, record: RenewalRecord) => void;
  onReminder: () => void;
};

type SortIndicatorProps = {
  active: boolean;
  direction: RenewalsSortDir;
};

// Custom hooks to properly use selectors and avoid infinite re-renders
function useWindowCounts() {
  // Get the selector function
  const selectWindowCounts = useUI((state) => state.selectWindowCounts);
  
  // Memoize the result based on the selector function reference
  return useMemo(() => selectWindowCounts(), [selectWindowCounts]);
}

function useFilteredSortedRenewals() {
  // Get the selector function
  const selectFilteredSortedRenewals = useUI((state) => state.selectFilteredSortedRenewals);

  // Memoize the result based on the selector function reference
  return useMemo(() => selectFilteredSortedRenewals(), [selectFilteredSortedRenewals]);
}

export default function Renewals() {
  const [dialogState, setDialogState] = useState<ReminderDialogState>(() => ({
    open: false,
    targetId: null,
    date: defaultReminderDate(),
  }));

  // Use proper selectors to avoid infinite loops
  const renewalsData = useUI((state) => state.renewals);
  const setFilters = useUI((state) => state.setRenewalsFilters);
  const setSorting = useUI((state) => state.setRenewalsSorting);
  const logEvent = useUI((state) => state.logRenewalsEvent);
  const setReminder = useUI((state) => state.setReminder);
  const filters = useUI((state) => state.renewalsFilters);
  const sorting = useUI((state) => state.renewalsSorting);
  const renewalsLoading = useUI((state) => state.renewalsLoading);
  const renewalsLoaded = useUI((state) => state.renewalsLoaded);
  const getRenewalStatusChip = useUI((state) => state.getRenewalStatusChip);
  
  // Use custom hooks to avoid infinite re-renders
  const windowCounts = useWindowCounts();
  const renewals = useFilteredSortedRenewals();
  const showSkeleton = renewalsLoading && !renewalsLoaded;
  
  const t = useTranslations(RENEWALS_PREFIX);
  const tStatus = useTranslations(`${RENEWALS_PREFIX}.status`);
  const tColumns = useTranslations(`${RENEWALS_PREFIX}.columns`);
  const tBadges = useTranslations(`${RENEWALS_PREFIX}.badges`);
  const tDialog = useTranslations(`${RENEWALS_PREFIX}.dialog.reminder`);
  const tToast = useTranslations(`${RENEWALS_PREFIX}.toast`);
  const tMeta = useTranslations(`${RENEWALS_PREFIX}.meta.window`);

  const locale = useLocale();
  const dateFormatterOptions = useMemo<FormatDateOptions>(() => ({ dateStyle: "medium" }), []);

  const carriers = useMemo(() => extractCarriers(renewalsData), [renewalsData]);

  const statusOptions = STATUS_ORDER.map((status) => ({ value: status, label: tStatus(status) }));

  const handleWindowChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const windowDays = Number.parseInt(event.target.value, 10) as RenewalWindowDays;
    setFilters({ windowDays });
  };

  const handleCarrierChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextCarriers = Array.from(event.target.selectedOptions).map((option) => option.value);
    setFilters({ carriers: nextCarriers });
  };

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextStatuses = Array.from(event.target.selectedOptions).map((option) => option.value as RenewalStatus);
    setFilters({ statuses: nextStatuses });
  };

  const handleSortToggle = (column: RenewalsSortBy) => {
    const nextDirection = sorting.sortBy === column && sorting.sortDir === "asc" ? "desc" : "asc";
    setSorting({ sortBy: column, sortDir: nextDirection });
  };

  const handleNudge = (type: NudgeType, record: RenewalRecord) => {
    const eventType = type === "quote" ? "NudgeQuote" : "NudgeMessage";
    logEvent(eventType, { id: record.id });
    const toastKey = type === "quote" ? "nudgeQuote" : "nudgeMessage";
    toast.success(tToast(toastKey), { duration: 1800 });
  };

  const handleOpenReminder = (recordId: string) => {
    setDialogState({ open: true, targetId: recordId, date: defaultReminderDate() });
    logEvent("ReminderOpen", { id: recordId });
  };

  const handleConfirmReminder = () => {
    if (!dialogState.targetId) return;
    setReminder(dialogState.targetId, true);
    toast.success(tToast("reminderSet"), { duration: 2000 });
    setDialogState({ open: false, targetId: null, date: defaultReminderDate() });
  };

  const renderStatusBadge = (status: RenewalStatus, reminderActive: boolean) => {
    const { status: normalizedStatus, tone } = getRenewalStatusChip(status);
    const label = tStatus(normalizedStatus);
    const statusStyles = STATUS_TONE_STYLES[tone];
    return (
      <div className="flex flex-wrap gap-1">
        <span className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
          statusStyles
        )} aria-label={label}>
          {label}
        </span>
        {reminderActive ? (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-success/10 text-success">
            {tBadges("reminderSet")}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <Fragment>
      <Card aria-labelledby="renewals-heading">
        <CardHeader className="gap-2 pb-4">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <CardTitle id="renewals-heading" className="text-base font-medium tracking-tight">
              {t("title")}
            </CardTitle>
            <ul className="flex flex-wrap items-center gap-1.5" aria-label={t("filters.window.label")} data-print="hide">
              {RENEWAL_WINDOWS.map((window) => (
                <li key={window}>
                  <Badge 
                    variant={filters.windowDays === window ? "default" : "outline"} 
                    className={cn(
                      "font-medium text-[13px] px-2 py-0.5 rounded-full transition-colors",
                      filters.windowDays === window 
                        ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15" 
                        : "hover:bg-muted/50"
                    )}
                  >
                    {tMeta(`${window}`)}
                    <span className="ml-1 rounded-full bg-muted/70 px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                      {windowCounts[window] ?? 0}
                    </span>
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
      </CardHeader>
        <CardContent className="space-y-6">
          <FollowupsBanner />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 pb-2" data-print="hide">
            <Card className="border-border/40">
              <CardContent className="pt-3">
                <div className="space-y-1.5">
                  <label htmlFor="renewals-window" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("filters.window.label")}
                  </label>
                  <select
                    id="renewals-window"
                    className="w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
                    value={filters.windowDays}
                    onChange={handleWindowChange}
                    data-print="hide"
                  >
                    {RENEWAL_WINDOWS.map((window) => (
                      <option key={window} value={window}>
                        {tMeta(`${window}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/40">
              <CardContent className="pt-3">
                <div className="space-y-1.5">
                  <label htmlFor="renewals-carrier" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("filters.carrier.label")}
                  </label>
                  <select
                    multiple
                    id="renewals-carrier"
                    className="min-h-[96px] w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
                    value={filters.carriers}
                    onChange={handleCarrierChange}
                    aria-describedby="renewals-carrier-helper"
                    data-print="hide"
                  >
                    {carriers.map((carrier) => (
                      <option key={carrier} value={carrier}>
                        {carrier}
                      </option>
                    ))}
                  </select>
                  <p id="renewals-carrier-helper" className="text-xs text-muted-foreground/80">
                    {t("filters.carrier.helper")}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/40">
              <CardContent className="pt-3">
                <div className="space-y-1.5">
                  <label htmlFor="renewals-status" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("filters.status.label")}
                  </label>
                  <select
                    multiple
                    id="renewals-status"
                    className="min-h-[96px] w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
                    value={filters.statuses}
                    onChange={handleStatusChange}
                    data-print="hide"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          <section aria-busy={showSkeleton}>
            {showSkeleton ? (
              <RenewalsLoadingSkeleton />
            ) : (
              <Fragment>
                <div className="hidden md:block">
                  <Table className="w-full table-fixed @print:w-full @print:border @print:border-border/40 @print:[&_td]:border @print:[&_td]:border-border/40 @print:[&_th]:border @print:[&_th]:border-border/40">
                    <colgroup>
                      <col className="min-w-[10rem]" />
                      <col className="min-w-[12rem]" />
                      <col className="min-w-[8rem]" />
                      <col className="min-w-[8rem]" />
                      <col className="min-w-[8rem]" />
                      <col className="min-w-[16rem]" />
                    </colgroup>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[10rem]">{tColumns("carrier")}</TableHead>
                        <TableHead className="min-w-[12rem]">{tColumns("plan")}</TableHead>
                        <TableHead className="min-w-[120px]">
                          <div className="@print:hidden">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-left font-medium rounded-md px-2 py-1 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
                              onClick={() => handleSortToggle("date")}
                              aria-label={t("sort.date")}
                              data-print="hide"
                            >
                              {tColumns("date")}
                              <SortIndicator active={sorting.sortBy === "date"} direction={sorting.sortDir} />
                            </button>
                          </div>
                          <span className="hidden @print:inline">{tColumns("date")}</span>
                        </TableHead>
                        <TableHead className="min-w-[120px] text-right">
                          <div className="@print:hidden">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 justify-end font-medium rounded-md px-2 py-1 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
                              onClick={() => handleSortToggle("premium")}
                              aria-label={t("sort.premium")}
                              data-print="hide"
                            >
                              {tColumns("premium")}
                              <SortIndicator active={sorting.sortBy === "premium"} direction={sorting.sortDir} />
                            </button>
                          </div>
                          <span className="hidden @print:inline">{tColumns("premium")}</span>
                        </TableHead>
                        <TableHead>{tColumns("status")}</TableHead>
                        <TableHead className="min-w-[16rem] text-right" data-print="hide">
                          {tColumns("actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {renewals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                            {t("empty")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        renewals.map((renewal) => (
                          <TableRow key={renewal.id}>
                            <TableCell className="px-4 py-3 truncate min-w-[10rem]">{renewal.carrier}</TableCell>
                            <TableCell className="px-4 py-3 truncate min-w-[12rem]">{renewal.plan}</TableCell>
                            <TableCell className="px-4 py-3 tabular-nums font-medium">{formatRenewalDate(renewal.renewalDateISO, locale, dateFormatterOptions)}</TableCell>
                            <TableCell className="px-4 py-3 text-right tabular-nums font-medium">{formatRenewalPremium(renewal.premium, locale)}</TableCell>
                            <TableCell className="px-4 py-3">{renderStatusBadge(renewal.status, renewal.reminderSet)}</TableCell>
                            <TableCell className="px-4 py-3 text-right min-w-[16rem]" data-print="hide">
                              <ActionsGroup
                                record={renewal}
                                onNudge={handleNudge}
                                onReminder={() => handleOpenReminder(renewal.id)}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-4 md:hidden" aria-live="polite">
                  {renewals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("empty")}</p>
                  ) : (
                    renewals.map((renewal) => (
                      <article key={renewal.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                        <header className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{renewal.carrier}</p>
                            <p className="text-xs text-muted-foreground">{renewal.plan}</p>
                          </div>
                          {renderStatusBadge(renewal.status, renewal.reminderSet)}
                        </header>
                        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <dt className="text-muted-foreground uppercase tracking-wide">{tColumns("date")}</dt>
                            <dd className="font-medium">{formatRenewalDate(renewal.renewalDateISO, locale, dateFormatterOptions)}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground uppercase tracking-wide">{tColumns("premium")}</dt>
                            <dd className="font-medium">{formatRenewalPremium(renewal.premium, locale)}</dd>
                          </div>
                        </dl>
                        <footer className="mt-4 border-t border-border pt-3" data-print="hide">
                          <ActionsGroup
                            record={renewal}
                            onNudge={handleNudge}
                            onReminder={() => handleOpenReminder(renewal.id)}
                          />
                        </footer>
                      </article>
                    ))
                  )}
                </div>
              </Fragment>
            )}
          </section>
      </CardContent>
    </Card>

      <Dialog
        open={dialogState.open}
        onOpenChange={(open) =>
          setDialogState((prev) =>
            open
              ? prev
              : {
                  open: false,
                  targetId: null,
                  date: defaultReminderDate(),
                }
          )
        }
      >
        <DialogContent aria-labelledby="renewals-reminder-title" aria-describedby="renewals-reminder-description">
          <DialogHeader>
            <DialogTitle id="renewals-reminder-title">{tDialog("title")}</DialogTitle>
            <DialogDescription id="renewals-reminder-description">{tDialog("description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="renewals-reminder-date" className="text-sm font-medium">
              {tDialog("dateLabel")}
            </label>
            <input
              type="date"
              id="renewals-reminder-date"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
              value={dialogState.date}
              onChange={(event) =>
                setDialogState((prev) => ({
                  ...prev,
                  date: event.target.value,
                }))
              }
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogState({ open: false, targetId: null, date: defaultReminderDate() })}>
              {tDialog("cancel")}
            </Button>
            <Button type="button" onClick={handleConfirmReminder}>
              {tDialog("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}

function RenewalsLoadingSkeleton() {
  return (
    <Fragment>
      <div className="hidden md:block" aria-hidden="true">
        <Table className="w-full table-fixed pointer-events-none select-none opacity-80">
          <colgroup>
            <col className="min-w-[10rem]" />
            <col className="min-w-[12rem]" />
            <col className="min-w-[8rem]" />
            <col className="min-w-[8rem]" />
            <col className="min-w-[8rem]" />
            <col className="min-w-[16rem]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 6 }).map((_, index) => (
                <TableHead key={index} className="px-4 py-3">
                  <Skeleton className="h-4 w-24" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex justify-end">
                    <Skeleton className="h-4 w-20" />
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="ml-auto flex justify-end gap-2">
                    <Skeleton className="h-6 w-16 rounded-md" />
                    <Skeleton className="h-6 w-16 rounded-md" />
                    <Skeleton className="h-6 w-16 rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 md:hidden" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={index} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </header>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </dl>
            <footer className="mt-4 border-t border-border pt-3">
              <div className="flex justify-end gap-2">
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-md" />
              </div>
            </footer>
          </article>
        ))}
      </div>
    </Fragment>
  );
}

function FollowupsBanner() {
  const followupCadenceDays = useUI((state) => state.followupCadenceDays);
  const addFollowupDay = useUI((state) => state.addFollowupDay);
  const removeFollowupDay = useUI((state) => state.removeFollowupDay);
  const followupCadenceLabel = useUI((state) => state.followupCadenceLabel);
  const tFollowups = useTranslations("workspace.followups");
  const [customDay, setCustomDay] = useState("");

  const cadenceReadback = useMemo(() => followupCadenceLabel(), [followupCadenceLabel]);

  const showCadenceToast = (previousLabel: string) => {
    const nextLabel = followupCadenceLabel();
    if (nextLabel === previousLabel) {
      return;
    }
    toast.success(tFollowups("savedToast", { cadence: nextLabel }), { duration: 1800 });
  };

  const handleChipToggle = (day: number) => {
    const previousLabel = followupCadenceLabel();
    if (followupCadenceDays.includes(day)) {
      removeFollowupDay(day);
    } else {
      addFollowupDay(day);
    }
    showCadenceToast(previousLabel);
  };

  const handleCustomDaySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = customDay.trim();
    if (!trimmed) {
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setCustomDay("");
      return;
    }
    if (followupCadenceDays.includes(parsed)) {
      setCustomDay("");
      return;
    }
    const previousLabel = followupCadenceLabel();
    addFollowupDay(parsed);
    showCadenceToast(previousLabel);
    setCustomDay("");
  };

  return (
    <section
      className="space-y-3 rounded-lg border border-border/60 bg-card p-4 shadow-sm"
      aria-labelledby="renewals-followups-heading"
      data-print="hide"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="space-y-1">
          <p
            id="renewals-followups-heading"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {tFollowups("title")}
          </p>
          <p className="text-sm text-muted-foreground">{tFollowups("predraft")}</p>
        </div>
        <p className="text-xs font-medium text-primary">
          {tFollowups("cadenceLabel")}: <span className="font-semibold">{cadenceReadback}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {FOLLOWUP_PRESET_DAYS.map((day) => {
          const isSelected = followupCadenceDays.includes(day);
          return (
            <Button
              key={day}
              type="button"
              size="sm"
              variant={isSelected ? "default" : "outline"}
              onClick={() => handleChipToggle(day)}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-semibold",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                  : "border-dashed text-muted-foreground hover:border-primary hover:text-primary"
              )}
            >
              {tFollowups("chipDays", { days: day })}
            </Button>
          );
        })}
        <form onSubmit={handleCustomDaySubmit} className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            step={1}
            value={customDay}
            onChange={(event) => setCustomDay(event.target.value)}
            placeholder={tFollowups("addDayPlaceholder")}
            aria-label={tFollowups("addDayPlaceholder")}
            className="h-8 w-24 rounded-full border-border/60 bg-background px-3 text-xs"
          />
          <Button type="submit" size="sm" variant="outline" className="h-8 rounded-full px-2">
            <PlusIcon className="size-3.5" aria-hidden="true" />
            <span className="sr-only">{tFollowups("addDayPlaceholder")}</span>
          </Button>
        </form>
      </div>
    </section>
  );
}

function ActionsGroup({
  record,
  onNudge,
  onReminder,
}: ActionsGroupProps) {
  const tActions = useTranslations(`${RENEWALS_PREFIX}.actions`);

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-2"
      data-testid={`renewal-actions-${record.id}`}
      data-print="hide"
    >
      <Button 
        size="sm" 
        variant="ghost" 
        onClick={() => onNudge("quote", record)}
        className="inline-flex items-center gap-1 text-xs shrink-0"
      >
        <FileTextIcon className="size-3.5" />
        {tActions("requestQuotes")}
      </Button>
      <Button 
        size="sm" 
        variant="ghost" 
        onClick={() => onNudge("message", record)}
        className="inline-flex items-center gap-1 text-xs shrink-0"
      >
        <MessageSquareIcon className="size-3.5" />
        {tActions("messageClient")}
      </Button>
      {!record.reminderSet ? (
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={onReminder}
          className="inline-flex items-center gap-1 text-xs shrink-0"
        >
          <BellIcon className="size-3.5" />
          {tActions("setReminder")}
        </Button>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-success/10 text-success shrink-0">
          <BellIcon className="size-3" />
          {tActions("reminderSet")}
        </span>
      )}
    </div>
  );
}

function SortIndicator({ active, direction }: SortIndicatorProps) {
  return (
    <span aria-hidden="true" className={cn("text-xs transition-opacity", active ? "opacity-100" : "opacity-30")}>
      {direction === "asc" ? "↑" : "↓"}
    </span>
  );
}

function extractCarriers(records: RenewalRecord[]): string[] {
  const seen = new Set<string>();
  for (const record of records) {
    if (!seen.has(record.carrier)) {
      seen.add(record.carrier);
    }
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

const RENEWAL_WINDOWS: RenewalWindowDays[] = [30, 60, 90];

function defaultReminderDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  // Format to YYYY-MM-DD for the date input
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatRenewalDate(renewalDateISO: string, locale: string, options: FormatDateOptions): string {
  try {
    return formatDate(renewalDateISO, { locale, ...options });
  } catch {
    return "--";
  }
}

function formatRenewalPremium(premium: Money, locale: string): string {
  return formatMoney(premium, {
    locale,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}



