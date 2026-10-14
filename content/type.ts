export type LocalizedString = Readonly<{
  fr: string;
  en: string;
}>;

/**
 * `"source"` — donnée d'autorité recopiée telle quelle (volcans, café, souveraineté).
 * `"convention"` — l'appartenance à la liste est un jugement éditorial Geodoku,
 * défendable mais discutable (symboles de drapeau, reliefs et milieux, Moyen-Orient,
 * régime, continent des pays transcontinentaux).
 */
export type ContentBasis = "source" | "convention";
