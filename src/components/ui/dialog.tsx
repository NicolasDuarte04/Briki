"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type DialogContentContextValue = {
  contentId: string
  setLabelId: (labelId: string | undefined) => void
  setDescriptionId: (descriptionId: string | undefined) => void
}

const DialogContentContext = React.createContext<DialogContentContextValue | null>(null)

function useDialogContentContext() {
  return React.useContext(DialogContentContext)
}

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

function joinUniqueIds(...ids: (string | undefined | null)[]) {
  const unique = new Set<string>()
  ids.forEach((id) => {
    if (!id) return
    id
      .split(" ")
      .map((token) => token.trim())
      .filter(Boolean)
      .forEach((token) => unique.add(token))
  })
  return unique.size ? Array.from(unique).join(" ") : undefined
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, role: roleProp, "aria-modal": ariaModalProp, "aria-labelledby": ariaLabelledByProp, "aria-describedby": ariaDescribedByProp, ...props }, ref) => {
  const contentId = React.useId()
  const [labelId, setLabelId] = React.useState<string | undefined>()
  const [descriptionId, setDescriptionId] = React.useState<string | undefined>()

  const labelledBy = joinUniqueIds(labelId, ariaLabelledByProp)
  const describedBy = joinUniqueIds(descriptionId, ariaDescribedByProp)

  const contextValue = React.useMemo<DialogContentContextValue>(
    () => ({
      contentId,
      setLabelId,
      setDescriptionId,
    }),
    [contentId]
  )

  return (
    <DialogContentContext.Provider value={contextValue}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          data-slot="dialog-content"
          role={roleProp ?? "dialog"}
          aria-modal={ariaModalProp ?? true}
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute right-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogContentContext.Provider>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2", className)}
      {...props}
    />
  )
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, id: idProp, ...props }, ref) => {
  const context = useDialogContentContext()
  const generatedId = React.useId()
  const id = idProp ?? (context ? `${context.contentId}-title` : generatedId)

  React.useEffect(() => {
    if (!context) return
    context.setLabelId(id)
    return () => {
      context.setLabelId(undefined)
    }
  }, [context, id])

  return (
    <DialogPrimitive.Title
      ref={ref}
      id={id}
      data-slot="dialog-title"
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
})
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, id: idProp, ...props }, ref) => {
  const context = useDialogContentContext()
  const generatedId = React.useId()
  const id = idProp ?? (context ? `${context.contentId}-description` : generatedId)

  React.useEffect(() => {
    if (!context) return
    context.setDescriptionId(id)
    return () => {
      context.setDescriptionId(undefined)
    }
  }, [context, id])

  return (
    <DialogPrimitive.Description
      ref={ref}
      id={id}
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
DialogDescription.displayName = DialogPrimitive.Description.displayName

import { VisuallyHidden } from "./visually-hidden"

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  VisuallyHidden,
}


