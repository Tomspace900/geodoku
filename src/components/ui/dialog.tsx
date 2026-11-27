import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"

import { useSilentFinalFocus } from "@/components/ui/modalFocus"
import { focusWithoutVisibleRing } from "@/lib/focus"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

type DialogOverlayProps = Omit<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Backdrop>,
  "className"
> & { className?: string }

const DialogOverlay = React.forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Backdrop
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
)
DialogOverlay.displayName = "DialogOverlay"

type DialogContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Popup>,
  "className"
> & {
  className?: string
  closeLabel: string
  placement?: "center" | "bottom-sheet"
}

/**
 * Popup monté à chaque ouverture. Par défaut, le focus va au popup lui-même
 * puis revient, à la fermeture, sur l'élément d'avant : sans ring dans les
 * deux cas, la modale n'étant pas un champ.
 */
const DialogPopup = React.forwardRef<HTMLDivElement, DialogContentProps>(
  (
    {
      className,
      children,
      closeLabel,
      placement = "center",
      initialFocus,
      finalFocus,
      ...props
    },
    ref
  ) => {
    const popupRef = React.useRef<HTMLDivElement | null>(null)
    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        popupRef.current = node
        if (typeof ref === "function") ref(node)
        else if (ref) ref.current = node
      },
      [ref]
    )
    const silentFinalFocus = useSilentFinalFocus(finalFocus)

    return (
      <DialogPrimitive.Popup
        ref={setRefs}
        className={cn(
          "fixed z-50 grid w-full gap-4 border-none bg-surface-lowest p-6 shadow-editorial focus:outline-none",
          placement === "center"
            ? "left-[50%] top-[50%] max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl"
            : "bottom-0 left-0 max-w-none translate-x-0 translate-y-0 rounded-t-2xl sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-xl",
          className
        )}
        tabIndex={-1}
        initialFocus={
          initialFocus ??
          (() => {
            focusWithoutVisibleRing(popupRef.current)
            return false
          })
        }
        finalFocus={silentFinalFocus}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1.5 text-on-surface-variant ring-offset-surface-lowest transition-colors hover:bg-surface-low hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-surface/20 focus-visible:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">{closeLabel}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    )
  }
)
DialogPopup.displayName = "DialogPopup"

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  (props, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPopup ref={ref} {...props} />
    </DialogPortal>
  )
)
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

type DialogTitleProps = Omit<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>,
  "className"
> & { className?: string }

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Title
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  )
)
DialogTitle.displayName = "DialogTitle"

type DialogDescriptionProps = Omit<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>,
  "className"
> & { className?: string }

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  DialogDescriptionProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-on-surface-variant", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
