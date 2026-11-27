import * as React from "react"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"

import { useSilentFinalFocus } from "@/components/ui/modalFocus"
import { cn } from "@/lib/utils"

// Courbe et durée reprises de vaul, pour que le tiroir glisse comme avant.
const SLIDE =
  "duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] data-[swiping]:duration-0 motion-reduce:transition-none"

const Drawer = DrawerPrimitive.Root

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

type DrawerOverlayProps = Omit<
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Backdrop>,
  "className"
> & { className?: string }

const DrawerOverlay = React.forwardRef<HTMLDivElement, DrawerOverlayProps>(
  ({ className, ...props }, ref) => (
    <DrawerPrimitive.Backdrop
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm transition-opacity",
        "opacity-[calc(1_-_var(--drawer-swipe-progress,0))] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
        SLIDE,
        className
      )}
      {...props}
    />
  )
)
DrawerOverlay.displayName = "DrawerOverlay"

type DrawerContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Popup>,
  "className"
> & { className?: string }

/**
 * Le popup est monté à chaque ouverture : `useSilentFinalFocus` y retient
 * l'élément qui avait le focus avant elle.
 */
const DrawerPopup = React.forwardRef<HTMLDivElement, DrawerContentProps>(
  ({ className, children, finalFocus, ...props }, ref) => {
    const silentFinalFocus = useSilentFinalFocus(finalFocus)
    return (
      <DrawerPrimitive.Popup
        ref={ref}
        finalFocus={silentFinalFocus}
        className={cn(
          "relative mt-24 flex h-auto flex-col rounded-t-2xl border-none bg-surface-lowest shadow-editorial outline-none",
          "transition-transform [transform:translateY(var(--drawer-swipe-movement-y,0px))] data-[swiping]:select-none",
          "data-[ending-style]:[transform:translateY(100%)] data-[starting-style]:[transform:translateY(100%)]",
          "data-[ending-style]:duration-[calc(var(--drawer-swipe-strength,1)*500ms)]",
          SLIDE,
          className
        )}
        {...props}
      >
        <div
          aria-hidden
          className="mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full bg-on-surface-variant/25"
        />
        {children}
      </DrawerPrimitive.Popup>
    )
  }
)
DrawerPopup.displayName = "DrawerPopup"

/**
 * Tiroir qui monte du bas et se ferme d'un glissement vers le bas. Le
 * viewport est obligatoire : c'est lui qui suit le geste et bloque le
 * défilement tactile de la page.
 */
const DrawerContent = React.forwardRef<HTMLDivElement, DrawerContentProps>(
  (props, ref) => (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Viewport className="fixed inset-0 z-50 flex items-end justify-center">
        <DrawerPopup ref={ref} {...props} />
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  )
)
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...props}
  />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
)
DrawerFooter.displayName = "DrawerFooter"

type DrawerTitleProps = Omit<
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>,
  "className"
> & { className?: string }

const DrawerTitle = React.forwardRef<HTMLHeadingElement, DrawerTitleProps>(
  ({ className, ...props }, ref) => (
    <DrawerPrimitive.Title
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  )
)
DrawerTitle.displayName = "DrawerTitle"

type DrawerDescriptionProps = Omit<
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>,
  "className"
> & { className?: string }

const DrawerDescription = React.forwardRef<
  HTMLParagraphElement,
  DrawerDescriptionProps
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-on-surface-variant", className)}
    {...props}
  />
))
DrawerDescription.displayName = "DrawerDescription"

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
