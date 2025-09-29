import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverPortal = PopoverPrimitive.Portal

const PopoverClose = PopoverPrimitive.Close

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 8, ...props }, ref) => {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          "rounded-xl border bg-popover text-popover-foreground shadow-lg outline-none",
          "focus-visible:border-ring focus-visible:ring-ring/60 focus-visible:ring-[3px]",
          "dark:border-border/80",
          "min-w-[220px] max-w-xs p-4",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
})

PopoverContent.displayName = PopoverPrimitive.Content.displayName

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
  PopoverAnchor,
  PopoverPortal,
}


