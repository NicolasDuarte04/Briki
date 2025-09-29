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

// PolicyView type from state (matches the view selector output)
type PolicyView = {
  plan: string;
  premium: number;
  deductible: number;
  riders: string[];
  network?: "basic" | "preferred" | "concierge";
  service?: "standard" | "enhanced" | "white-glove";
};
import {
  ColumnDef,
  ColumnFiltersState,
  ColumnPinningState,
  FilterFn,
  SortingState,
  type Column,
  type Table as TanTable,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { useTranslations } from "next-intl";
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

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

const numberRangeFilter: FilterFn<PolicyView> = (row, columnId, filterValue) => {
  if (!filterValue || typeof filterValue !== "object") return true;
  const value = Number(row.getValue<number>(columnId));
  const { min, max } = filterValue as NumberRange;
  const minOk = typeof min !== "number" ? true : value >= min;
  const maxOk = typeof max !== "number" ? true : value <= max;
  return minOk && maxOk;
};

const ridersAnyFilter: FilterFn<PolicyView> = (row, columnId, filterValue) => {
  const selected = Array.isArray(filterValue) ? (filterValue as string[]) : [];
  if (!selected.length) return true;
  const riders = (row.getValue<string[]>(columnId) || []) as string[];
  return selected.some((r) => riders.includes(r));
};

export default function Policies() {
  const policies = useUI((s) => s.selectPoliciesView());
  const policiesLoading = useUI((s) => s.policiesLoading);
  const policiesLoaded = useUI((s) => s.policiesLoaded);
  const fetchPolicies = useUI((s) => s.fetchPolicies);
  const t = useTranslations("workspace.policies");

  React.useEffect(() => {
    void fetchPolicies();
  }, [fetchPolicies]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <PoliciesTable rows={policies} loading={policiesLoading} loaded={policiesLoaded} />
      </CardContent>
    </Card>
  );
}

function PoliciesTable({ rows, loading, loaded }: { rows: PolicyView[]; loading: boolean; loaded: boolean }) {
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

  const columns = React.useMemo<ColumnDef<PolicyView>[]>(
    () => [
      {
        accessorKey: "plan",
        filterFn: planFilter,
        header: ({ column }) => (
          <HeaderWithPinMenu column={column} title={t("columns.plan")} dragProps={getHeaderDnDProps(column.id)} labels={columnMenuLabels} />
        ),
        cell: ({ row }) => <div className="font-medium">{row.original.plan}</div>,
      },
      {
        accessorKey: "premium",
        filterFn: numberRangeFilter,
        sortingFn: "basic",
        header: ({ column }) => (
          <HeaderWithPinMenu
            column={column}
            title={t("columns.premium")}
            align="right"
            dragProps={getHeaderDnDProps(column.id)}
            labels={columnMenuLabels}
          />
        ),
        cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.premium)}</div>,
      },
      {
        accessorKey: "deductible",
        filterFn: numberRangeFilter,
        sortingFn: "basic",
        header: ({ column }) => (
          <HeaderWithPinMenu
            column={column}
            title={t("columns.deductible")}
            align="right"
            dragProps={getHeaderDnDProps(column.id)}
            labels={columnMenuLabels}
          />
        ),
        cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.deductible)}</div>,
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
        cell: () => (
          <div className="flex w-full items-center justify-end">
            <div className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
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
            </div>
          </div>
        ),
      },
    ],
    [t, getHeaderDnDProps, columnMenuLabels]
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

  const premiumRange = (premiumCol?.getFilterValue() as NumberRange | undefined) || {};
  const deductibleRange = (deductibleCol?.getFilterValue() as NumberRange | undefined) || {};
  const selectedRiders = (ridersCol?.getFilterValue() as string[] | undefined) || [];

  const debouncedSetPlan = useDebouncedCallback((value: string | undefined) => {
    const v = value && value.trim().length ? value : undefined;
    planCol?.setFilterValue(v);
  }, 200);

  const debouncedSetNumberRange = useDebouncedCallback(
    (colId: "premium" | "deductible", range: NumberRange | undefined) => {
      const col = colId === "premium" ? premiumCol : deductibleCol;
      if (!range || (typeof range.min !== "number" && typeof range.max !== "number")) {
        col?.setFilterValue(undefined);
        return;
      }
      col?.setFilterValue(range);
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
              {typeof premiumRange.min === "number" || typeof premiumRange.max === "number"
                ? `: ${
                    typeof premiumRange.min === "number" ? formatCurrency(premiumRange.min) : ""
                  }${typeof premiumRange.min === "number" || typeof premiumRange.max === "number" ? "–" : ""}${
                    typeof premiumRange.max === "number" ? formatCurrency(premiumRange.max) : ""
                  }`
                : ""}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                inputMode="numeric"
                placeholder={t("filters.common.min")}
                defaultValue={typeof premiumRange.min === "number" ? premiumRange.min : ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  const min = v === "" ? undefined : Number(v);
                  const next: NumberRange | undefined =
                    typeof min !== "number" && typeof premiumRange.max !== "number"
                      ? undefined
                      : { min, max: premiumRange.max };
                  debouncedSetNumberRange("premium", next);
                }}
              />
              <Input
                type="number"
                inputMode="numeric"
                placeholder={t("filters.common.max")}
                defaultValue={typeof premiumRange.max === "number" ? premiumRange.max : ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  const max = v === "" ? undefined : Number(v);
                  const next: NumberRange | undefined =
                    typeof premiumRange.min !== "number" && typeof max !== "number"
                      ? undefined
                      : { min: premiumRange.min, max };
                  debouncedSetNumberRange("premium", next);
                }}
              />
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              {t("filters.deductible.label")}
              {typeof deductibleRange.min === "number" || typeof deductibleRange.max === "number"
                ? `: ${
                    typeof deductibleRange.min === "number" ? formatCurrency(deductibleRange.min) : ""
                  }${typeof deductibleRange.min === "number" || typeof deductibleRange.max === "number" ? "–" : ""}${
                    typeof deductibleRange.max === "number" ? formatCurrency(deductibleRange.max) : ""
                  }`
                : ""}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                inputMode="numeric"
                placeholder={t("filters.common.min")}
                defaultValue={typeof deductibleRange.min === "number" ? deductibleRange.min : ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  const min = v === "" ? undefined : Number(v);
                  const next: NumberRange | undefined =
                    typeof min !== "number" && typeof deductibleRange.max !== "number"
                      ? undefined
                      : { min, max: deductibleRange.max };
                  debouncedSetNumberRange("deductible", next);
                }}
              />
              <Input
                type="number"
                inputMode="numeric"
                placeholder={t("filters.common.max")}
                defaultValue={typeof deductibleRange.max === "number" ? deductibleRange.max : ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  const max = v === "" ? undefined : Number(v);
                  const next: NumberRange | undefined =
                    typeof deductibleRange.min !== "number" && typeof max !== "number"
                      ? undefined
                      : { min: deductibleRange.min, max };
                  debouncedSetNumberRange("deductible", next);
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
                {headerGroup.headers.map((header: any) => {
                  const pinned = getPinnedStyles(header.column as Column<any, any>, table as unknown as TanTable<any>, true);
                  const widthPx: number | undefined =
                    typeof header.getSize === "function" ? header.getSize() : header.column?.getSize?.() ?? undefined;
                  const style: React.CSSProperties = { ...pinned.style, width: widthPx, minWidth: widthPx };
                  const widthClass = header.column.id === "plan" ? "w-[40%]" : "";
                  return (
                    <TableHead key={header.id} className={`relative ${widthClass} ${pinned.className}`} style={style}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column?.getCanResize?.() && (
                        <div
                          onMouseDown={header.getResizeHandler?.()}
                          onTouchStart={header.getResizeHandler?.()}
                          className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none ${
                            header.column?.getIsResizing?.() ? "bg-primary/30" : "bg-transparent"
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
                <TableRow key={row.id} className="group">
                  {row.getVisibleCells().map((cell: any) => {
                    const pinned = getPinnedStyles(cell.column as Column<any, any>, table as unknown as TanTable<any>, false);
                    const widthPx: number | undefined = cell.column?.getSize?.() ?? undefined;
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

function HeaderWithPinMenu({ column, title, align, dragProps, labels }: { column: Column<any, any>; title: string; align?: "left" | "right"; dragProps?: React.HTMLAttributes<HTMLSpanElement>; labels: ColumnMenuLabels }) {
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
          {...dragProps}
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

function getPinnedStyles(column: Column<any, any>, table: TanTable<any>, isHeader: boolean) {
  const isPinned = column.getIsPinned();
  const base: { className: string; style: React.CSSProperties } = { className: "", style: {} };
  if (!isPinned) return base;

  const leftColumns = (table as any).getLeftLeafColumns?.() ?? [];
  const rightColumns = (table as any).getRightLeafColumns?.() ?? [];

  if (isPinned === "left") {
    const idx = leftColumns.findIndex((c: any) => c.id === (column as any).id);
    const offset = leftColumns.slice(0, idx).reduce((acc: number, c: any) => acc + (c.getSize?.() ?? 0), 0);
    return { className: "sticky-col sticky-left", style: { ["--pin-left" as any]: `${offset}px` } };
  }
  if (isPinned === "right") {
    const idx = rightColumns.findIndex((c: any) => c.id === (column as any).id);
    const offset = rightColumns.slice(idx + 1).reduce((acc: number, c: any) => acc + (c.getSize?.() ?? 0), 0);
    return { className: "sticky-col sticky-right", style: { ["--pin-right" as any]: `${offset}px` } };
  }
  return base;
}


