"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

type TabsContextValue = {
  readonly baseId: string
  readonly getTriggerId: (value: string) => string
  readonly getContentId: (value: string) => string
  readonly activeValue: string | undefined
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

const sanitizeForId = (value: string): string => value.replace(/[^a-zA-Z0-9_-]+/g, "-")

const createValueSegment = ({
  base,
  value,
  fallback
}: {
  base: string
  value?: string
  fallback?: string
}): string => {
  const candidate = value ?? fallback ?? ""
  const sanitized = sanitizeForId(candidate)
  if (sanitized.length > 0) {
    return sanitized
  }
  if (fallback && fallback.length > 0) {
    const fallbackSanitized = sanitizeForId(fallback)
    if (fallbackSanitized.length > 0) {
      return fallbackSanitized
    }
  }
  return `${base}-item`
}

const useTabsContext = () => React.useContext(TabsContext)

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ className, id: idProp, value: valueProp, defaultValue, onValueChange, orientation, ...props }, ref) => {
  const reactId = React.useId()
  const resourceIdSegment = React.useMemo(
    () =>
      createValueSegment({
        base: "tabs",
        ...(idProp ? { value: idProp } : {}),
        fallback: reactId,
      }),
    [idProp, reactId]
  )
  const baseId = React.useMemo(() => `tabs-${resourceIdSegment}`, [resourceIdSegment])

  const [activeValue, setActiveValue] = React.useState<string | undefined>(() => valueProp ?? defaultValue)

  React.useEffect(() => {
    if (valueProp !== undefined) {
      setActiveValue(valueProp)
    }
  }, [valueProp])

  React.useEffect(() => {
    if (valueProp === undefined && defaultValue !== undefined) {
      setActiveValue((prev) => (prev ?? defaultValue))
    }
  }, [defaultValue, valueProp])

  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      if (valueProp === undefined) {
        setActiveValue(nextValue)
      }
      onValueChange?.(nextValue)
    },
    [onValueChange, valueProp]
  )

  const getTriggerId = React.useCallback(
    (value: string) => `${baseId}-tab-${createValueSegment({ base: baseId, value })}`,
    [baseId]
  )

  const getContentId = React.useCallback(
    (value: string) => `${baseId}-panel-${createValueSegment({ base: baseId, value })}`,
    [baseId]
  )

  const contextValue = React.useMemo<TabsContextValue>(
    () => ({ baseId, getTriggerId, getContentId, activeValue }),
    [baseId, getTriggerId, getContentId, activeValue]
  )

  return (
    <TabsContext.Provider value={contextValue}>
      <TabsPrimitive.Root
        ref={ref}
        data-slot="tabs"
        className={cn("flex min-h-0 flex-col gap-2", className)}
        id={idProp ?? baseId}
        {...(valueProp !== undefined ? { value: valueProp } : {})}
        {...(defaultValue !== undefined ? { defaultValue } : {})}
        onValueChange={handleValueChange}
        {...(orientation ? { orientation } : {})}
        {...props}
      />
    </TabsContext.Provider>
  )
})
Tabs.displayName = TabsPrimitive.Root.displayName ?? "Tabs"

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, role, ...props }, ref) => {
  const context = useTabsContext()
  const ariaLabelledBy = props["aria-labelledby"]
  const finalAriaLabel =
    typeof ariaLabelledBy === "string"
      ? ariaLabelledBy
      : context?.baseId
  const ariaOrientation = props["aria-orientation"] ?? "horizontal"
  return (
    <TabsPrimitive.List
      ref={ref}
      data-slot="tabs-list"
      role={role ?? "tablist"}
      aria-orientation={ariaOrientation}
      aria-labelledby={finalAriaLabel}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-border/60 bg-muted/80 p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
})
TabsList.displayName = TabsPrimitive.List.displayName ?? "TabsList"

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, id: idProp, value, disabled, ...props }, ref) => {
  const context = useTabsContext()

  const { ["aria-controls"]: ariaControlsProp, ["aria-selected"]: ariaSelectedProp, tabIndex, ...rest } = props

  const triggerId = idProp ?? (context && value ? context.getTriggerId(value) : undefined)
  const contentId = ariaControlsProp ?? (context && value ? context.getContentId(value) : undefined)
  const isSelected =
    ariaSelectedProp !== undefined
      ? ariaSelectedProp
      : context && context.activeValue !== undefined && value
        ? context.activeValue === value
        : undefined

  const resolvedTabIndex = disabled ? -1 : tabIndex

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tabs-trigger"
      role="tab"
      id={triggerId}
      {...(contentId ? { "aria-controls": contentId } : {})}
      {...(isSelected !== undefined ? { "aria-selected": isSelected } : {})}
      disabled={disabled}
      {...(resolvedTabIndex !== undefined ? { tabIndex: resolvedTabIndex } : {})}
      className={cn(
        "relative inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 text-sm font-medium text-muted-foreground outline-none transition-[color,box-shadow] focus-visible:z-10 focus-visible:border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm after:absolute after:inset-x-3 after:-bottom-[5px] after:h-0.5 after:rounded-full after:bg-transparent after:transition-colors data-[state=active]:after:bg-primary sm:h-9",
        className
      )}
      value={value}
      {...rest}
    />
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName ?? "TabsTrigger"

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, id: idProp, value, forceMount, ...props }, ref) => {
  const context = useTabsContext()

  const { ["aria-labelledby"]: ariaLabelledByProp, ["aria-hidden"]: ariaHiddenProp, hidden: hiddenProp, ...rest } = props

  const contentId = idProp ?? (context && value ? context.getContentId(value) : undefined)
  const labelledBy = ariaLabelledByProp ?? (context && value ? context.getTriggerId(value) : undefined)
  const isActive = context && context.activeValue !== undefined && value ? context.activeValue === value : undefined
  const finalAriaHidden =
    ariaHiddenProp !== undefined
      ? ariaHiddenProp
      : isActive === undefined
        ? undefined
        : !isActive
  const finalHidden =
    hiddenProp !== undefined
      ? hiddenProp
      : isActive === undefined
        ? undefined
        : !isActive

  return (
    <TabsPrimitive.Content
      ref={ref}
      data-slot="tabs-content"
      role="tabpanel"
      id={contentId}
      aria-labelledby={labelledBy}
      aria-hidden={finalAriaHidden}
      hidden={finalHidden}
      className={cn("min-h-0 flex-1 outline-none", className)}
      value={value}
      {...(forceMount !== undefined ? { forceMount } : {})}
      {...rest}
    />
  )
})
TabsContent.displayName = TabsPrimitive.Content.displayName ?? "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
