import { describe, expect, it } from "vitest";
import type { Cell, CellKey } from "../../types";
import type { PersistedGame } from "../persistence";
import { sanitizePersistedForGrid } from "../sanitizePersisted";

const CELL_KEYS: CellKey[] = [
  "0,0",
  "0,1",
  "0,2",
  "1,0",
  "1,1",
  "1,2",
  "2,0",
  "2,1",
  "2,2",
];

/** Chaque case accepte un pays unique pour forcer l’absence de doublons en partie complète. */
function uniqueAnswers(): Record<string, string[]> {
  const codes = ["FRA", "DEU", "ESP", "ITA", "PRT", "NLD", "BEL", "AUT", "CHE"];
  return Object.fromEntries(CELL_KEYS.map((k, i) => [k, [codes[i]]])) as Record<
    string,
    string[]
  >;
}

function emptyCells(): Record<CellKey, Cell> {
  return Object.fromEntries(
    CELL_KEYS.map((k) => [k, { status: "empty" as const }]),
  ) as Record<CellKey, Cell>;
}

function basePersisted(overrides: Partial<PersistedGame> = {}): PersistedGame {
  return {
    version: 3,
    date: "2026-04-15",
    cells: { ...emptyCells() },
    remainingLives: 3,
    ...overrides,
  };
}

describe("sanitizePersistedForGrid", () => {
  const validAnswers = uniqueAnswers();

  it("accepte une partie jouable vide", () => {
    const p = basePersisted();
    const out = sanitizePersistedForGrid(p, validAnswers);
    expect(out).not.toBeNull();
    expect(out?.status).toBe("playing");
    expect(out?.lives).toEqual({ kind: "limited", remaining: 3 });
  });

  it("canonise une sauvegarde v3 minimale", () => {
    const persisted: PersistedGame = {
      version: 3,
      date: "2026-04-15",
      cells: emptyCells(),
      remainingLives: 3,
    };
    const out = sanitizePersistedForGrid(persisted, validAnswers);

    expect(out?.status).toBe("playing");
    expect(out).not.toHaveProperty("usedCountries");
    expect(out).not.toHaveProperty("startedAt");
    expect(out).not.toHaveProperty("finishedAt");
  });

  it("rejette sans lever une sauvegarde v3 structurellement incomplète", () => {
    const persisted = {
      version: 3,
      date: "2026-04-15",
      remainingLives: 3,
    } as PersistedGame;

    expect(sanitizePersistedForGrid(persisted, validAnswers)).toBeNull();
  });

  it("rejette un pays non présent dans validAnswers pour la case", () => {
    const cells = { ...emptyCells() };
    cells["0,0"] = {
      status: "filled",
      countryCode: "USA",
    };
    const p = basePersisted({
      cells,
    });
    expect(sanitizePersistedForGrid(p, validAnswers)).toBeNull();
  });

  it("borne remainingLives au maximum autorisé", () => {
    const p = basePersisted({ remainingLives: 99 });
    const out = sanitizePersistedForGrid(p, validAnswers);
    expect(out?.lives).toEqual({ kind: "limited", remaining: 5 });
  });

  it("rejette deux fois le même pays sur deux cases", () => {
    const cells = { ...emptyCells() };
    cells["0,0"] = {
      status: "filled",
      countryCode: "FRA",
    };
    cells["0,1"] = {
      status: "filled",
      countryCode: "FRA",
    };
    const p = basePersisted({
      cells,
      remainingLives: 2,
    });
    const va = {
      ...validAnswers,
      "0,1": ["FRA"],
    };
    expect(sanitizePersistedForGrid(p, va)).toBeNull();
  });

  it("accepte une ancienne sauvegarde contenant encore rarity/rarityTier (ignorés)", () => {
    const cells = { ...emptyCells() };
    // Sauvegarde legacy : la rareté figée existe encore dans le JSON persisté.
    const legacyCell = {
      status: "filled",
      countryCode: "FRA",
      rarity: 0.8,
      rarityTier: "ultra",
    };
    cells["0,0"] = legacyCell as unknown as Cell;
    const p = basePersisted({
      cells,
      remainingLives: 3,
    });
    const out = sanitizePersistedForGrid(p, validAnswers);
    // La case est conservée mais ramenée à sa forme dynamique (sans rareté).
    expect(out?.cells["0,0"]).toEqual({ status: "filled", countryCode: "FRA" });
  });

  it("accepte une partie gagnée cohérente sans conserver les champs legacy", () => {
    const codes = [
      "FRA",
      "DEU",
      "ESP",
      "ITA",
      "PRT",
      "NLD",
      "BEL",
      "AUT",
      "CHE",
    ];
    const cells = { ...emptyCells() };
    CELL_KEYS.forEach((k, i) => {
      cells[k] = {
        status: "filled",
        countryCode: codes[i],
      };
    });
    const p = basePersisted({
      cells,
    });
    const out = sanitizePersistedForGrid(p, validAnswers);
    expect(out?.status).toBe("won");
    expect(out).not.toHaveProperty("finishedAt");
    expect(out).not.toHaveProperty("usedCountries");
  });

  it("rejette une partie gagnée avec 0 vie", () => {
    const codes = [
      "FRA",
      "DEU",
      "ESP",
      "ITA",
      "PRT",
      "NLD",
      "BEL",
      "AUT",
      "CHE",
    ];
    const cells = { ...emptyCells() };
    CELL_KEYS.forEach((key, index) => {
      cells[key] = { status: "filled", countryCode: codes[index] };
    });
    const persisted = basePersisted({
      cells,
      remainingLives: 0,
    });

    expect(sanitizePersistedForGrid(persisted, validAnswers)).toBeNull();
  });

  it("marque les cellules bloquées et reste en playing si des cases empty restent", () => {
    const cells = { ...emptyCells() };
    cells["0,0"] = {
      status: "filled",
      countryCode: "FRA",
    };
    cells["0,1"] = {
      status: "filled",
      countryCode: "DEU",
    };
    const blockedAnswers = {
      ...validAnswers,
      "0,2": ["FRA", "DEU"],
    };
    const p = basePersisted({
      cells,
      remainingLives: 3,
    });
    const out = sanitizePersistedForGrid(p, blockedAnswers);
    expect(out?.status).toBe("playing");
    expect(out?.cells["0,2"].status).toBe("blocked");
    expect(out?.lives).toEqual({ kind: "limited", remaining: 3 });
  });

  it("canonise une partie incompletable en lost tout en conservant les vies", () => {
    const cells = { ...emptyCells() };
    cells["0,0"] = {
      status: "filled",
      countryCode: "FRA",
    };
    cells["0,1"] = {
      status: "filled",
      countryCode: "DEU",
    };
    const trapAnswers = {
      "0,0": ["FRA"],
      "0,1": ["DEU"],
      "0,2": ["FRA", "DEU"],
      "1,0": ["FRA"],
      "1,1": ["DEU"],
      "1,2": ["FRA", "DEU"],
      "2,0": ["FRA"],
      "2,1": ["DEU"],
      "2,2": ["FRA", "DEU"],
    };
    const p = basePersisted({
      cells,
      remainingLives: 3,
    });
    const out = sanitizePersistedForGrid(p, trapAnswers);
    expect(out?.status).toBe("lost");
    expect(out?.lives).toEqual({ kind: "limited", remaining: 3 });
  });

  it("accepte une cellule blocked sérialisée cohérente", () => {
    const cells = { ...emptyCells() };
    cells["0,0"] = {
      status: "filled",
      countryCode: "FRA",
    };
    cells["0,2"] = { status: "blocked" };
    const va = { ...validAnswers, "0,2": ["FRA"] };
    const p = basePersisted({
      cells,
      remainingLives: 3,
    });
    const out = sanitizePersistedForGrid(p, va);
    expect(out?.cells["0,2"].status).toBe("blocked");
  });
});
