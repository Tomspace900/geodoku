import { isCountryCode } from "../../../../content/countries/countryCodes";
import { COUNTRY_FACTS } from "../../../../content/countries/facts";
import { buildCountrySheet, type CountrySheetModel } from "./countrySheet";

/**
 * Point d'entrée du chunk de fiche pays : le seul module qui importe
 * `content/countries/facts` (faits gameplay, ~197 pays), chargé uniquement
 * via `import()` depuis `loadCountrySheetData.ts`. `src/` ne doit jamais
 * l'importer statiquement, sous peine de faire rentrer `facts.ts` dans le
 * graphe initial — cf. `scripts/ci/check-bundle-size.ts`.
 */
export function getCountrySheetData(iso3: string): CountrySheetModel | null {
  if (!isCountryCode(iso3)) return null;
  return buildCountrySheet(iso3, COUNTRY_FACTS[iso3]);
}
