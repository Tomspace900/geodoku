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
 *
 * `absolute inset-0` plutôt que `h-full w-full` : dans une cellule de tableau
 * (`<th>`) sans hauteur propre, un pourcentage de hauteur sur un enfant ne se
 * résout pas de façon fiable d'un moteur à l'autre — le bouton restait bloqué
 * à sa hauteur minimale (52 px) alors que la ligne, dictée par les cases de
 * la grille solution à côté, est bien plus haute, ce qui se voyait au survol.
 * Le `<th>` porte `relative` (`GridMatrix`) pour servir de repère.
 *
 * Piège découvert en e2e (webkit-iphone) : un enfant `absolute` sort du flux
 * et ne contribue plus à la hauteur de son `<th>`. Sur la ligne d'en-têtes de
 * colonnes, où *tous* les `<th>` n'ont que ce bouton en contenu, la ligne
 * entière s'effondrait à 0 — le bouton (toujours haut de 52 px via `min-h`)
 * débordait alors sous la grille et interceptait les clics sur la première
 * rangée de cases. `GridMatrix` donne donc `h-[52px]` (pas `min-h-[52px]` :
 * WebKit ignore `min-height` pour le calcul de hauteur de ligne d'un `<th>`,
 * `height` y est honoré comme un plancher par l'algorithme de mise en page
 * des tableaux, sur les trois moteurs) au `<th>` lui-même : la ligne
 * d'en-têtes ne peut plus s'effondrer, et une ligne d'en-tête à côté de cases
 * plus hautes (grille solution) reste libre de s'étirer au-delà de ce
 * plancher.
 */
export function ConstraintHeaderButton({ label, onClick }: Props) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={onClick}
      className={cn(
        "absolute inset-0 flex min-h-[52px] items-center justify-center whitespace-normal rounded-xl bg-surface-low p-1.5 text-center text-[10px] font-medium leading-tight text-on-surface-variant hover:bg-surface-highest/50 hover:text-on-surface-variant",
      )}
    >
      {label}
    </Button>
  );
}
