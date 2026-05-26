import { cn } from "@/lib/utils";
import { Calendar, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

type Kind = "scheduled" | "predicted";

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
