"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>((props, ref) => {
  const { className, ...rest } = props;
  return (
    <input
      ref={ref}
      type="range"
      data-slot="slider"
      className={cn(
        "focus-visible:ring-ring/70 focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "h-2 w-full appearance-none rounded-full bg-muted transition" ,
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...rest}
    />
  );
});
Slider.displayName = "Slider";

export { Slider };

