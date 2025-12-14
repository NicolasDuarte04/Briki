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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { complianceChecklistItems } from "@/lib/compliance";
import { useUI } from "@/lib/ui/state";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function ComplianceModal() {
  // Use individual selectors to avoid creating new objects on each render
  const complianceOpen = useUI((state) => state.complianceOpen);
  const complianceJurisdiction = useUI((state) => state.complianceJurisdiction);
  const checked = useUI((state) => state.checked);
  const closeCompliance = useUI((state) => state.closeCompliance);
  // ✅ FASE 32: Use persistent action
  const updateComplianceItem = useUI((state) => state.updateComplianceItem);
  const passCompliance = useUI((state) => state.passCompliance);
  const isCompliancePassed = useUI((state) => state.isCompliancePassed);
  const complianceLoading = useUI((state) => state.complianceLoading);
  const verifyKyc = useUI((state) => state.verifyKyc);
  const complianceKycStatus = useUI((state) => state.complianceKycStatus);
  // ✅ FASE 38: Controlled inputs for dates
  const complianceStartDate = useUI((state) => state.complianceStartDate);
  const complianceEndDate = useUI((state) => state.complianceEndDate);
  const validateComplianceDates = useUI((state) => state.validateComplianceDates);

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
      const isChecked = Boolean(jurisdictionChecked[itemId]);
      updateComplianceItem(itemId, !isChecked);
    },
    [updateComplianceItem, jurisdictionChecked]
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

        <div className="space-y-6">
          {/* Validity Dates Section */}
          <section className="space-y-3 rounded-lg border p-3 bg-muted/40">
            <Label className="font-semibold">Vigencia de Póliza</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Inicio</Label>
                <Input
                  type="date"
                  value={complianceStartDate || ''}
                  onChange={(e) => useUI.setState({ complianceStartDate: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fin</Label>
                <Input
                  type="date"
                  value={complianceEndDate || ''}
                  onChange={(e) => useUI.setState({ complianceEndDate: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => {
                if (complianceStartDate && complianceEndDate) {
                  validateComplianceDates(complianceStartDate, complianceEndDate);
                } else {
                  toast.error("Seleccione ambas fechas");
                }
              }}
              disabled={complianceLoading}
            >
              Validar Vigencia
            </Button>
          </section>

          {/* KYC Section */}
          <section className="space-y-3 rounded-lg border p-3 bg-muted/40">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Verificación KYC</Label>
              <Badge variant={complianceKycStatus === 'verified' ? 'default' : 'secondary'}>
                {complianceKycStatus === 'verified' ? 'Verificado' : 'Pendiente'}
              </Badge>
            </div>
            {complianceKycStatus !== 'verified' && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() => verifyKyc()}
                disabled={complianceLoading}
              >
                Verificar Identidad (Simulado)
              </Button>
            )}
          </section>

          {/* Checklist Section */}
          <section className="space-y-4">
            <p className="text-sm font-semibold text-foreground">{jurisdictionTitle} - Requisitos</p>
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
                      disabled={complianceLoading}
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
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeCompliance} disabled={complianceLoading}>
            {uiTranslations("cancel")}
          </Button>
          <Button variant="gradient" onClick={handlePass} disabled={!canPass || complianceLoading}>
            {uiTranslations("pass")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ComplianceModal;

