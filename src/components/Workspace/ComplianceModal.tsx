"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { complianceChecklistItems } from "@/lib/compliance";
import { useUI } from "@/lib/ui/state";

export function ComplianceModal() {
  // Use individual selectors to avoid creating new objects on each render
  const complianceOpen = useUI((state) => state.complianceOpen);
  const complianceJurisdiction = useUI((state) => state.complianceJurisdiction);
  const checked = useUI((state) => state.checked);
  const closeCompliance = useUI((state) => state.closeCompliance);
  const toggleCompliance = useUI((state) => state.toggleCompliance);
  const passCompliance = useUI((state) => state.passCompliance);
  const isCompliancePassed = useUI((state) => state.isCompliancePassed);

  const uiTranslations = useTranslations("workspace.compliance");
  const jurisdictionTranslations = useTranslations("workspace.compliance.jurisdictions");

  const firstCheckboxRef = useRef<HTMLButtonElement | null>(null);

  const jurisdictionItems = useMemo(
    () => complianceChecklistItems[complianceJurisdiction] ?? [],
    [complianceJurisdiction]
  );
  const jurisdictionChecked = checked[complianceJurisdiction] ?? {};

  const jurisdictionTitle = jurisdictionTranslations(`${complianceJurisdiction}.title`);
  const modalDescription = uiTranslations("description", { jurisdiction: jurisdictionTitle });
  const jurisdictionItemLabels = useMemo(() => {
    try {
      const rawItems = jurisdictionTranslations.raw(`${complianceJurisdiction}.items`);
      if (rawItems && typeof rawItems === "object") {
        return rawItems as Record<string, string>;
      }
    } catch {
      // Fallback handled below
    }
    return {} as Record<string, string>;
  }, [jurisdictionTranslations, complianceJurisdiction]);

  const canPass = useMemo(
    () => {
      const items = complianceChecklistItems[complianceJurisdiction];
      if (!items?.length) return false;
      const jurisdictionChecked = checked[complianceJurisdiction];
      if (!jurisdictionChecked) return false;
      return items.every((item) => Boolean(jurisdictionChecked[item]));
    },
    [complianceJurisdiction, checked]
  );

  useEffect(() => {
    if (complianceOpen) {
      const handle = window.requestAnimationFrame(() => {
        firstCheckboxRef.current?.focus();
      });
      return () => window.cancelAnimationFrame(handle);
    }
    return undefined;
  }, [complianceOpen, complianceJurisdiction]);

  const handleToggle = useCallback(
    (itemId: string) => {
      toggleCompliance(itemId);
    },
    [toggleCompliance]
  );

  const handlePass = useCallback(() => {
    if (!canPass) return;
    passCompliance(complianceJurisdiction);
    closeCompliance();
  }, [canPass, closeCompliance, complianceJurisdiction, passCompliance]);

  return (
    <Dialog
      open={complianceOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeCompliance();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{uiTranslations("title")}</DialogTitle>
          <DialogDescription>{modalDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm font-semibold text-foreground">{jurisdictionTitle}</p>
          <ul className="space-y-3">
            {jurisdictionItems.map((itemId, index) => {
              const fieldId = `${complianceJurisdiction}-${itemId}`.replace(/\./g, "-");
              const labelText = jurisdictionItemLabels[itemId] ?? jurisdictionTranslations(
                `${complianceJurisdiction}.items.${itemId}`
              );
              const isChecked = Boolean(jurisdictionChecked[itemId]);
              return (
                <li key={itemId} className="flex items-start gap-3">
                  <Checkbox
                    id={fieldId}
                    ref={index === 0 ? firstCheckboxRef : undefined}
                    checked={isChecked}
                    onCheckedChange={() => handleToggle(itemId)}
                    aria-describedby={`${fieldId}-status`}
                    aria-checked={isChecked}
                  />
                  <div className="flex flex-1 flex-col gap-1">
                    <Label htmlFor={fieldId} className="leading-snug">
                      {labelText}
                    </Label>
                    <span id={`${fieldId}-status`} className="text-xs text-muted-foreground">
                      {isChecked ? uiTranslations("status.complete") : uiTranslations("status.pending")}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeCompliance}>
            {uiTranslations("cancel")}
          </Button>
          <Button variant="gradient" onClick={handlePass} disabled={!canPass}>
            {uiTranslations("pass")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ComplianceModal;

