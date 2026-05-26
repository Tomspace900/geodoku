import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function PanelCard({ children, className }: Props) {
  return (
    <section className={cn("rounded-lg bg-surface-low p-4 md:p-5", className)}>
      {children}
    </section>
  );
}
