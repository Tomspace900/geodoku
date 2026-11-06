import { Dice5 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Le dé : un tirage au hasard, toujours à droite, hors du champ. */
export function DiceButton({
  label,
  onClick,
  disabled = false,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn("-mr-2 shrink-0 [&_svg]:size-5", className)}
    >
      <Dice5 aria-hidden />
    </Button>
  );
}
