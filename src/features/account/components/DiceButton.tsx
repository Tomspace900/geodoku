import {
  Dice1,
  Dice2,
  Dice3,
  Dice4,
  Dice5,
  Dice6,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FACES: readonly LucideIcon[] = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
const FIRST_FACE = 4;

/** Une face au hasard, jamais celle qu'on vient de voir. */
function nextFace(current: number): number {
  const step = 1 + Math.floor(Math.random() * (FACES.length - 1));
  return (current + step) % FACES.length;
}

/**
 * Le dé : un tirage au hasard, toujours à droite, hors du champ. Chaque clic
 * le fait tourner (`animate-dice-roll`, coupé sous reduced motion) et change
 * sa face, sans prendre le focus du champ.
 */
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
  const [face, setFace] = useState(FIRST_FACE);
  // Change à chaque tirage : l'icône remonte, l'animation repart de zéro.
  const [rolls, setRolls] = useState(0);
  const Face = FACES[face];
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      // Le champ à côté garde le focus (et le clavier) : tirer ne ferme pas
      // une édition en cours.
      onPointerDown={(event) => event.preventDefault()}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        setFace(nextFace);
        setRolls((count) => count + 1);
        onClick();
      }}
      disabled={disabled}
      className={cn("-mr-2 shrink-0 [&_svg]:size-5", className)}
    >
      <Face
        key={rolls}
        aria-hidden
        className={rolls > 0 ? "animate-dice-roll" : undefined}
      />
    </Button>
  );
}
