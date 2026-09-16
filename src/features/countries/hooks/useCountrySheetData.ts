import { useEffect, useState } from "react";
import type { CountrySheetModel } from "../logic/countrySheet";
import { loadCountrySheetData } from "../logic/loadCountrySheetData";

export type CountrySheetDataState =
  | { status: "loading" }
  | { status: "ready"; data: CountrySheetModel }
  | { status: "error"; retry: () => void };

/**
 * Faits d'un pays pour la fiche, chargés à la demande (le chunk est
 * généralement déjà en cours de préchargement depuis le montage de la grille
 * solution — voir `loadCountrySheetData`). `retry` relance le chargement sans
 * démonter le composant appelant.
 */
export function useCountrySheetData(iso3: string): CountrySheetDataState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CountrySheetDataState>({
    status: "loading",
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt n'est pas lu, il ne sert qu'à déclencher un nouvel essai depuis retry()
  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    loadCountrySheetData()
      .then((module) => {
        if (cancelled) return;
        const data = module.getCountrySheetData(iso3);
        setState(
          data
            ? { status: "ready", data }
            : { status: "error", retry: () => setAttempt((n) => n + 1) },
        );
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          status: "error",
          retry: () => setAttempt((n) => n + 1),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [iso3, attempt]);

  return state;
}
