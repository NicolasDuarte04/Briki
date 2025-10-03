"use client";

import { useEffect, useRef } from "react";
import Canvas from "@/components/Canvas";
import Hotkeys from "@/components/Hotkeys";
import Landing from "@/components/Landing";
import FooterNav from "@/components/FooterNav";
import { useUI, type UIStep } from "@/lib/ui/state";
import { motion, AnimatePresence } from "framer-motion";
import BrikiSidebarLayout from "@/components/BrikiSidebarLayout";
import SidebarNav from "@/components/SidebarNav";
import WorkspaceTabs from "@/components/Workspace/Tabs";
import CaseBrief from "@/components/Workspace/CaseBrief";
import SourcingProgressWidget from "@/components/Sourcing/SourcingProgressWidget";
import HotkeysGuide from "@/components/HotkeysGuide";
import dynamic from "next/dynamic";
import { ComplianceGate } from "@/components/Workspace/ComplianceGate";
import BrikiLandingNavbar from "@/components/BrikiLandingNavbar";

const ConversationPane = dynamic(() => import("@/components/Chat/ConversationPane"), { ssr: false });

export default function HomeClient({ initialStep }: { initialStep: UIStep }) {
  const initializedRef = useRef(false);
  const { step, rightOpen, toggleRight, primaryAction, setStep, isSourcing, stopSourcing } = useUI();
  const currentStep = initializedRef.current ? step : initialStep;

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    if (initialStep && step !== initialStep) {
      setStep(initialStep);
    }

    initializedRef.current = true;
  }, [initialStep, setStep, step]);

  const steps: UIStep[] = [
    "landing",
    "conversation",
    "sourcing",
    "normalized",
    "comparison",
    "proposal",
    "compliance",
    "followups",
  ];

  return (
    <div className="h-dvh min-h-0 w-full flex flex-col overflow-hidden">
      <Hotkeys
        primaryAction={primaryAction}
        onToggleRightPanel={toggleRight}
        onSetStep={(index) => {
          const next = steps[index - 1];
          if (next) setStep(next);
        }}
      />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {currentStep === "landing" ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="landing-scroll relative flex-1 overflow-auto"
            >
              <Landing />
            </motion.div>
          ) : (
            <motion.div
              key="conversation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative z-10 flex flex-1 flex-col bg-background min-h-0 overflow-hidden"
            >
              <BrikiSidebarLayout sidebar={<SidebarNav />}>
                <Canvas
                  rightOpen={rightOpen}
                  isSourcing={isSourcing}
                  left={
                    currentStep === "conversation" || currentStep === "compliance" ? (
                      <ConversationPane />
                    ) : (
                      <div className="flex h-full flex-col justify-start">Current step: {currentStep}</div>
                    )
                  }
                  right={(() => {
                    if (currentStep === "conversation") {
                      return isSourcing ? (
                        <div className="flex h-full min-h-0 flex-col gap-4">
                          <SourcingProgressWidget compact onStop={stopSourcing} />
                          <div className="flex flex-1 min-h-0 flex-col">
                            <CaseBrief />
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full flex-col">
                          <WorkspaceTabs />
                        </div>
                      );
                    }

                    if (currentStep === "compliance") {
                      return (
                        <div className="flex h-full flex-col">
                          <ComplianceGate />
                        </div>
                      );
                    }

                    return <div className="flex h-full flex-col">Workspace for step: {currentStep}</div>;
                  })()}
                />
              </BrikiSidebarLayout>
              <FooterNav className="mt-4" fullBleed />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-4 left-4 z-50">
        <HotkeysGuide />
      </div>
    </div>
  );
}
