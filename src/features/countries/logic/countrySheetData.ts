import type { ConstraintId } from "../../../../content/constraints";
import { isCountryCode } from "../../../../content/countries/countryCodes";
import { COUNTRY_FACTS } from "../../../../content/countries/facts";
import { type ConstraintValue, constraintValueFor } from "./constraintValue";

/**
 * Point d'entrée du chunk des faits : le seul module qui importe
 * `content/countries/facts` (faits gameplay, ~197 pays), chargé uniquement
 * via `import()` depuis `loadCountrySheetData.ts`. `src/` ne doit jamais
 * l'importer statiquement, sous peine de faire rentrer `facts.ts` dans le
 * graphe initial — cf. `scripts/ci/check-bundle-size.ts`.
 *
 * Valeurs d'un pays pour une liste de contraintes (même ordre que
 * `constraintIds`) : le drawer de la grille solution n'importe jamais
 * `facts.ts` lui-même.
 */
export function getConstraintValues(
  iso3: string,
  constraintIds: readonly ConstraintId[],
): readonly (ConstraintValue | null)[] {
  if (!isCountryCode(iso3)) return constraintIds.map(() => null);
  const facts = COUNTRY_FACTS[iso3];
  return constraintIds.map((id) => constraintValueFor(id, facts));
}
