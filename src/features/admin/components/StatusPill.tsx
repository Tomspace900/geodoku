import { cn } from "@/lib/utils";
import { Archive, Calendar, Radio, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

type Kind = "scheduled" | "predicted" | "active" | "past";

const STYLES: Record<
  Kind,
  { bg: string; text: string; Icon: typeof Calendar }
> = {
  scheduled: {
    bg: "bg-surface-highest",
    text: "text-on-surface-variant",
    Icon: Calendar,
  },
  predicted: { bg: "bg-brand/10", text: "text-brand", Icon: Sparkles },
  active: { bg: "bg-success/15", text: "text-success", Icon: Radio },
  past: {
    bg: "bg-surface-low",
    text: "text-on-surface-variant",
    Icon: Archive,
  },
};

type Props = {
  kind: Kind;
  children: ReactNode;
};

export function StatusPill({ kind, children }: Props) {
  const { bg, text, Icon } = STYLES[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        bg,
        text,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {children}
    </span>
  );
}
