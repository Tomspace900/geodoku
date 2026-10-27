import { describe, expect, it } from "vitest";
import type { Cell, CellKey } from "../../types";
import {
  distributeLegacyFailures,
  emptyFailedByCell,
  parseFailedByCell,
} from "../failedByCell";
import { CELL_KEYS } from "../gridTopology";

function cellsWithFilled(filled: CellKey[]): Record<CellKey, Cell> {
  return Object.fromEntries(
    CELL_KEYS.map((key, i) => [
      key,
      filled.includes(key)
        ? { status: "filled" as const, countryCode: `C${i}X` }
        : { status: "empty" as const },
    ]),
  ) as Record<CellKey, Cell>;
}

describe("distributeLegacyFailures", () => {
  it("étale le total une à une sur les cases non remplies, dans l'ordre", () => {
    const cells = cellsWithFilled([
      "0,0",
      "0,2",
      "1,0",
      "1,1",
      "1,2",
      "2,0",
      "2,1",
    ]);
    expect(distributeLegacyFailures(3, cells)).toEqual({
      ...emptyFailedByCell(),
      "0,1": 2,
      "2,2": 1,
    });
  });

  it("étale sur toutes les cases quand la grille est pleine", () => {
    const failed = distributeLegacyFailures(2, cellsWithFilled([...CELL_KEYS]));
    expect(failed).toEqual({ ...emptyFailedByCell(), "0,0": 1, "0,1": 1 });
  });

  it("ne compte rien sans erreur", () => {
    expect(distributeLegacyFailures(0, cellsWithFilled([]))).toEqual(
      emptyFailedByCell(),
    );
  });
});

describe("parseFailedByCell", () => {
  it("accepte un détail entier qui retombe sur le total attendu", () => {
    const failed = { ...emptyFailedByCell(), "2,1": 3 };
    expect(parseFailedByCell(failed, 3)).toEqual(failed);
  });

  it("refuse un détail dont la somme diffère du total", () => {
    expect(
      parseFailedByCell({ ...emptyFailedByCell(), "2,1": 3 }, 2),
    ).toBeNull();
  });

  it("refuse une valeur négative ou décimale", () => {
    expect(
      parseFailedByCell({ ...emptyFailedByCell(), "0,0": -1 }, -1),
    ).toBeNull();
    expect(
      parseFailedByCell({ ...emptyFailedByCell(), "0,0": 1.5 }, 1.5),
    ).toBeNull();
  });

  it("refuse un détail incomplet ou absent", () => {
    expect(parseFailedByCell({ "0,0": 1 }, 1)).toBeNull();
    expect(parseFailedByCell(undefined, 0)).toBeNull();
  });
});
