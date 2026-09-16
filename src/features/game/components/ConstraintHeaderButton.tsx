import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  onClick: () => void;
};

/**
 * En-tête de ligne/colonne cliquable, partagé par `GameGrid` et `SolutionGrid` —
 * remplace le `headerClass` qui y était dupliqué. Même rendu visuel qu'un
 * en-tête statique hors survol et pression ; le texte affiché est son nom
 * accessible.
 */
export function ConstraintHeaderButton({ label, onClick }: Props) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={onClick}
      className={cn(
        "flex h-full w-full min-h-[52px] items-center justify-center whitespace-normal rounded-xl bg-surface-low p-1.5 text-center text-[10px] font-medium leading-tight text-on-surface-variant hover:bg-surface-highest/50 hover:text-on-surface-variant",
      )}
    >
      {label}
    </Button>
  );
}
