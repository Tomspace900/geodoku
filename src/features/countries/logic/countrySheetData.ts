import type { ConstraintId } from "../../../../content/constraints";
import { isCountryCode } from "../../../../content/countries/countryCodes";
import { COUNTRY_FACTS } from "../../../../content/countries/facts";
import { type ConstraintValue, constraintValueFor } from "./constraintValue";
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

/**
 * Valeurs d'un pays pour une liste de contraintes (même ordre que
 * `constraintIds`), lues dans le même chunk que la fiche : le drawer de la
 * grille solution n'importe jamais `facts.ts` lui-même.
 */
export function getConstraintValues(
  iso3: string,
  constraintIds: readonly ConstraintId[],
): readonly (ConstraintValue | null)[] {
  if (!isCountryCode(iso3)) return constraintIds.map(() => null);
  const facts = COUNTRY_FACTS[iso3];
  return constraintIds.map((id) => constraintValueFor(id, facts));
}
