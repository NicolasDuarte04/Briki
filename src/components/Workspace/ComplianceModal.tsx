"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { complianceChecklistItems, complianceJurisdictions, type ComplianceJurisdiction } from "@/lib/compliance";
import { useUI } from "@/lib/ui/state";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ComplianceItemConfirmDialog } from "./ComplianceItemConfirmDialog";

export function ComplianceModal() {
  // Use individual selectors to avoid creating new objects on each render
  const complianceOpen = useUI((state) => state.complianceOpen);
  const complianceJurisdiction = useUI((state) => state.complianceJurisdiction);
  const setComplianceJurisdiction = useUI((state) => state.setComplianceJurisdiction);
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
  // ✅ Verificación de vigencia en fecha específica
  const checkVigencyDate = useUI((state) => state.checkVigencyDate);
  const setCheckVigencyDate = useUI((state) => state.setCheckVigencyDate);
  const lastVigencyCheck = useUI((state) => state.lastVigencyCheck);
  // ✅ FASE 1: Selector de póliza
  const policyAnalyses = useUI((state) => state.policyAnalyses);
  const selectedCompliancePolicyId = useUI((state) => state.selectedCompliancePolicyId);
  const setSelectedCompliancePolicyId = useUI((state) => state.setSelectedCompliancePolicyId);

  const uiTranslations = useTranslations("workspace.compliance");
  const jurisdictionTranslations = useTranslations("workspace.compliance.jurisdictions");

  const firstCheckboxRef = useRef<HTMLButtonElement | null>(null);
  
  // ✅ FASE 2: Estado para el diálogo de confirmación
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingToggleItem, setPendingToggleItem] = useState<string | null>(null);

  const jurisdictionItems = useMemo(
    () => complianceChecklistItems[complianceJurisdiction] ?? [],
    [complianceJurisdiction]
  );
  const jurisdictionChecked = checked[complianceJurisdiction] ?? {};

  // ✅ Deduplicate policyAnalyses to avoid React key conflicts
  const uniquePolicyAnalyses = useMemo(() => {
    const seen = new Set<string>();
    return policyAnalyses.filter((analysis) => {
      if (seen.has(analysis.id)) return false;
      seen.add(analysis.id);
      return true;
    });
  }, [policyAnalyses]);

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

  // ✅ FASE 2: Abrir diálogo de confirmación en lugar de toggle directo
  const handleToggleClick = useCallback(
    (itemId: string) => {
      setPendingToggleItem(itemId);
      setConfirmDialogOpen(true);
    },
    []
  );

  // ✅ FASE 2: Confirmar el toggle después del diálogo
  const handleConfirmToggle = useCallback(() => {
    if (pendingToggleItem) {
      const isChecked = Boolean(jurisdictionChecked[pendingToggleItem]);
      updateComplianceItem(pendingToggleItem, !isChecked);
    }
    setPendingToggleItem(null);
  }, [pendingToggleItem, jurisdictionChecked, updateComplianceItem]);

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
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{uiTranslations("title")}</DialogTitle>
          <DialogDescription>{modalDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 flex-1 overflow-y-auto pr-2">
          {/* ✅ Jurisdiction Selector */}
          <section className="space-y-3 rounded-lg border p-3 bg-muted/40">
            <Label className="font-semibold">Jurisdicción</Label>
            <Select
              value={complianceJurisdiction}
              onValueChange={(value) => setComplianceJurisdiction(value as ComplianceJurisdiction)}
              disabled={complianceLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar jurisdicción..." />
              </SelectTrigger>
              <SelectContent>
                {complianceJurisdictions.map((jurisdiction) => (
                  <SelectItem key={jurisdiction} value={jurisdiction}>
                    {jurisdictionTranslations(`${jurisdiction}.title`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {/* ✅ FASE 1: Policy Selector */}
          {uniquePolicyAnalyses.length > 0 && (
            <section className="space-y-3 rounded-lg border p-3 bg-muted/40">
              <Label className="font-semibold">Póliza a Validar</Label>
              <Select
                value={selectedCompliancePolicyId || ""}
                onValueChange={(value) => setSelectedCompliancePolicyId(value || null)}
                disabled={complianceLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar póliza..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {uniquePolicyAnalyses.map((analysis) => {
                    const data = analysis.extractedData as Record<string, any>;
                    const policyNumber = data?.policy_number || data?.policyNumber || data?.numeroPoliza || 'Sin número';
                    const insurerName = data?.insurer_name || data?.insurerName || data?.aseguradora || 'Aseguradora';
                    const fileName = analysis.artifact?.fileName || 'PDF';
                    return (
                      <SelectItem key={analysis.id} value={analysis.id} className="max-w-full">
                        <span className="flex items-center gap-2 max-w-[350px]">
                          <span className="font-medium truncate max-w-[100px]">{policyNumber}</span>
                          <span className="text-muted-foreground truncate max-w-[120px]">- {insurerName}</span>
                          <span className="text-xs text-muted-foreground/60 truncate max-w-[100px]">({fileName})</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {!selectedCompliancePolicyId && (
                <p className="text-xs text-muted-foreground">
                  Seleccione una póliza para cargar automáticamente las fechas de vigencia.
                </p>
              )}
            </section>
          )}

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
                  validateComplianceDates(complianceStartDate, complianceEndDate, checkVigencyDate);
                } else {
                  toast.error("Seleccione ambas fechas");
                }
              }}
              disabled={complianceLoading}
            >
              Validar Vigencia
            </Button>

            {/* ✅ Verificación de vigencia en fecha específica */}
            <div className="mt-3 pt-3 border-t space-y-2">
              <Label className="text-xs text-muted-foreground">Verificar si la póliza está activa en fecha:</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={checkVigencyDate || ''}
                  onChange={(e) => setCheckVigencyDate(e.target.value || undefined)}
                  className="h-8 text-xs flex-1"
                  placeholder="Fecha a verificar"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCheckVigencyDate(new Date().toISOString().split('T')[0])}
                  className="text-xs"
                >
                  Hoy
                </Button>
              </div>
              {checkVigencyDate && (
                <p className="text-xs text-muted-foreground">
                  La validación verificará si la póliza estaba/está activa el {new Date(checkVigencyDate).toLocaleDateString('es-CO')}.
                </p>
              )}
            </div>

            {/* ✅ Mostrar resultado de verificación de vigencia */}
            {lastVigencyCheck && (
              <div className={`mt-3 p-3 rounded-md text-sm ${
                lastVigencyCheck.isActive 
                  ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200'
                  : 'bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {lastVigencyCheck.isActive ? '✅ Vigente' : '⚠️ No vigente'}
                  </span>
                  {lastVigencyCheck.daysRemaining !== null && lastVigencyCheck.daysRemaining !== undefined && (
                    <Badge variant={lastVigencyCheck.daysRemaining > 30 ? 'default' : 'destructive'}>
                      {lastVigencyCheck.daysRemaining > 0 
                        ? `${lastVigencyCheck.daysRemaining} días restantes`
                        : `Venció hace ${Math.abs(lastVigencyCheck.daysRemaining)} días`}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs opacity-80">{lastVigencyCheck.message}</p>
              </div>
            )}
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
                      onCheckedChange={() => handleToggleClick(itemId)}
                      disabled={complianceLoading}
                      aria-describedby={`${fieldId}-status`}
                      aria-checked={isChecked}
                    />
                    <div className="flex flex-1 flex-col gap-1">
                      <Label htmlFor={fieldId} className="leading-snug cursor-pointer" onClick={() => handleToggleClick(itemId)}>
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

      {/* ✅ FASE 2: Diálogo de confirmación con contexto legal */}
      {pendingToggleItem && (
        <ComplianceItemConfirmDialog
          open={confirmDialogOpen}
          onOpenChange={(open) => {
            setConfirmDialogOpen(open);
            if (!open) setPendingToggleItem(null);
          }}
          itemId={pendingToggleItem}
          jurisdiction={complianceJurisdiction}
          itemLabel={
            jurisdictionItemLabels[pendingToggleItem] ?? 
            jurisdictionTranslations(`${complianceJurisdiction}.items.${pendingToggleItem}`)
          }
          isCurrentlyChecked={Boolean(jurisdictionChecked[pendingToggleItem])}
          onConfirm={handleConfirmToggle}
          loading={complianceLoading}
        />
      )}
    </Dialog>
  );
}

export default ComplianceModal;

