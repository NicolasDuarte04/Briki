import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import type { Provenance as DomainProvenance } from "@/lib/types";
import { cn } from "@/lib/utils";

type DomainProvenanceSource = DomainProvenance["source"];

const canonicalSourcingProvenance = ["API", "Portal", "PDF"] as const satisfies readonly DomainProvenanceSource[];

export type ProvenanceTag = (typeof canonicalSourcingProvenance)[number];

const indicatorStyles: Record<Lowercase<ProvenanceTag>, string> = {
  api: "bg-emerald-500/15 text-emerald-500",
  portal: "bg-sky-500/15 text-sky-500",
  pdf: "bg-amber-500/15 text-amber-500",
};

interface ProvenanceChipProps extends ComponentProps<typeof Badge> {
  provenance: ProvenanceTag;
  ariaLabel?: string;
}

export function ProvenanceChip({
  provenance,
  className,
  ariaLabel,
  role,
  tabIndex,
  ...props
}: ProvenanceChipProps) {
  const normalized = provenance.toLowerCase() as Lowercase<ProvenanceTag>;

  return (
    <Badge
      data-slot="provenance-chip"
      variant="secondary"
      role={role ?? "status"}
      tabIndex={tabIndex ?? 0}
      aria-label={ariaLabel ?? `${provenance} source`}
      className={cn(
        "inline-flex min-h-6 min-w-0 items-center gap-1 rounded-full border-none px-2 py-[3px] text-[12px] font-medium uppercase tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        indicatorStyles[normalized] ?? "",
        className,
      )}
      {...props}
    >
      <span className="block size-1.5 rounded-full bg-current" aria-hidden />
      {provenance}
    </Badge>
  );
}


