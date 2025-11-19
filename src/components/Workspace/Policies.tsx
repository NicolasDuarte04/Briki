"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useUI } from "@/lib/ui/state";
import { formatMoney as formatMoneyValue, getMoneyAmountMajor, createMoneyFromMajor } from "@/lib/format";
import { type CurrencyCode, type Money, type Policy, type PolicyView } from "@/lib/types";
import {
  ColumnDef,
  ColumnFiltersState,
  ColumnPinningState,
  FilterFn,
  SortingFn,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type Table as TanTable,
} from "@tanstack/react-table";
import { useLocale, useTranslations } from "next-intl";

const DEFAULT_CURRENCY: CurrencyCode = "USD";

type NumberRange = {
  min?: number;
  max?: number;
};

type ColumnMenuLabels = {
  trigger: string;
  pinLabel: string;
  pinLeft: string;
  pinRight: string;
  unpin: string;
  reorderAria: string;
  reorderTitle: string;
};

function formatCurrencyFromMajor(value: number, currency: CurrencyCode, locale: string): string {
  const money = createMoneyFromMajor(value, currency);
  return formatMoneyValue(money, { locale, minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatRangeSummary(range: NumberRange, currency: CurrencyCode, locale: string): string {
  const hasMin = typeof range.min === "number" && Number.isFinite(range.min);
  const hasMax = typeof range.max === "number" && Number.isFinite(range.max);
  if (!hasMin && !hasMax) {
    return "";
  }
  const minValue = hasMin ? range.min! : undefined;
  const maxValue = hasMax ? range.max! : undefined;
  const minLabel = minValue !== undefined ? formatCurrencyFromMajor(minValue, currency, locale) : "";
  const maxLabel = maxValue !== undefined ? formatCurrencyFromMajor(maxValue, currency, locale) : "";
  if (hasMin && hasMax) {
    return `: ${minLabel}–${maxLabel}`;
  }
  return `: ${hasMin ? minLabel : maxLabel}`;
}

function isNumberRange(value: unknown): value is NumberRange {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const min = candidate.min;
  const max = candidate.max;
  return (typeof min === "number" && Number.isFinite(min)) || (typeof max === "number" && Number.isFinite(max));
}

function sanitizeNumberRange(range: NumberRange | undefined): NumberRange | undefined {
  if (!range) {
    return undefined;
  }
  const sanitized: NumberRange = {};
  if (typeof range.min === "number" && Number.isFinite(range.min)) {
    sanitized.min = range.min;
  }
  if (typeof range.max === "number" && Number.isFinite(range.max)) {
    sanitized.max = range.max;
  }
  if (sanitized.min === undefined && sanitized.max === undefined) {
    return undefined;
  }
  return sanitized;
}

function isMoney(value: unknown): value is Money {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<Money>;
  return typeof candidate.amountMinor === "number" && Number.isFinite(candidate.amountMinor) && typeof candidate.currency === "string";
}

function useDebouncedCallback<T extends unknown[]>(cb: (...args: T) => void, delay: number) {
  const timeoutRef = React.useRef<number | undefined>(undefined);
  const clear = React.useCallback(() => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);
  React.useEffect(() => clear, [clear]);
  return React.useCallback(
    (...args: T) => {
      clear();
      timeoutRef.current = window.setTimeout(() => cb(...args), delay);
    },
    [cb, delay, clear]
  );
}

const planFilter: FilterFn<PolicyView> = (row, columnId, filterValue) => {
  if (!filterValue || typeof filterValue !== "string") return true;
  const text = String(row.getValue<string>(columnId) ?? "");
  return text.toLowerCase().includes(filterValue.toLowerCase());
};

const moneyRangeFilter: FilterFn<PolicyView> = (row, columnId, filterValue) => {
  if (!isNumberRange(filterValue)) {
    return true;
  }
  const amount = row.getValue<number>(columnId);
  const minOk = filterValue.min === undefined || amount >= filterValue.min;
  const maxOk = filterValue.max === undefined || amount <= filterValue.max;
  return minOk && maxOk;
};

const ridersAnyFilter: FilterFn<PolicyView> = (row, columnId, filterValue) => {
  const selected = Array.isArray(filterValue) ? (filterValue as string[]) : [];
  if (!selected.length) return true;
  const riders = (row.getValue<string[]>(columnId) || []) as string[];
  return selected.some((r) => riders.includes(r));
};

const moneySortingFn: SortingFn<PolicyView> = (rowA, rowB, columnId) => {
  const amountA = rowA.getValue<number>(columnId);
  const amountB = rowB.getValue<number>(columnId);
  return amountA - amountB;
};

interface PoliciesProps {
  caseData?: any;
  loading?: boolean;
}

export default function Policies({ caseData, loading }: PoliciesProps = {}) {
  // ✅ FASE 6: Cambiar fuente de datos de mock a policyAnalyses
  const currentCaseId = useUI((s) => s.currentCaseId);
  const policyAnalyses = useUI((s) => s.policyAnalyses);
  const policyAnalysesLoading = useUI((s) => s.policyAnalysesLoading);
  const policyAnalysesLoaded = useUI((s) => s.policyAnalysesLoaded);
  const fetchPolicyAnalyses = useUI((s) => s.fetchPolicyAnalyses);
  const t = useTranslations("workspace.policies");
  const locale = useLocale();

  // ✅ FASE 6: Fetch policy analyses when case changes
  React.useEffect(() => {
    if (currentCaseId) {
      void fetchPolicyAnalyses(currentCaseId);
    }
  }, [currentCaseId, fetchPolicyAnalyses]);

  // ✅ FASE 6: Transform PolicyAnalysis[] to PolicyView[]
  const rows = React.useMemo(() => {
    return policyAnalyses.map((analysis) => ({
      id: analysis.id,
      plan: analysis.extractedData?.insurer?.name || analysis.artifact?.fileName || 'N/A',
      premium: analysis.extractedData?.financials?.premium_total || 0,
      deductible: analysis.extractedData?.deductibles?.[0]?.amount || 0,
      currency: (analysis.extractedData?.currency as CurrencyCode) || 'USD',
      riders: analysis.extractedData?.coverages?.map((c: any) => c.name || c.type) || [],
      confidence: typeof analysis.overallConfidence === 'string'
        ? parseFloat(analysis.overallConfidence)
        : analysis.overallConfidence,
      artifactId: analysis.artifactId,
      analysisId: analysis.id,
      pageReference: analysis.pageReferences?.find((ref: any) => ref.fieldName === 'premium_total')?.pageNumber || 1,
    }));
  }, [policyAnalyses]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <PoliciesTable
          rows={rows}
          loading={policyAnalysesLoading}
          loaded={policyAnalysesLoaded}
          locale={locale}
        />
      </CardContent>
    </Card>
  );
}

interface PoliciesTableProps {
  rows: PolicyView[];
  loading: boolean;
  loaded: boolean;
  locale: string;
}

function PoliciesTable({ rows, loading, loaded, locale }: PoliciesTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>({ left: [], right: [] });
  const [columnOrder, setColumnOrder] = React.useState<string[]>([
    "plan",
    "premium",
    "deductible",
    "riders",
    "actions",
  ]);

  const draggingColumnIdRef = React.useRef<string | null>(null);
  const reorderableIds = React.useMemo(() => new Set(["plan", "premium", "deductible", "riders"]), []);
  const showSkeleton = loading && !loaded;

  const t = useTranslations("workspace.policies");
  const columnMenuLabels = React.useMemo<ColumnMenuLabels>(
    () => ({
      trigger: t("columnMenu.trigger"),
      pinLabel: t("columnMenu.pin.label"),
      pinLeft: t("columnMenu.pin.left"),
      pinRight: t("columnMenu.pin.right"),
      unpin: t("columnMenu.pin.none"),
      reorderAria: t("columnMenu.reorder.ariaLabel"),
      reorderTitle: t("columnMenu.reorder.title"),
    }),
    [t]
  );

  const getHeaderDnDProps = React.useCallback(
    (columnId: string): React.HTMLAttributes<HTMLSpanElement> | undefined => {
      if (!reorderableIds.has(columnId)) return undefined;
      return {
        draggable: true,
        onDragStart: (e) => {
          draggingColumnIdRef.current = columnId;
          e.dataTransfer.effectAllowed = "move";
        },
        onDragOver: (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        },
        onDrop: (e) => {
          e.preventDefault();
          const fromId = draggingColumnIdRef.current;
          const toId = columnId;
          draggingColumnIdRef.current = null;
          if (!fromId || fromId === toId) return;
          setColumnOrder((old) => {
            const next = old.filter((id) => id !== fromId);
            const toIdx = next.indexOf(toId);
            const insertAt = toIdx === -1 ? next.length : toIdx;
            next.splice(insertAt, 0, fromId);
            const actionsIdx = next.indexOf("actions");
            if (actionsIdx !== -1 && actionsIdx !== next.length - 1) {
              next.splice(actionsIdx, 1);
              next.push("actions");
            }
            return next;
          });
        },
        "aria-label": columnMenuLabels.reorderAria,
        title: columnMenuLabels.reorderTitle,
      };
    },
    [reorderableIds, setColumnOrder, columnMenuLabels]
  );

  const currency = React.useMemo(() => rows[0]?.currency ?? DEFAULT_CURRENCY, [rows]);

  const columns = React.useMemo<ColumnDef<PolicyView>[]>(
    () => [
      {
        accessorKey: "plan",
        filterFn: planFilter,
        header: ({ column }) => (
          <HeaderWithPinMenu column={column} title={t("columns.plan")} dragProps={getHeaderDnDProps(column.id)} labels={columnMenuLabels} />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.plan}</span>
            {/* ✅ CORRECCIÓN: Chip de confianza con gradiente continuo */}
            {row.original.confidence !== undefined && (
              <span
                className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap"
                style={{
                  backgroundColor: getConfidenceColor(row.original.confidence),
                  color: getConfidenceTextColor(row.original.confidence),
                  borderColor: 'transparent'
                }}
                title={`Confianza del análisis: ${Math.round(row.original.confidence * 100)}%`}
              >
                {Math.round(row.original.confidence * 100)}%
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "premium",
        filterFn: moneyRangeFilter,
        sortingFn: moneySortingFn,
        header: ({ column }) => (
          <HeaderWithPinMenu
            column={column}
            title={t("columns.premium")}
            align="right"
            dragProps={getHeaderDnDProps(column.id)}
            labels={columnMenuLabels}
          />
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{formatCurrencyFromMajor(row.original.premium, currency, locale)}</div>
        ),
      },
      {
        accessorKey: "deductible",
        filterFn: moneyRangeFilter,
        sortingFn: moneySortingFn,
        header: ({ column }) => (
          <HeaderWithPinMenu
            column={column}
            title={t("columns.deductible")}
            align="right"
            dragProps={getHeaderDnDProps(column.id)}
            labels={columnMenuLabels}
          />
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{formatCurrencyFromMajor(row.original.deductible, currency, locale)}</div>
        ),
      },
      {
        accessorKey: "riders",
        filterFn: ridersAnyFilter,
        enableSorting: false,
        header: ({ column }) => (
          <HeaderWithPinMenu column={column} title={t("columns.riders")} dragProps={getHeaderDnDProps(column.id)} labels={columnMenuLabels} />
        ),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.riders.map((rider) => (
              <Badge key={rider} variant="secondary">
                {rider}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <div className="sr-only">{t("actions.columnLabel")}</div>,
        cell: ({ row }) => (
          <div className="flex w-full items-center justify-end">
            <div className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              {/* ✅ FASE 6: Botón "Ver en PDF" */}
              {row.original.analysisId ? (
                <ViewInPdfButton analysisId={row.original.analysisId} />
              ) : (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                    }}
                  >
                    {t("actions.shortlist")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                    }}
                  >
                    {t("actions.evidence")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                    }}
                  >
                    {t("actions.notes")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ),
      },
    ],
    [t, getHeaderDnDProps, columnMenuLabels, locale]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters, columnPinning, columnOrder },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnPinningChange: setColumnPinning,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enablePinning: true,
    columnResizeMode: "onChange",
    defaultColumn: { size: 160, minSize: 80 },
  });

  const planCol = table.getColumn("plan");
  const premiumCol = table.getColumn("premium");
  const deductibleCol = table.getColumn("deductible");
  const ridersCol = table.getColumn("riders");

  const allRiders = React.useMemo(() => {
    const s = new Set<string>();
    for (const p of rows) for (const r of p.riders) s.add(r);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const premiumRange = sanitizeNumberRange(premiumCol?.getFilterValue() as NumberRange | undefined) ?? {};
  const deductibleRange = sanitizeNumberRange(deductibleCol?.getFilterValue() as NumberRange | undefined) ?? {};
  const selectedRiders = Array.isArray(ridersCol?.getFilterValue())
    ? (ridersCol?.getFilterValue() as string[])
    : [];

  const debouncedSetPlan = useDebouncedCallback((value: string | undefined) => {
    const v = value && value.trim().length ? value : undefined;
    planCol?.setFilterValue(v);
  }, 200);

  const debouncedSetNumberRange = useDebouncedCallback(
    (colId: "premium" | "deductible", range: NumberRange | undefined) => {
      const col = colId === "premium" ? premiumCol : deductibleCol;
      const sanitized = sanitizeNumberRange(range);
      if (!sanitized) {
        col?.setFilterValue(undefined);
        return;
      }
      col?.setFilterValue(sanitized);
    },
    250
  );

  const setRidersSelected = React.useCallback(
    (next: string[]) => {
      if (!next.length) ridersCol?.setFilterValue(undefined);
      else ridersCol?.setFilterValue(next);
    },
    [ridersCol]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-xs"
          placeholder={t("filters.plan.placeholder")}
          defaultValue={(planCol?.getFilterValue() as string) || ""}
          onChange={(e) => debouncedSetPlan(e.target.value)}
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              {t("filters.premium.label")}
              {formatRangeSummary(premiumRange, currency, locale)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                inputMode="numeric"
                placeholder={t("filters.common.min")}
                defaultValue={premiumRange.min ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  const minValue = v === "" ? undefined : Number(v);
                  const hasMin = typeof minValue === "number" && Number.isFinite(minValue);
                  const hasMax = typeof premiumRange.max === "number" && Number.isFinite(premiumRange.max);
                  if (!hasMin && !hasMax) {
                    debouncedSetNumberRange("premium", undefined);
                  } else {
                    const next: NumberRange = {};
                    if (hasMin) next.min = minValue;
                    if (hasMax && premiumRange.max !== undefined) next.max = premiumRange.max;
                    debouncedSetNumberRange("premium", next);
                  }
                }}
              />
              <Input
                type="number"
                inputMode="numeric"
                placeholder={t("filters.common.max")}
                defaultValue={premiumRange.max ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  const maxValue = v === "" ? undefined : Number(v);
                  const hasMin = typeof premiumRange.min === "number" && Number.isFinite(premiumRange.min);
                  const hasMax = typeof maxValue === "number" && Number.isFinite(maxValue);
                  if (!hasMin && !hasMax) {
                    debouncedSetNumberRange("premium", undefined);
                  } else {
                    const next: NumberRange = {};
                    if (hasMin && premiumRange.min !== undefined) next.min = premiumRange.min;
                    if (hasMax) next.max = maxValue;
                    debouncedSetNumberRange("premium", next);
                  }
                }}
              />
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              {t("filters.deductible.label")}
              {formatRangeSummary(deductibleRange, currency, locale)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                inputMode="numeric"
                placeholder={t("filters.common.min")}
                defaultValue={deductibleRange.min ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  const minValue = v === "" ? undefined : Number(v);
                  const hasMin = typeof minValue === "number" && Number.isFinite(minValue);
                  const hasMax = typeof deductibleRange.max === "number" && Number.isFinite(deductibleRange.max);
                  if (!hasMin && !hasMax) {
                    debouncedSetNumberRange("deductible", undefined);
                  } else {
                    const next: NumberRange = {};
                    if (hasMin) next.min = minValue;
                    if (hasMax && deductibleRange.max !== undefined) next.max = deductibleRange.max;
                    debouncedSetNumberRange("deductible", next);
                  }
                }}
              />
              <Input
                type="number"
                inputMode="numeric"
                placeholder={t("filters.common.max")}
                defaultValue={deductibleRange.max ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  const maxValue = v === "" ? undefined : Number(v);
                  const hasMin = typeof deductibleRange.min === "number" && Number.isFinite(deductibleRange.min);
                  const hasMax = typeof maxValue === "number" && Number.isFinite(maxValue);
                  if (!hasMin && !hasMax) {
                    debouncedSetNumberRange("deductible", undefined);
                  } else {
                    const next: NumberRange = {};
                    if (hasMin && deductibleRange.min !== undefined) next.min = deductibleRange.min;
                    if (hasMax) next.max = maxValue;
                    debouncedSetNumberRange("deductible", next);
                  }
                }}
              />
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {selectedRiders.length ? t("filters.riders.labelWithCount", { count: selectedRiders.length }) : t("filters.riders.label")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56">
            {allRiders.map((rider) => {
              const checked = selectedRiders.includes(rider);
              return (
                <DropdownMenuCheckboxItem
                  key={rider}
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    const next = isChecked
                      ? [...selectedRiders, rider]
                      : selectedRiders.filter((r) => r !== rider);
                    setRidersSelected(next);
                  }}
                >
                  {rider}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => setColumnFilters([])}
        >
          {t("actions.clearFilters")}
        </Button>
      </div>

      {showSkeleton ? (
        <PoliciesLoadingSkeleton />
      ) : (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const pinned = getPinnedStyles(header.column as Column<PolicyView, unknown>, table, true);
                  const widthPx: number | undefined = header.getSize?.() ?? header.column.getSize?.();
                  const style: React.CSSProperties = { ...pinned.style, width: widthPx, minWidth: widthPx };
                  const widthClass = header.column.id === "plan" ? "w-[40%]" : "";
                  return (
                    <TableHead key={header.id} className={`relative ${widthClass} ${pinned.className}`} style={style}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanResize?.() && (
                        <div
                          onMouseDown={header.getResizeHandler?.()}
                          onTouchStart={header.getResizeHandler?.()}
                          className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none ${header.column.getIsResizing?.() ? "bg-primary/30" : "bg-transparent"
                            }`}
                          aria-label="Resize column"
                        />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="group" tabIndex={0}>
                  {row.getVisibleCells().map((cell) => {
                    const pinned = getPinnedStyles(cell.column as Column<PolicyView, unknown>, table, false);
                    const widthPx: number | undefined = cell.column.getSize?.();
                    const style: React.CSSProperties = { ...pinned.style, width: widthPx, minWidth: widthPx };
                    const extra = cell.column.id === "plan" ? "font-medium" : "";
                    return (
                      <TableCell key={cell.id} className={`${extra} ${pinned.className}`} style={style}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="font-medium text-foreground/80">{t("empty.title")}</div>
                    <div className="text-muted-foreground text-sm">{t("empty.description")}</div>
                    <div>
                      <Button variant="outline" size="sm" type="button" onClick={() => setColumnFilters([])}>
                        {t("empty.resetFilters")}
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function PoliciesLoadingSkeleton() {
  const t = useTranslations("workspace.policies");
  const headers = [
    { key: "plan", label: t("columns.plan"), align: "left", widthClass: "w-[40%]" },
    { key: "premium", label: t("columns.premium"), align: "right" },
    { key: "deductible", label: t("columns.deductible"), align: "right" },
    { key: "riders", label: t("columns.riders"), align: "left" },
    { key: "actions", label: t("actions.columnLabel"), align: "right" },
  ];

  return (
    <Table aria-hidden="true" className="pointer-events-none select-none opacity-80">
      <TableHeader>
        <TableRow>
          {headers.map((header) => (
            <TableHead key={header.key} className={`relative ${header.widthClass ?? ""}`}>
              <div className={`flex items-center ${header.align === "right" ? "justify-end" : "justify-start"}`}>
                <Skeleton className="h-4 w-24" />
              </div>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 10 }).map((_, index) => (
          <TableRow key={index} className="h-12">
            <TableCell className="w-[40%]">
              <Skeleton className="h-4 w-36" />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end">
                <Skeleton className="h-4 w-20" />
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end">
                <Skeleton className="h-4 w-20" />
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-14 rounded-full" />
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="ml-auto flex items-center gap-1.5">
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-md" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ViewInPdfButton({ analysisId }: { analysisId: string }) {
  const navigateToAnalysis = useUI((s) => s.navigateToAnalysis);
  const t = useTranslations("workspace.policies");

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    navigateToAnalysis(analysisId);
  };

  return (
    <Button
      variant="default"
      size="sm"
      type="button"
      onClick={handleClick}
      title={t("actions.viewInPdfTooltip", { default: "Ver análisis detallado en PDF" })}
    >
      {t("actions.viewInPdf", { default: "Ver en PDF" })}
    </Button>
  );
}

/**
 * ✅ CORRECCIÓN: Calcula color RGB interpolado para un nivel de confianza
 * Gradiente continuo: Rojo (0%) → Amarillo (50%) → Verde (100%)
 * @param confidence - Valor entre 0 y 1
 * @returns Color en formato RGB
 */
function getConfidenceColor(confidence: number): string {
  // Clamp entre 0 y 1
  const c = Math.max(0, Math.min(1, confidence));

  // Colores de referencia (Tailwind)
  const red = { r: 239, g: 68, b: 68 };      // #EF4444 (red-500)
  const yellow = { r: 234, g: 179, b: 8 };   // #EAB308 (yellow-500)
  const green = { r: 34, g: 197, b: 94 };    // #22C55E (green-500)

  let r: number, g: number, b: number;

  if (c < 0.5) {
    // Interpolación entre rojo (0) y amarillo (0.5)
    const t = c * 2; // Normalizar a 0-1
    r = Math.round(red.r + (yellow.r - red.r) * t);
    g = Math.round(red.g + (yellow.g - red.g) * t);
    b = Math.round(red.b + (yellow.b - red.b) * t);
  } else {
    // Interpolación entre amarillo (0.5) y verde (1.0)
    const t = (c - 0.5) * 2; // Normalizar a 0-1
    r = Math.round(yellow.r + (green.r - yellow.r) * t);
    g = Math.round(yellow.g + (green.g - yellow.g) * t);
    b = Math.round(yellow.b + (green.b - yellow.b) * t);
  }

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * ✅ CORRECCIÓN: Determina el color de texto según el fondo
 * @param confidence - Valor entre 0 y 1
 * @returns 'white' para fondos oscuros, 'black' para fondos claros
 */
function getConfidenceTextColor(confidence: number): string {
  // Texto blanco para confianza baja (fondo rojo oscuro)
  // Texto negro para confianza media-alta (fondo amarillo/verde)
  return confidence < 0.3 ? 'white' : 'black';
}

function HeaderWithPinMenu({ column, title, align, dragProps, labels }: { column: Column<PolicyView, unknown>; title: string; align?: "left" | "right"; dragProps?: React.HTMLAttributes<HTMLSpanElement> | undefined; labels: ColumnMenuLabels }) {
  const pin = column.getIsPinned();
  const value = pin ?? "none";
  return (
    <div className={`flex items-center ${align === "right" ? "justify-end" : "justify-start"} gap-2`}>
      <Button
        variant="ghost"
        className="-ml-2 h-8 px-2"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {title}
        {column.getIsSorted() === "asc" ? (
          <span aria-hidden className="ml-1">▲</span>
        ) : column.getIsSorted() === "desc" ? (
          <span aria-hidden className="ml-1">▼</span>
        ) : null}
      </Button>
      {dragProps && (
        <span
          {...(dragProps as any)}
          className="cursor-grab select-none text-muted-foreground/70 active:cursor-grabbing"
        >
          ⠿
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" aria-label={labels.trigger} title={labels.trigger}>
            •••
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align === "right" ? "end" : "start"} sideOffset={6}>
          <DropdownMenuLabel>{labels.pinLabel}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={typeof value === "string" ? value : "none"}
            onValueChange={(v) => {
              if (v === "left" || v === "right") column.pin(v);
              else column.pin(false);
            }}
          >
            <DropdownMenuRadioItem value="left">{labels.pinLeft}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="right">{labels.pinRight}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="none">{labels.unpin}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type PinnedStylesResult = { className: string; style: React.CSSProperties };

function getPinnedStyles(column: Column<PolicyView, unknown>, table: TanTable<PolicyView>, isHeader: boolean): PinnedStylesResult {
  const isPinned = column.getIsPinned();
  const base: PinnedStylesResult = { className: "", style: {} };
  if (!isPinned) return base;

  const leftColumns = table.getLeftLeafColumns?.() ?? [];
  const rightColumns = table.getRightLeafColumns?.() ?? [];

  if (isPinned === "left") {
    const idx = leftColumns.findIndex((c) => c.id === column.id);
    const offset = leftColumns.slice(0, idx).reduce((acc, c) => acc + (c.getSize?.() ?? 0), 0);
    return { className: "sticky-col sticky-left", style: { ["--pin-left" as keyof React.CSSProperties]: `${offset}px` } };
  }
  if (isPinned === "right") {
    const idx = rightColumns.findIndex((c) => c.id === column.id);
    const offset = rightColumns.slice(idx + 1).reduce((acc, c) => acc + (c.getSize?.() ?? 0), 0);
    return { className: "sticky-col sticky-right", style: { ["--pin-right" as keyof React.CSSProperties]: `${offset}px` } };
  }
  return base;
}


