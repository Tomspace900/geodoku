/**
 * Le modèle pays appartient à `content/` ; ce module n'existe que pour garder
 * l'import familier `@/features/countries/types` côté application.
 *
 * Les scripts du pipeline contenu importent `content/countries/type`
 * directement : ils sont en **amont** de `content/`, passer par un module
 * `src/` inverserait le sens du graphe.
 */
/**
 * Énumérations gameplay (lot 2, fiche pays) : réexportées ici pour la même
 * raison que `Country`, à la différence que `CountryFacts` lui-même reste
 * **hors bundle joueur** — seul `src/features/countries/logic/countrySheetData.ts`
 * (chargé en lazy) l'importe.
 */
export type {
  CapitalRole,
  Continent,
  Country,
  CountryCapital,
  DrivingSide,
  FlagColor,
  FlagLayout,
  FlagSymbol,
  FormerSovereign,
  PhysicalFeature,
  PoliticalGroup,
  ProductionRankKey,
  Regime,
  WaterAccess,
} from "../../../content/countries/type";
