"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
      <DialogContent className="p-0 shadow-lg overflow-hidden max-w-xl">
        <div style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: '0' }}>
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>Quickly jump to steps</DialogDescription>
        </div>
        <Command>
          <CommandInput placeholder="Go to step..." />
          <CommandList>
            <CommandEmpty>No steps found.</CommandEmpty>
            <CommandGroup heading="Steps">
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
                <CommandItem key={step} onSelect={() => handleSelect(step)}>
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


