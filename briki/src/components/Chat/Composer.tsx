"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUI } from "@/lib/ui/state";
import { SendHorizonal } from "lucide-react";
import { cn } from "@/lib/utils";

export function Composer({ className }: { className?: string }) {
  const [value, setValue] = useState("");
  const { setStep, setBrief } = useUI();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    // Parse minimal brief fields (mock heuristic)
    setBrief({ coverage: value.slice(0, 80) });
    setStep("conversation");
  }

  return (
    <form onSubmit={onSubmit} className={cn("flex gap-2", className)}>
      <Input
        placeholder="Describe your client or upload documents…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-11"
      />
      <Button type="submit" className="h-11 px-4">
        <SendHorizonal className="h-4 w-4" />
        <span className="sr-only">Send</span>
      </Button>
    </form>
  );
}

export default Composer;


