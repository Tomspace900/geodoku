import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function AppMark({ className }: Props) {
  return (
    <img
      src="/favicon.svg"
      alt=""
      aria-hidden
      className={cn("h-7 w-7 shrink-0", className)}
    />
  );
}
