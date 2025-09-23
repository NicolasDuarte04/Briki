"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function TopBar({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "w-full h-14 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "flex items-center justify-between px-4",
        className
      )}
    >
      <div className="font-semibold tracking-tight text-xl">
        <span className="text-primary">briki</span>
      </div>
      <button
        className={cn(
          "inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm",
          "hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
        aria-label="Account"
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback>ND</AvatarFallback>
        </Avatar>
      </button>
    </header>
  );
}

export default TopBar;


