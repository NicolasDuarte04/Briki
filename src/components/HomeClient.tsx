"use client";

import { useEffect, useRef } from "react";
import Canvas from "@/components/Canvas";
import Hotkeys from "@/components/Hotkeys";
import Landing from "@/components/Landing";
import FooterNav from "@/components/FooterNav";
import { useUI, type UIStep } from "@/lib/ui/state";
import { motion, AnimatePresence } from "framer-motion";
import BrikiSidebarLayout from "@/components/BrikiSidebarLayout";
import WorkspaceTabs from "@/components/Workspace/Tabs";
import CaseBrief from "@/components/Workspace/CaseBrief";
import SourcingProgressWidget from "@/components/Sourcing/SourcingProgressWidget";
import HotkeysGuide from "@/components/HotkeysGuide";
import dynamic from "next/dynamic";
import { ComplianceGate } from "@/components/Workspace/ComplianceGate";
import BrikiLandingNavbar from "@/components/BrikiLandingNavbar";
import { useRouter, usePathname } from "next/navigation";
import { useChatStore } from "@/store/useChatStore";

const BrikiChat = dynamic(() => import("@/components/Chat/BrikiChat").then(mod => ({ default: mod.BrikiChat })), { ssr: false });

interface HomeClientProps {
  initialStep: UIStep;
  conversationId?: string;
}

export default function HomeClient({ initialStep, conversationId }: HomeClientProps) {
  const initializedRef = useRef(false);
  const lastUrlUpdateRef = useRef<number>(0);
  const urlUpdateInProgressRef = useRef(false);
  const conversationCreatedRef = useRef(false);
  const { step, rightOpen, toggleRight, primaryAction, setStep, isSourcing, stopSourcing } = useUI();
  const currentStep = initializedRef.current ? step : initialStep;
  const router = useRouter();
  const pathname = usePathname();
  const { activeConversationId, conversations, createConversation, setActiveConversation } = useChatStore();

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    // Only set the step once on mount, without reading step from state
    if (initialStep) {
      setStep(initialStep);
    }

    initializedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStep, setStep]);

  // Consolidated URL synchronization effect with loop prevention
  useEffect(() => {
    // Only handle conversation routing in conversation mode
    if (currentStep !== "conversation" && currentStep !== "compliance") {
      return;
    }

    // Prevent rapid URL updates (more than one per 100ms)
    const now = Date.now();
    if (now - lastUrlUpdateRef.current < 100) {
      return;
    }

    // Prevent concurrent URL updates
    if (urlUpdateInProgressRef.current) {
      return;
    }

    const updateUrl = (path: string, replace: boolean = true) => {
      urlUpdateInProgressRef.current = true;
      lastUrlUpdateRef.current = Date.now();
      
      if (replace) {
        router.replace(path);
      } else {
        router.push(path);
      }
      
      // Reset flag after navigation
      setTimeout(() => {
        urlUpdateInProgressRef.current = false;
      }, 150);
    };

    // Handle initial mount or URL param changes
    if (conversationId) {
      // Check if the conversation exists
      const exists = conversations.some((c) => c.id === conversationId);
      
      if (exists) {
        // Set it as active if it's not already
        if (activeConversationId !== conversationId) {
          setActiveConversation(conversationId);
        }
      } else if (!urlUpdateInProgressRef.current) {
        // Conversation doesn't exist, create a new one
        const newId = createConversation();
        updateUrl(`/chat/${newId}`);
      }
    } else if (!conversationId && activeConversationId) {
      // We have an active conversation but no URL param, update URL
      const expectedPath = `/chat/${activeConversationId}`;
      if (!pathname.endsWith(expectedPath) && !urlUpdateInProgressRef.current) {
        updateUrl(expectedPath);
      }
    } else if (!conversationId && !activeConversationId && conversations.length === 0 && !urlUpdateInProgressRef.current && !conversationCreatedRef.current) {
      // No conversation at all AND no conversations exist, create one
      // Add check to prevent creating multiple conversations
      conversationCreatedRef.current = true;
      const newId = createConversation();
      updateUrl(`/chat/${newId}`);
    }
  }, [conversationId, activeConversationId, conversations.length, createConversation, setActiveConversation, router, pathname, currentStep]);

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
              <BrikiSidebarLayout>
                <Canvas
                  rightOpen={rightOpen}
                  isSourcing={isSourcing}
                  left={
                    // CHAT STAYS IN CENTER: BrikiChat renders in Canvas left panel, NOT in sidebar rail
                    currentStep === "conversation" || currentStep === "compliance" ? (
                      <BrikiChat mode="agent" />
                    ) : (
                      <div className="flex h-full flex-col justify-start">Current step: {currentStep}</div>
                    )
                  }
                  right={(() => {
                    if (currentStep === "conversation") {
                      return isSourcing ? (
                        <div className="flex h-full min-h-0 flex-col gap-4 px-4 md:px-6 py-6">
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
                        <div className="flex h-full flex-col px-4 md:px-6 py-6">
                          <ComplianceGate />
                        </div>
                      );
                    }

                    return <div className="flex h-full flex-col px-4 md:px-6 py-6">Workspace for step: {currentStep}</div>;
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
