"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import HomeClient from "@/components/HomeClient";
import { useUI } from "@/lib/ui/state";
import { pathForAgent, type Locale } from "@/lib/routes/workspace";

export const dynamic = 'force-dynamic';

/**
 * Agent Thread Deep Link Page
 * 
 * This page enables deep linking to specific agent threads/cases.
 * It renders the same HomeClient component as /agent but automatically
 * selects and opens the thread specified in the URL parameter.
 * 
 * Route: /[locale]/agent/[threadId]
 * 
 * Features:
 * - Automatically selects the thread from [threadId] param
 * - Sets the UI to conversation step
 * - Validates thread exists before selecting
 * - Redirects to /agent if thread is invalid
 * 
 * The component uses the global UI state (useUI) to set the active case,
 * which triggers the conversation view to load that specific thread.
 */
export default function AgentThreadPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale() as Locale;
  const threadId = params?.threadId as string | undefined;
  const { setCurrentCaseId, setStep, cases, fetchCases } = useUI();

  useEffect(() => {
    // Fetch cases if not already loaded
    fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    if (!threadId) {
      // No threadId provided, redirect to base agent page
      router.replace(pathForAgent(locale));
      return;
    }

    // Validate that the thread exists in our cases
    // This prevents selecting non-existent threads
    if (cases.length > 0) {
      const threadExists = cases.some(c => c.id === threadId);
      
      if (!threadExists) {
        console.warn(`Thread ${threadId} not found, redirecting to /agent`);
        router.replace(pathForAgent(locale));
        return;
      }
    }

    // Set the current case ID to select this thread
    setCurrentCaseId(threadId);
    
    // Navigate to conversation step to show the thread
    setStep('conversation');
  }, [threadId, cases, setCurrentCaseId, setStep, router, locale]);

  // Render the same HomeClient component as the base agent page
  // The selected thread will be automatically loaded based on currentCaseId
  return <HomeClient initialStep="conversation" />;
}

