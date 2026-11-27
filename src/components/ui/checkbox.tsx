import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "checked" | "onChange"
> & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

/**
 * Case à cocher native, redessinée. Pas de primitive : Base UI Checkbox coûtait
 * 5 KiB au chargement initial (Field, Form, CheckboxGroup) pour la seule case
 * de « Comment jouer » (#183). Un `<input>` natif se coche au clavier et par
 * son `<label>` sans aide.
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => (
    <span className="relative inline-flex h-4 w-4 shrink-0">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className={cn(
          "peer h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-sm border border-outline-variant/40 bg-surface-lowest ring-offset-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:border-brand checked:bg-brand",
          className,
        )}
        {...props}
      />
      <Check
        aria-hidden
        strokeWidth={3}
        className="pointer-events-none absolute inset-0 m-auto hidden h-3.5 w-3.5 text-surface-lowest peer-checked:block"
      />
    </span>
  ),
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
