import { useEffect, useState } from "react";
import type { ConstraintId } from "../../../../content/constraints";
import type { ConstraintValue } from "../logic/constraintValue";
import { loadCountrySheetData } from "../logic/loadCountrySheetData";

export type ConstraintValuesByCountry = ReadonlyMap<
  string,
  readonly (ConstraintValue | null)[]
>;

const NO_VALUES: ConstraintValuesByCountry = new Map();

/**
 * Valeurs de contrainte de chaque pays (`constraintIds`, dans l'ordre), lues
 * dans le chunk lazy des faits. Tant que le chunk n'est pas là — ou s'il
 * échoue — la map est vide : le drawer affiche ses lignes sans valeur plutôt
 * que de bloquer, la valeur n'étant qu'un complément d'information.
 */
export function useConstraintValues(
  isoCodes: readonly string[],
  constraintIds: readonly ConstraintId[],
): ConstraintValuesByCountry {
  const [values, setValues] = useState<ConstraintValuesByCountry>(NO_VALUES);
  const key = `${constraintIds.join(",")}|${isoCodes.join(",")}`;

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` encode isoCodes et constraintIds — des tableaux recréés à chaque rendu relanceraient l'effet en boucle
  useEffect(() => {
    if (isoCodes.length === 0 || constraintIds.length === 0) {
      setValues(NO_VALUES);
      return;
    }
    let cancelled = false;
    loadCountrySheetData()
      .then((module) => {
        if (cancelled) return;
        setValues(
          new Map(
            isoCodes.map((iso) => [
              iso,
              module.getConstraintValues(iso, constraintIds),
            ]),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setValues(NO_VALUES);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return values;
}
