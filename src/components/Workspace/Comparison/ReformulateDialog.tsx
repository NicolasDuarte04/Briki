"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Info } from "lucide-react";
import type { PolicyComparison, ComparisonRow, ReformulationOptions } from "@/lib/types";

// ✅ Categorías válidas derivadas del type union (sin hardcodear)
const FOCUS_ASPECT_CATEGORIES: ComparisonRow['category'][] = [
  'coverage', 'deductible', 'exclusion', 'benefit', 'requirement'
];

const MAX_USER_PROMPT_LENGTH = 500;

interface ReformulateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: ReformulationOptions) => void;
  comparisons: PolicyComparison[];
  loading: boolean;
}

export function ReformulateDialog({
  open,
  onOpenChange,
  onConfirm,
  comparisons,
  loading,
}: ReformulateDialogProps) {
  const t = useTranslations("workspace.comparisons.semantic.reformulate");

  const [selectedAspects, setSelectedAspects] = useState<Set<ComparisonRow['category']>>(new Set());
  const [userPrompt, setUserPrompt] = useState("");
  const [selectedRefIds, setSelectedRefIds] = useState<Set<string>>(new Set());

  const canSubmit = useMemo(
    () => selectedAspects.size > 0 || userPrompt.trim().length > 0,
    [selectedAspects, userPrompt]
  );

  const toggleAspect = (aspect: ComparisonRow['category']) => {
    setSelectedAspects(prev => {
      const next = new Set(prev);
      if (next.has(aspect)) next.delete(aspect);
      else next.add(aspect);
      return next;
    });
  };

  const toggleRefComparison = (id: string) => {
    setSelectedRefIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = () => {
    const options: ReformulationOptions = {};
    if (selectedAspects.size > 0) options.focusAspects = Array.from(selectedAspects);
    if (userPrompt.trim()) options.userPrompt = userPrompt.trim();
    if (selectedRefIds.size > 0) options.referenceComparisonIds = Array.from(selectedRefIds);
    onConfirm(options);
    // Reset state after submit
    setSelectedAspects(new Set());
    setUserPrompt("");
    setSelectedRefIds(new Set());
  };

  const handleCancel = () => {
    setSelectedAspects(new Set());
    setUserPrompt("");
    setSelectedRefIds(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            {t("dialogTitle")}
          </DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-6 py-2">
            {/* Section 1: Focus Aspects */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">
                {t("focusAspectsLabel")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FOCUS_ASPECT_CATEGORIES.map((aspect) => (
                  <label
                    key={aspect}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      selectedAspects.has(aspect)
                        ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-600"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedAspects.has(aspect)}
                      onCheckedChange={() => toggleAspect(aspect)}
                    />
                    <span className="text-sm">{t(`aspects.${aspect}`)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Section 2: User Prompt */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                {t("userPromptLabel")}
              </label>
              <Textarea
                placeholder={t("userPromptPlaceholder")}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value.slice(0, MAX_USER_PROMPT_LENGTH))}
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Info className="h-3 w-3" />
                  <span>{t("promptHint")}</span>
                </div>
                <span className={`text-xs tabular-nums ${
                  userPrompt.length > MAX_USER_PROMPT_LENGTH * 0.9
                    ? "text-amber-500"
                    : "text-muted-foreground"
                }`}>
                  {t("charCount", { count: userPrompt.length, max: MAX_USER_PROMPT_LENGTH })}
                </span>
              </div>
            </div>

            {/* Section 3: Reference Comparisons */}
            {comparisons.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  {t("referenceLabel")}
                </label>
                <p className="text-xs text-muted-foreground">{t("referenceHint")}</p>
                <div className="space-y-1.5">
                  {comparisons.map((comp) => (
                    <label
                      key={comp.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedRefIds.has(comp.id)
                          ? "border-violet-400 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-600"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={selectedRefIds.has(comp.id)}
                        onCheckedChange={() => toggleRefComparison(comp.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">
                          {comp.label || `Comparación ${comp.id.slice(0, 8)}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comp.createdAt).toLocaleDateString()} — {comp.rows.length} filas
                        </span>
                      </div>
                      {comp.focusAspects && comp.focusAspects.length > 0 && (
                        <div className="flex gap-1 flex-shrink-0">
                          {comp.focusAspects.slice(0, 2).map((a) => (
                            <Badge key={a} variant="secondary" className="text-[10px]">
                              {a}
                            </Badge>
                          ))}
                          {comp.focusAspects.length > 2 && (
                            <Badge variant="secondary" className="text-[10px]">
                              +{comp.focusAspects.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                {t("submitting")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {t("submit")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
