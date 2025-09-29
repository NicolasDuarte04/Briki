"use client";

import { useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import ComplianceModal from "./ComplianceModal";
import { useUI, type ProposalData } from "@/lib/ui/state";
import { toast } from "sonner";

import { sendViaEmail, sendViaWhatsApp } from "@/lib/share";
import { type ShareChannel, type SharePayload } from "@/lib/types";

export function ComplianceGate() {
  const [sendingChannel, setSendingChannel] = useState<ShareChannel | null>(null);

  // Use individual selectors to avoid creating new objects on each render
  const complianceJurisdiction = useUI((state) => state.complianceJurisdiction);
  const isCompliancePassed = useUI((state) => state.isCompliancePassed);
  const openCompliance = useUI((state) => state.openCompliance);
  const closeCompliance = useUI((state) => state.closeCompliance);
  const logComplianceSendAttempt = useUI((state) => state.logComplianceSendAttempt);
  const logComplianceSendBlocked = useUI((state) => state.logComplianceSendBlocked);
  const logComplianceSendSuccess = useUI((state) => state.logComplianceSendSuccess);
  const getProposalData = useUI((state) => state.getProposalData);

  const passed = useMemo(() => isCompliancePassed(complianceJurisdiction), [complianceJurisdiction, isCompliancePassed]);

  const gateTranslations = useTranslations("workspace.compliance.gate");
  const jurisdictionTranslations = useTranslations("workspace.compliance.jurisdictions");
  const sendTranslations = useTranslations("workspace.send");
  const auditTranslations = useTranslations("workspace.audit");

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

      logComplianceSendAttempt({
        channel: payload.channel,
        jurisdiction: payload.jurisdiction,
      });
      toast.message(auditTranslations("attempt", { channel: channelLabel }));

      if (!passed) {
        logComplianceSendBlocked({
          channel: payload.channel,
          jurisdiction: payload.jurisdiction,
        });
        toast.error(sendTranslations("blockedToast"));
        toast.message(auditTranslations("blocked", { channel: channelLabel }));
        openCompliance(complianceJurisdiction);
        return;
      }

      try {
        setSendingChannel(channel);
        if (channel === "whatsapp") {
          await sendViaWhatsApp(payload);
        } else {
          await sendViaEmail(payload);
        }
        logComplianceSendSuccess({
          channel: payload.channel,
          jurisdiction: payload.jurisdiction,
        });
        closeCompliance();
        toast.success(sendTranslations("successToast"));
        toast.message(auditTranslations("success", { channel: channelLabel }));
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
      passed,
      sendTranslations,
    ]
  );

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
              disabled={isSending}
            >
              {gateTranslations("checklistCta")}
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
          </section>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <Button
              data-print="hide"
              variant="gradient"
              className="flex-1"
              disabled={!passed || isSending}
              aria-label={sendTranslations("whatsapp")}
              onClick={() => handleSend("whatsapp")}
            >
              {sendTranslations("whatsapp")}
            </Button>
            <Button
              data-print="hide"
              variant="outline"
              className="flex-1"
              disabled={!passed || isSending}
              aria-label={sendTranslations("email")}
              onClick={() => handleSend("email")}
            >
              {sendTranslations("email")}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <ComplianceModal />
    </div>
  );
}

export default ComplianceGate;

