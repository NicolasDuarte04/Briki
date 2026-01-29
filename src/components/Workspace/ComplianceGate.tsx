"use client";

import { useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useUI } from "@/lib/ui/state";
import { toast } from "sonner";

import { sendViaEmail, sendViaWhatsApp } from "@/lib/share";
import {
  type AuditEntry,
  type Case,
  type Playbook,
  type ShareChannel,
  type SharePayload,
  type AuditEventType,
  type JurisdictionCode,
} from "@/lib/types";

const SHARE_AUDIT_EVENT_TYPES = {
  attempt: "SendAttempt",
  blocked: "SendBlocked",
  success: "SendSuccess",
} as const satisfies Record<
  "attempt" | "blocked" | "success",
  Extract<AuditEventType, "SendAttempt" | "SendBlocked" | "SendSuccess">
>;

type ShareAuditEventKey = keyof typeof SHARE_AUDIT_EVENT_TYPES;
type ShareAuditEventType = (typeof SHARE_AUDIT_EVENT_TYPES)[ShareAuditEventKey];

const SHARE_AUDIT_MESSAGE_KEYS: Record<ShareAuditEventType, ShareAuditEventKey> = {
  [SHARE_AUDIT_EVENT_TYPES.attempt]: "attempt",
  [SHARE_AUDIT_EVENT_TYPES.blocked]: "blocked",
  [SHARE_AUDIT_EVENT_TYPES.success]: "success",
} as const;

type ShareAuditPayload = NonNullable<AuditEntry["payload"]> & {
  channel: ShareChannel;
  jurisdiction: JurisdictionCode;
  caseId: Case["id"];
  playbookType: Playbook["type"];
};

export function ComplianceGate() {
  const [sendingChannel, setSendingChannel] = useState<ShareChannel | null>(null);

  // ✅ CRÍTICO: TODOS los hooks deben llamarse ANTES de cualquier return condicional
  // Mover useTranslations ANTES del early return para evitar error de React Hooks
  const gateTranslations = useTranslations("workspace.compliance.gate");
  const jurisdictionTranslations = useTranslations("workspace.compliance.jurisdictions");
  const sendTranslations = useTranslations("workspace.send");
  const auditTranslations = useTranslations("workspace.audit");

  // Use individual selectors to avoid creating new objects on each render
  const complianceJurisdiction = useUI((state) => state.complianceJurisdiction);
  const isCompliancePassed = useUI((state) => state.isCompliancePassed);
  const openCompliance = useUI((state) => state.openCompliance);
  const closeCompliance = useUI((state) => state.closeCompliance);
  const logComplianceSendAttempt = useUI((state) => state.logComplianceSendAttempt);
  const logComplianceSendBlocked = useUI((state) => state.logComplianceSendBlocked);
  const logComplianceSendSuccess = useUI((state) => state.logComplianceSendSuccess);
  const comparisonPlaybook = useUI((state) => state.comparisonPlaybook);
  const getProposalData = useUI((state) => state.getProposalData);
  // ✅ FASE 32: Loading State
  const complianceLoading = useUI((state) => state.complianceLoading);

  const passed = useMemo(() => isCompliancePassed(complianceJurisdiction), [complianceJurisdiction, isCompliancePassed]);

  const jurisdictionLabel = useMemo(
    () => jurisdictionTranslations(`${complianceJurisdiction}.title`),
    [complianceJurisdiction, jurisdictionTranslations]
  );

  const isSending = sendingChannel !== null;

  const handleSend = useCallback(
    async (channel: ShareChannel) => {
      if (isSending) return;

      const proposalData = getProposalData();
      const payload: SharePayload = {
        channel,
        jurisdiction: complianceJurisdiction,
        proposal: {
          id: "demo-proposal",
          caseId: "demo-case",
          broker: proposalData.broker,
          brief: proposalData.brief,
          selectedPlans: proposalData.selectedPlans,
          disclosuresKeys: proposalData.disclosuresKeys,
          mathCheck: proposalData.mathCheck,
          shareUrl: proposalData.shareUrl,
          generatedOn: proposalData.generatedOn ?? new Date().toISOString(),
        },
      };

      const channelLabel = sendTranslations(channel);
      const shareAuditPayload: ShareAuditPayload = {
        channel: payload.channel,
        jurisdiction: complianceJurisdiction,
        caseId: payload.proposal.caseId,
        playbookType: comparisonPlaybook,
      };
      const showAuditMessage = (event: ShareAuditEventType) => {
        toast.message(auditTranslations(SHARE_AUDIT_MESSAGE_KEYS[event], { channel: channelLabel }));
      };

      logComplianceSendAttempt(shareAuditPayload);
      showAuditMessage(SHARE_AUDIT_EVENT_TYPES.attempt);

      if (!passed) {
        logComplianceSendBlocked(shareAuditPayload);
        toast.error(sendTranslations("blockedToast"));
        showAuditMessage(SHARE_AUDIT_EVENT_TYPES.blocked);
        openCompliance(complianceJurisdiction);
        return;
      }

      try {
        setSendingChannel(channel);
        await executeShare(channel, payload);
        logComplianceSendSuccess(shareAuditPayload);
        closeCompliance();
        toast.success(sendTranslations("successToast"));
        showAuditMessage(SHARE_AUDIT_EVENT_TYPES.success);
      } finally {
        setSendingChannel(null);
      }
    },
    [
      auditTranslations,
      closeCompliance,
      complianceJurisdiction,
      getProposalData,
      isSending,
      logComplianceSendAttempt,
      logComplianceSendBlocked,
      logComplianceSendSuccess,
      openCompliance,
      comparisonPlaybook,
      passed,
      sendTranslations,
    ]
  );

  // ✅ Early return DESPUÉS de todos los hooks
  if (complianceLoading) {
    return (
      <Card className="h-fit animate-pulse border-muted">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
          <span className="text-sm">{gateTranslations("checkingCompliance")}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground/90">
            {gateTranslations("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
              {gateTranslations("jurisdictionLabel")}
            </p>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold">
              {jurisdictionLabel}
            </Badge>
          </section>

          <section className="space-y-3">
            <p className="text-sm text-muted-foreground/75">{gateTranslations("blockedBody")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openCompliance(complianceJurisdiction)}
              disabled={isSending || complianceLoading}
            >
              {gateTranslations("checklistCta")}
            </Button>
            {/* Download Report Button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start px-0 text-xs text-muted-foreground hover:text-foreground"
              disabled={complianceLoading}
              onClick={async () => {
                try {
                  // Necesitamos el caseId. Lo tomamos del store si es posible, o asumimos que el componente lo tiene.
                  // ComplianceGate usa useUI, podemos sacar currentCaseId de ahi.
                  // Pero wait, openCompliance no recibe caseId. 
                  // Vamos a usar window.open para descargar directamente por ahora.
                  const caseId = useUI.getState().currentCaseId;
                  if (!caseId) return;
                  window.open(`/api/compliance/report/${caseId}`, '_blank');
                } catch (err) {
                  toast.error(gateTranslations("downloadError"));
                }
              }}
            >
              📄 Descargar Informe de Cumplimiento
            </Button>
          </section>

          <section className="space-y-2 text-sm">
            <p className="font-semibold text-foreground/85">{gateTranslations("blockedTitle")}</p>
            <p className="text-muted-foreground/70">
              {passed
                ? gateTranslations.rich("readyHint", {
                  strong: (chunk) => <span className="font-semibold text-foreground/85">{chunk}</span>,
                })
                : gateTranslations("blockedBody")}
            </p>
            {complianceLoading && (
              <p className="text-xs text-muted-foreground animate-pulse">Sincronizando estado...</p>
            )}
          </section>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <Button
              data-print="hide"
              variant="gradient"
              className="flex-1"
              disabled={!passed || isSending || complianceLoading}
              aria-label={sendTranslations("whatsapp")}
              onClick={() => handleSend("whatsapp")}
            >
              {sendTranslations("whatsapp")}
            </Button>
            <Button
              data-print="hide"
              variant="outline"
              className="flex-1"
              disabled={!passed || isSending || complianceLoading}
              aria-label={sendTranslations("email")}
              onClick={() => handleSend("email")}
            >
              {sendTranslations("email")}
            </Button>
          </div>
        </CardFooter>
      </Card>


    </div>
  );
}

async function executeShare(channel: ShareChannel, payload: SharePayload) {
  switch (channel) {
    case "whatsapp":
      return sendViaWhatsApp(payload);
    case "email":
      return sendViaEmail(payload);
    default:
      return assertUnreachable(channel);
  }
}

function assertUnreachable(value: never): never {
  throw new Error(`Unhandled share channel: ${value as string}`);
}

