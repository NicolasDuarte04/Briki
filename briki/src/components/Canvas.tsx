"use client";

import { cn } from "@/lib/utils";

export function Canvas({
  left,
  right,
  className,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-12 gap-4 h-[calc(100vh-56px)] p-4", className)}>
      <div className="col-span-12 lg:col-span-5 overflow-hidden">{left}</div>
      <div className="col-span-12 lg:col-span-7 overflow-auto">{right}</div>
    </div>
  );
}

export default Canvas;


