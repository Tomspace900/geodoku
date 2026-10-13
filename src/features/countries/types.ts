/**
 * Le modèle pays appartient à `content/` ; ce module n'existe que pour garder
 * l'import familier `@/features/countries/types` côté application.
 *
 * Les scripts du pipeline contenu importent `content/countries/type`
 * directement : ils sont en **amont** de `content/`, passer par un module
 * `src/` inverserait le sens du graphe.
 */
/**
 * Énumérations de faits réexportées ici pour la même raison que `Country`
 * (import familier côté application), à la différence que `CountryFacts`
 * lui-même reste **hors bundle joueur** — seul
 * `src/features/countries/logic/countrySheetData.ts` (chargé en lazy)
 * l'importe.
 */
export type {
  Country,
  FlagColor,
  FlagSymbol,
  PhysicalFeature,
  ProductionRankKey,
  SovereigntyKind,
} from "../../../content/countries/type";
