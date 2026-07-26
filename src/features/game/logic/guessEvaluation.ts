import { getCountryByIso3 } from "@/features/countries/logic/search";
import type { CellPosition, GameState } from "../types";
import { toCellKey } from "./gridTopology";
import { getUsedCountryCodes } from "./usedCountries";
import { type GuessFailureReason, validatePublishedGuess } from "./validation";

export type GuessRejectionReason = GuessFailureReason | "invalid_country";

export type GuessEvaluation =
  | { kind: "valid" }
  | { kind: "rejected"; reason: GuessRejectionReason };

/**
 * Verdict local d'un coup, identique dans les deux modes : le snapshot
 * `validAnswers` publié avec la grille fait autorité, les prédicats live ne
 * servent qu'à expliquer l'échec. Le daily renvoie ensuite le coup au serveur,
 * l'entraînement s'arrête là.
 */
export function evaluateGuess(
  state: GameState,
  cell: CellPosition,
  countryCode: string,
  validAnswers: Record<string, string[]>,
): GuessEvaluation {
  const country = getCountryByIso3(countryCode);
  if (!country) return { kind: "rejected", reason: "invalid_country" };

  const result = validatePublishedGuess({
    rowConstraintId: state.rows[cell.row],
    colConstraintId: state.cols[cell.col],
    country,
    usedCountries: getUsedCountryCodes(state.cells),
    validCountryCodes: validAnswers[toCellKey(cell)] ?? [],
  });

  return result.valid
    ? { kind: "valid" }
    : { kind: "rejected", reason: result.reason };
}
