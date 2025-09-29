"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type VisuallyHiddenProps = React.HTMLAttributes<HTMLElement> & {
  asChild?: boolean
}

const hiddenStyles: React.CSSProperties = {
  position: "absolute",
  border: 0,
  padding: 0,
  margin: -1,
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
}

function setRef<TValue>(ref: React.Ref<TValue> | undefined, value: TValue) {
  if (!ref) return
  if (typeof ref === "function") {
    ref(value)
  } else {
    ;(ref as React.MutableRefObject<TValue | null>).current = value
  }
}

const VisuallyHidden = React.forwardRef<HTMLElement, VisuallyHiddenProps>(
  ({ asChild = false, className, style, children, ...props }, forwardedRef) => {
    const combinedClassName = cn("sr-only", className)

    if (asChild) {
      const child = React.Children.only(children)
      if (!React.isValidElement(child)) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("VisuallyHidden with 'asChild' expects a single React element child.")
        }
        return null
      }

      const childElement = child as React.ReactElement<Record<string, unknown>> & {
        ref?: React.Ref<HTMLElement>
      }
      const childRef = childElement.ref
      const childProps = childElement.props as {
        className?: string
        style?: React.CSSProperties
      }

      return React.cloneElement(childElement, {
        ...props,
        className: cn(childProps.className, combinedClassName),
        style: { ...hiddenStyles, ...childProps.style, ...style },
        ref: (node: HTMLElement | null) => {
          setRef(childRef, node)
          setRef(forwardedRef, node)
        },
      })
    }

    return (
      <span
        ref={forwardedRef}
        className={combinedClassName}
        style={{ ...hiddenStyles, ...style }}
        {...props}
      >
        {children}
      </span>
    )
  }
)

VisuallyHidden.displayName = "VisuallyHidden"

export { VisuallyHidden }
