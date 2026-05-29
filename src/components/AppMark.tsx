import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function AppMark({ className }: Props) {
  return (
    <picture>
      <source srcSet="/favicon-dark.svg" media="(prefers-color-scheme: dark)" />
      <img
        src="/favicon.svg"
        alt=""
        aria-hidden
        className={cn("h-7 w-7 shrink-0", className)}
      />
    </picture>
  );
}
