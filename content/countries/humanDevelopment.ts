/**
 * Catégorie de développement humain d'un IDH. Jamais stockée dans `facts.ts` :
 * elle se calcule depuis la valeur (fiche pays), et la garde de `check:content`
 * la recalcule pour la confronter à la catégorie publiée par le PNUD.
 */
export type HumanDevelopmentCategory = "very_high" | "high" | "medium" | "low";

/**
 * Seuils du *Human Development Report 2025* (PNUD), Technical note 1,
 * <https://hdr.undp.org/sites/default/files/2025_HDR/hdr2025_technical_notes.pdf> :
 * très élevé ≥ 0,800 ; élevé 0,700–0,799 ; moyen 0,550–0,699 ; faible < 0,550.
 * Ordre décroissant : la première borne atteinte l'emporte. À revoir avec
 * l'édition retenue (`HDR_EDITION`) : les notes techniques les republient à
 * chaque rapport.
 */
const CATEGORY_LOWER_BOUNDS: readonly (readonly [
  HumanDevelopmentCategory,
  number,
])[] = [
  ["very_high", 0.8],
  ["high", 0.7],
  ["medium", 0.55],
];

export function humanDevelopmentCategory(
  value: number,
): HumanDevelopmentCategory {
  const match = CATEGORY_LOWER_BOUNDS.find(
    ([, lowerBound]) => value >= lowerBound,
  );
  return match ? match[0] : "low";
}
