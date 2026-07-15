import countryCodesJson from "../../src/features/countries/data/countryCodes.json" with {
  type: "json",
};
import { CONSTRAINTS } from "../../src/features/game/logic/constraints";
import { solveGrid } from "../../src/features/game/logic/gridSolver";

const ACTIVE_CONSTRAINT_IDS = new Set(
  CONSTRAINTS.map((constraint) => constraint.id as string),
);
const PLAYABLE_COUNTRY_CODES = new Set(countryCodesJson as string[]);

export type GridContentSnapshot = {
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
};

export type GridContentIssue = "constraint" | "country" | "matching";

/**
 * Vérifie qu'une grille future reste jouable avec le contenu actuellement
 * publié. `CONSTRAINTS` exclut volontairement les contraintes archivées tandis
 * que `countryCodes.json` est le catalogue compact accepté par les écritures.
 */
export function getGridContentIssue(
  grid: GridContentSnapshot,
): GridContentIssue | null {
  if (
    grid.rows.length !== 3 ||
    grid.cols.length !== 3 ||
    [...grid.rows, ...grid.cols].some(
      (constraintId) => !ACTIVE_CONSTRAINT_IDS.has(constraintId),
    )
  ) {
    return "constraint";
  }

  const hasUnknownCountry = Object.values(grid.validAnswers).some((answers) =>
    answers.some((countryCode) => !PLAYABLE_COUNTRY_CODES.has(countryCode)),
  );
  if (hasUnknownCountry) return "country";
  return solveGrid(grid.validAnswers) ? null : "matching";
}
