"use client";

import TopBar from "@/components/TopBar";
import Canvas from "@/components/Canvas";
import { Composer } from "@/components/Chat/Composer";
import { Message } from "@/components/Chat/Message";
import WorkspaceTabs from "@/components/Workspace/Tabs";
import CTAchips from "@/components/Common/CTAchips";
import { useUI } from "@/lib/ui/state";

export default function Home() {
  const { step, brief } = useUI();

  if (step === "landing") {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
          <div className="w-full max-w-2xl">
            <Composer />
          </div>
          <CTAchips />
        </div>
      </div>
    );
  }

  // Conversation stub
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Canvas
        left={
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto space-y-3 p-1">
              <Message role="user" content={brief.coverage ?? "New case"} />
              <Message
                role="system"
                content={
                  <div className="space-y-2">
                    <div className="font-medium">Intake Agent: case created</div>
                    <div className="text-muted-foreground text-xs">
                      Approve, edit, or re-run intake.
                    </div>
                    <div className="flex gap-2">
                      <button className="px-2 py-1 text-xs rounded-md bg-secondary">Approve</button>
                      <button className="px-2 py-1 text-xs rounded-md bg-secondary">Edit</button>
                      <button className="px-2 py-1 text-xs rounded-md bg-secondary">Re-run</button>
                    </div>
                  </div>
                }
              />
            </div>
            <Composer className="mt-auto" />
          </div>
        }
        right={<WorkspaceTabs />}
      />
    </div>
  );
}
