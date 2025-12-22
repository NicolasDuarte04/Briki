"use client";

import React, { useId } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Edit3, RotateCcw } from "lucide-react";
import { useUI } from "@/lib/ui/state";
import MarkdownContent from "@/components/Chat/MarkdownContent";

export interface MessageAgentProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  roleLabel?: string;
  tagLabel?: string;
  timestamp?: string;
  /** Contenido como ReactNode (tradicional) */
  body?: React.ReactNode;
  /** Contenido como string para renderizar con Markdown (alternativa a body) */
  stringContent?: string;
  onApprove?: () => void;
  onEdit?: () => void;
  onRerun?: () => void;
  /** Callback cuando el usuario hace clic en una referencia a PDF */
  onPdfReferenceClick?: (field: string, page: number, analysisId?: string) => void;
}

export const MessageAgent: React.FC<MessageAgentProps> = ({
  title,
  roleLabel,
  tagLabel,
  timestamp,
  body,
  stringContent,
  onApprove,
  onEdit,
  onRerun,
  onPdfReferenceClick,
  className,
  ...rest
}) => {
  const t = useTranslations("chat.agent");

  // ✅ CORRECCIÓN: Usar selectores individuales para evitar loops infinitos (sin useShallow)
  const caseApproving = useUI((state) => state.caseApproving);
  const caseApproved = useUI((state) => state.caseApproved);
  const caseResolvingClient = useUI((state) => state.caseResolvingClient);
  const isBriefValid = useUI((state) => state.isBriefValid);
  const shouldShowApprovalButtons = useUI((state) => state.shouldShowApprovalButtons);
  const areApprovalButtonsEnabled = useUI((state) => state.areApprovalButtonsEnabled);
  const approvalPhase = useUI((state) => state.approvalPhase);
  const headerId = useId();
  const isoTimestamp = React.useMemo(() => {
    if (!timestamp) return undefined;
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }, [timestamp]);

  return (
    <Card
      role="article"
      aria-labelledby={headerId}
      tabIndex={0}
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-background/95 shadow-[0_18px_42px_-24px_rgba(15,23,42,0.35)] py-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_[data-slot=card-header]]:px-5 [&_[data-slot=card-content]]:px-5 [&_[data-slot=card-footer]]:px-5 [&_[data-slot=card-header]]:gap-1.5 gap-0",
        className
      )}
      {...rest}
    >
      <CardHeader
        id={headerId}
        className="grid grid-cols-1 items-start gap-1.5 pb-3 pt-4 sm:grid-cols-[1fr_auto] sm:gap-2"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <CardTitle className="truncate text-sm font-semibold text-foreground">
              {title || t("name")}
            </CardTitle>
            {tagLabel ? (
              <Badge
                variant="outline"
                className="rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-[11px] font-semibold text-foreground/80"
              >
                {tagLabel}
              </Badge>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs">
            <CardDescription className="text-muted-foreground">
              {roleLabel || t("role")}
            </CardDescription>
          </div>
        </div>
        <CardAction className="col-start-1 row-start-2 justify-self-end text-xs text-muted-foreground/70 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:justify-self-end sm:text-right">
          {timestamp ? (
            <time
              className="text-[11px] leading-none text-muted-foreground/70"
              dateTime={isoTimestamp || timestamp}
              aria-label={t("timestampAria", { value: timestamp })}
            >
              {timestamp}
            </time>
          ) : null}
        </CardAction>
      </CardHeader>

      <CardContent className="px-5 pb-4 pt-0">
        <div className="text-sm leading-relaxed text-foreground/90">
          {/* Si hay stringContent, usar MarkdownContent para renderizado enriquecido */}
          {stringContent ? (
            <MarkdownContent 
              content={stringContent} 
              {...(onPdfReferenceClick ? { onPdfReferenceClick } : {})}
            />
          ) : (
            body
          )}
        </div>
      </CardContent>

      <CardFooter className="justify-end gap-3 border-t border-border/70 px-5 pb-4 pt-3">
        {/* ✅ CORRECCIÓN: Solo mostrar el botón "Aprobar" si el caso NO ha sido aprobado Y onApprove está definido */}
        {/* ❌ ELIMINADO: Botones "Editar" y "Reejecutar" no tienen sentido en mensajes del agente */}
        {/* ✅ CORRECCIÓN: Usar helpers globales unificados */}
        {shouldShowApprovalButtons() && onApprove && (
          <div className="flex w-full flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant="default"
              size="sm"
              aria-label={t("actions.approve.aria")}
              onClick={onApprove}
              disabled={!areApprovalButtonsEnabled() || caseResolvingClient}
              className="w-full sm:w-auto"
            >
              {caseResolvingClient ? 'Validando cliente...' : approvalPhase === 'processing' ? 'Aprobando...' : t("actions.approve.label")}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default MessageAgent;


