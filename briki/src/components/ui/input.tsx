import * as React from "react"

import { cn } from "@/lib/utils"

const inputVariants = {
  default:
    "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  pill:
    "h-10 rounded-full border border-border/60 bg-muted/20 px-5 text-sm leading-relaxed text-foreground shadow-none placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:ring-primary/40 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-white/5 dark:placeholder:text-neutral-400/90 dark:focus-visible:ring-offset-neutral-950",
} as const

type InputProps = React.ComponentProps<"input"> & {
  variant?: keyof typeof inputVariants
}

function Input({ className, type, variant = "default", ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        inputVariants.default,
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        variant === "pill" && inputVariants.pill,
        className
      )}
      {...props}
    />
  )
}

export { Input }
