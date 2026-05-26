import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function TagPill({ children, className }: Props) {
  return (
    <span
      className={cn(
        "rounded-full bg-surface-low px-2 py-0.5 text-[10px] text-on-surface-variant",
        className,
      )}
    >
      {children}
    </span>
  );
}
