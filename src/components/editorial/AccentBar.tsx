import { cn } from "@/lib/utils";

type Props = { className?: string };

export function AccentBar({ className }: Props) {
  return (
    <div
      aria-hidden
      className={cn("h-1 w-12 shrink-0 rounded-full bg-brand", className)}
    />
  );
}
