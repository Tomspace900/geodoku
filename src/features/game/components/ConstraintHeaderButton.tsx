import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  onClick: () => void;
};

/** Rendu typographique commun au bouton et à son jumeau de mesure. */
const LABEL_CLASS =
  "min-h-[52px] whitespace-normal p-1.5 text-center text-[10px] font-medium leading-tight";

/**
 * En-tête de ligne/colonne cliquable, partagé par `GameGrid` et `SolutionGrid` —
 * remplace le `headerClass` qui y était dupliqué. Même rendu visuel qu'un
 * en-tête statique hors survol et pression ; le texte affiché est son nom
 * accessible.
 *
 * **Le bouton couvre toute la cellule** (`absolute inset-0`, le `<th>` portant
 * `relative`), et non `h-full` : un pourcentage de hauteur sur l'enfant d'une
 * cellule de tableau ne se résout pas de la même façon d'un moteur à l'autre,
 * et le bouton restait haut de 52 px dans un en-tête de ligne bien plus haut
 * (la rangée est dictée par les cases voisines), ce qui se voyait au survol.
 *
 * **Le jumeau invisible dimensionne la cellule.** Un enfant `absolute` sort du
 * flux : sans lui, la rangée des en-têtes de colonne — où ces boutons sont le
 * seul contenu — ne peut plus grandir. Elle s'effondrait à 0, puis, figée à
 * 52 px, laissait les libellés longs déborder sur la première rangée de cases
 * (« Plus densément peuplé que les Pays-Bas (430 hab./km²) » mesure 75 px en
 * 375 px de large). Le jumeau porte le même texte et la même typographie, donc
 * la rangée retrouve exactement la hauteur qu'elle avait avant le bouton.
 * `invisible` (`visibility: hidden`) garde la place tout en sortant de l'arbre
 * d'accessibilité : le libellé n'est annoncé qu'une fois, par le bouton.
 */
export function ConstraintHeaderButton({ label, onClick }: Props) {
  return (
    <>
      <span className={`block ${LABEL_CLASS} invisible`}>{label}</span>
      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={onClick}
        className={`absolute inset-0 flex items-center justify-center rounded-xl bg-surface-low text-on-surface-variant hover:bg-surface-highest/50 hover:text-on-surface-variant ${LABEL_CLASS}`}
      >
        {label}
      </Button>
    </>
  );
}
