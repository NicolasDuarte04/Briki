"use client";

import { useCallback, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, AlertTriangle, ExternalLink, CheckCircle2 } from "lucide-react";
import {
  getComplianceItemContext,
  getCriticalityColor,
  getCriticalityLabel,
  type ComplianceItemMeta,
} from "@/lib/complianceContext";

interface ComplianceItemConfirmDialogProps {
  /** Si el diálogo está abierto */
  open: boolean;
  /** Callback para cerrar el diálogo */
  onOpenChange: (open: boolean) => void;
  /** ID del item (ej: 'co_item_kyc') */
  itemId: string;
  /** Jurisdicción (ej: 'co') */
  jurisdiction: string;
  /** Label del item para mostrar */
  itemLabel: string;
  /** Si el item actualmente está marcado */
  isCurrentlyChecked: boolean;
  /** Callback cuando se confirma la acción */
  onConfirm: () => void;
  /** Si está cargando */
  loading?: boolean;
}

export function ComplianceItemConfirmDialog({
  open,
  onOpenChange,
  itemId,
  jurisdiction,
  itemLabel,
  isCurrentlyChecked,
  onConfirm,
  loading = false,
}: ComplianceItemConfirmDialogProps) {
  const context = useMemo(
    () => getComplianceItemContext(jurisdiction, itemId),
    [jurisdiction, itemId]
  );

  const handleConfirm = useCallback(() => {
    onConfirm();
    onOpenChange(false);
  }, [onConfirm, onOpenChange]);

  // Si no hay contexto, usar valores por defecto
  const meta: ComplianceItemMeta = context ?? {
    description: `Confirmar el cumplimiento de: ${itemLabel}`,
    criticality: 'medium',
  };

  const action = isCurrentlyChecked ? 'desmarcar' : 'marcar como completado';
  const criticalityVariant = getCriticalityColor(meta.criticality) as 'destructive' | 'secondary' | 'outline';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertDialogTitle className="flex-1">{itemLabel}</AlertDialogTitle>
            <Badge variant={criticalityVariant}>
              {getCriticalityLabel(meta.criticality)}
            </Badge>
          </div>
          <AlertDialogDescription className="text-left">
            ¿Está seguro de {action} este requisito?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-4">
            {/* Descripción */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Descripción</p>
              <p className="text-sm text-muted-foreground">{meta.description}</p>
            </div>

            {/* Referencia Legal */}
            {meta.legalReference && (
              <>
                <div className="h-px bg-border" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Referencia Legal
                  </p>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md font-mono text-xs">
                    {meta.legalReference}
                  </p>
                </div>
              </>
            )}

            {/* Documentos Requeridos */}
            {meta.requiredDocs && meta.requiredDocs.length > 0 && (
              <>
                <div className="h-px bg-border" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Documentos Típicamente Requeridos
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {meta.requiredDocs.map((doc, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                        {doc}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Consecuencias */}
            {meta.consequences && (
              <>
                <div className="h-px bg-border" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Consecuencias de Incumplimiento
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md">
                    {meta.consequences}
                  </p>
                </div>
              </>
            )}

            {/* Link Externo */}
            {meta.externalLink && (
              <>
                <div className="h-px bg-border" />
                <a
                  href={meta.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  Ver documentación externa
                  <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </div>
        </ScrollArea>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={isCurrentlyChecked ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {loading ? "Guardando..." : isCurrentlyChecked ? "Desmarcar" : "Confirmar Cumplimiento"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ComplianceItemConfirmDialog;
