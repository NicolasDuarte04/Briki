"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useUI, type UIStep } from "@/lib/ui/state";

const stepLabels: Record<UIStep, string> = {
  landing: "Landing",
  conversation: "Conversation",
  sourcing: "Sourcing",
  normalized: "Normalized",
  comparison: "Comparison",
  proposal: "Proposal",
  compliance: "Compliance",
  followups: "Follow-ups",
};

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const setStep = useUI((s) => s.setStep);

  React.useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }
    window.addEventListener("briki:cmdk", handleOpen as EventListener);
    return () => {
      window.removeEventListener("briki:cmdk", handleOpen as EventListener);
    };
  }, []);

  function handleSelect(step: UIStep) {
    setStep(step);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden max-w-xl rounded-2xl border-0 shadow-2xl">
        <VisuallyHidden asChild>
          <DialogTitle>Command palette</DialogTitle>
        </VisuallyHidden>
        <VisuallyHidden asChild>
          <DialogDescription>Quickly jump to steps</DialogDescription>
        </VisuallyHidden>
        <Command className="rounded-2xl border-0">
          <CommandInput placeholder="Go to step..." className="h-12 text-base" />
          <CommandList className="max-h-[400px] overflow-y-auto p-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400">
            <CommandEmpty>No steps found.</CommandEmpty>
            <CommandGroup heading="Steps" className="px-2 space-y-1">
              {(
                [
                  "landing",
                  "conversation",
                  "sourcing",
                  "normalized",
                  "comparison",
                  "proposal",
                  "compliance",
                  "followups",
                ] as UIStep[]
              ).map((step) => (
                <CommandItem 
                  key={step} 
                  onSelect={() => handleSelect(step)}
                  className="rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-md hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 dark:hover:from-cyan-950/30 dark:hover:to-blue-950/30 aria-selected:bg-gradient-to-r aria-selected:from-cyan-100 aria-selected:to-blue-100 dark:aria-selected:from-cyan-900/40 dark:aria-selected:to-blue-900/40"
                >
                  {stepLabels[step]}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export default CommandPalette;


