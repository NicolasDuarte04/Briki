import * as React from "react";

import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoResize?: boolean;
  maxAutoResizeHeight?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, autoResize = false, maxAutoResizeHeight = 220, onChange, style, ...props },
    ref
  ) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);
    const combinedRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    const resize = React.useCallback(() => {
      if (!autoResize) return;
      const textarea = innerRef.current;
      if (!textarea) return;
      textarea.style.height = "auto";
      const nextHeight = Math.min(textarea.scrollHeight, maxAutoResizeHeight);
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY = textarea.scrollHeight > maxAutoResizeHeight ? "auto" : "hidden";
    }, [autoResize, maxAutoResizeHeight]);

    React.useEffect(() => {
      resize();
    }, [resize]);

    const handleChange = React.useCallback<React.ChangeEventHandler<HTMLTextAreaElement>>(
      (event) => {
        if (autoResize) {
          resize();
        }
        onChange?.(event);
      },
      [autoResize, onChange, resize]
    );

    return (
      <textarea
        ref={combinedRef}
        data-slot="textarea"
        onChange={handleChange}
        className={cn(
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base leading-6 shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        style={{ overflowY: autoResize ? "hidden" : undefined, ...style }}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
