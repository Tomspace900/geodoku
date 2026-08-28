/**
 * Le modèle pays appartient à `content/` ; ce module n'existe que pour garder
 * les imports familiers `@/features/countries/types` côté application. Les
 * scripts du pipeline contenu importent `content/countries/type` directement.
 *
 * - `Country` : identité joueur (le runtime ne charge plus que ça).
 * - `CountryRecord` : enregistrement complet, produit par la régénération.
 * - énums gameplay : réexportées pour limiter le churn d'imports.
 */
export type {
  CapitalRole,
  Continent,
  Country,
  CountryCapital,
  CountryEvent,
  CountryRecord,
  DrivingSide,
  FlagColor,
  FlagLayout,
  FlagSymbol,
  PhysicalFeature,
  PoliticalGroup,
  Regime,
  WaterAccess,
} from "../../../content/countries/type";
export type { LocalizedString } from "../../../content/type";
