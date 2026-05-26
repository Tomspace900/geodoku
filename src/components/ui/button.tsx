import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-surface/20 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-on-surface text-surface-lowest hover:bg-on-surface/90 rounded-md text-sm",
        secondary:
          "bg-surface-highest text-on-surface hover:bg-surface-highest/70 rounded-md text-sm",
        ghost:
          "text-on-surface-variant hover:text-on-surface rounded-md text-sm",
        "ghost-label":
          "text-[10px] font-semibold tracking-widest uppercase text-on-surface-variant hover:text-on-surface",
        link: "text-on-surface-variant underline underline-offset-2 decoration-outline-variant/40 hover:text-on-surface text-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
        auto: "h-auto p-0",
      },
    },
    compoundVariants: [
      { variant: "ghost-label", size: "default", className: "h-auto p-0" },
      { variant: "link", size: "default", className: "h-auto p-0" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
