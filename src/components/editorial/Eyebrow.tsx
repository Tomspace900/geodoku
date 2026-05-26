import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tag = "p" | "span" | "div";

type Props = {
  children: ReactNode;
  as?: Tag;
  className?: string;
};

export function Eyebrow({ children, as: As = "p", className }: Props) {
  return (
    <As
      className={cn(
        "text-[10px] tracking-widest uppercase text-on-surface-variant",
        className,
      )}
    >
      {children}
    </As>
  );
}
