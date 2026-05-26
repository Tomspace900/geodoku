import { Eyebrow } from "@/features/game/components/Eyebrow";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  title: string;
  children?: ReactNode;
  className?: string;
};

export function PanelHeader({ title, children, className }: Props) {
  return (
    <div className={cn("mb-3 flex flex-wrap items-center gap-3", className)}>
      <Eyebrow className="font-semibold">{title}</Eyebrow>
      {children}
    </div>
  );
}
