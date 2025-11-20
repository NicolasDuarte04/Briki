import { Skeleton } from "@/components/ui/skeleton";

export function SourcingProgressSkeletonRow() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/30 bg-muted/40 px-3 py-2">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-2.5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  );
}

export function SourcingProgressSkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, index) => (
        <SourcingProgressSkeletonRow key={index} />
      ))}
    </div>
  );
}