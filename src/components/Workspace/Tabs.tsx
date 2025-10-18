"use client";

import { useCallback, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { useUI } from "@/lib/ui/state";
import { ComplianceGate } from "./ComplianceGate";
import CaseBrief from "./CaseBrief";
import CaseBriefForm from "./CaseBriefForm";
import { CaseSummary } from "./CaseSummary";
import Policies from "./Policies";
import Comparison from "./Comparison";
import Proposal from "./Proposal";
import Renewals from "./Renewals";

export type WorkspaceTab = "case-brief" | "policies" | "comparisons" | "proposal" | "compliance" | "renewals";

export function WorkspaceTabs() {
  const t = useTranslations("workspace.tabs");
  const { caseApproved, brief, setCaseApproved } = useUI();
  const tabLabels = useMemo(() => ({
      "case-brief": t("caseBrief"),
      policies: t("policies"),
      comparisons: t("comparisons"),
      proposal: t("proposal"),
      compliance: t("compliance"),
      renewals: t("renewals"),
    } satisfies Record<WorkspaceTab, string>), [t]);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("case-brief");
  const logRenewalsEvent = useUI((state) => state.logRenewalsEvent);

  // Función para volver al modo de edición (resetea el estado de aprobación)
  const handleEditBrief = () => {
    setCaseApproved(false);
  };

  const handleTabChange = useCallback((value: string) => {
    const nextTab = value as WorkspaceTab;
    setActiveTab(nextTab);
    if (nextTab === "renewals") {
      logRenewalsEvent("RenewalsViewOpen");
    }
  }, [logRenewalsEvent]);

  return (
    <div className="w-full h-full flex flex-col">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex h-full min-h-0 flex-col"
      >
        <div className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
          <TabsList className="w-full justify-start gap-2" role="tablist" aria-label={t("ariaLabel")}>
            {(Object.keys(tabLabels) as WorkspaceTab[]).map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {tabLabels[tab]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div className="flex-1 overflow-y-auto px-6 md:px-8">
          <TabsContent value="case-brief" className="py-6 h-full">
            {caseApproved ? (
              <CaseSummary brief={brief} onEdit={handleEditBrief} />
            ) : (
              <CaseBriefForm />
            )}
          </TabsContent>
          <TabsContent value="policies" className="py-6">
            <Policies />
          </TabsContent>
          <TabsContent value="comparisons" className="py-6">
            <Comparison />
          </TabsContent>
          <TabsContent value="proposal" className="py-6">
            <Proposal />
          </TabsContent>
          <TabsContent value="compliance" className="py-6">
            <ComplianceGate />
          </TabsContent>
          <TabsContent value="renewals" className="py-6">
            <Renewals />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default WorkspaceTabs;


