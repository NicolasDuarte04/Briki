"use client";

import { Badge } from "@/components/ui/badge";
import { useUI } from "@/lib/ui/state";

export function CTAchips() {
  const { setStep } = useUI();
  const items = [
    { label: "Import from WhatsApp" },
    { label: "Upload PDFs" },
    { label: "Name Carriers" },
  ];

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {items.map((item) => (
        <Badge
          key={item.label}
          variant="secondary"
          className="cursor-pointer hover:bg-secondary/80"
          onClick={() => setStep("conversation")}
        >
          {item.label}
        </Badge>
      ))}
    </div>
  );
}

export default CTAchips;


