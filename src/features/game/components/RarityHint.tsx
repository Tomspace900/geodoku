import { useT } from "@/i18n/LocaleContext";

/**
 * Sous la grille (partie ET solution) : rappel que les raretés bougent au fil de
 * la journée. Le bouton d'explication du score n'apparaît qu'en solution pour ne
 * pas surcharger l'écran de jeu.
 *
 * Réservé à la grille du jour : la cohorte d'une grille passée est complète, donc
 * sa rareté est figée — l'écran d'entraînement n'affiche pas ce rappel.
 */
export function RarityHint() {
  const t = useT();
  return (
    <p className="text-center text-xs text-on-surface-variant italic">
      {t("ui.rarityEvolvesHint")}
    </p>
  );
}
