import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  /** La section ouvre un tiroir : son titre se tape, chevron à droite. */
  onOpen?: () => void;
  children: ReactNode;
  className?: string;
};

export function StatsSection({ title, onOpen, children, className }: Props) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      {onOpen ? (
        <h2>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={onOpen}
            className="-my-1 gap-1 py-1 font-normal"
          >
            <Eyebrow as="span">{title}</Eyebrow>
            <ChevronRight
              className="!size-3.5 text-on-surface-variant"
              aria-hidden
            />
          </Button>
        </h2>
      ) : (
        <h2>
          <Eyebrow as="span">{title}</Eyebrow>
        </h2>
      )}
      {children}
    </section>
  );
}
