"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Check } from "lucide-react";
import { useState } from "react";
import type { PolicyComparison } from "@/lib/types";

interface ComparisonSelectorProps {
  comparisons: PolicyComparison[];
  activeComparisonId: string | null;
  onSelect: (comparisonId: string) => void;
  onDelete: (comparisonId: string) => void;
}

export function ComparisonSelector({
  comparisons,
  activeComparisonId,
  onSelect,
  onDelete,
}: ComparisonSelectorProps) {
  const t = useTranslations("workspace.comparisons.semantic.selector");
  const [deleteTarget, setDeleteTarget] = useState<PolicyComparison | null>(null);

  const canDelete = comparisons.length > 1;

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  if (comparisons.length <= 1) {
    return null; // Don't show selector if only one comparison
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("label")} ({comparisons.length})
        </label>
        <ScrollArea className="max-h-[200px]">
          <div className="flex flex-col gap-1">
            {comparisons.map((comp) => {
              const isActive = comp.id === activeComparisonId;
              return (
                <div
                  key={comp.id}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                    isActive
                      ? "border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/30 dark:border-indigo-600 shadow-sm"
                      : "border-transparent hover:border-border hover:bg-muted/50"
                  }`}
                  onClick={() => onSelect(comp.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(comp.id);
                    }
                  }}
                >
                  {isActive && (
                    <Check className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm truncate block ${isActive ? "font-semibold" : "font-medium"}`}>
                      {comp.label || t("defaultLabel", { number: comparisons.indexOf(comp) + 1 })}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(comp.createdAt).toLocaleDateString()} {new Date(comp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        · {comp.rows.length} filas
                      </span>
                    </div>
                  </div>

                  {comp.focusAspects && comp.focusAspects.length > 0 && (
                    <div className="flex gap-0.5 flex-shrink-0">
                      {comp.focusAspects.slice(0, 2).map((a) => (
                        <Badge key={a} variant="outline" className="text-[9px] px-1 py-0">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(comp);
                      }}
                      aria-label={t("deleteAriaLabel")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", {
                label: deleteTarget?.label || t("defaultLabel", { number: "..." }),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelDelete")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
