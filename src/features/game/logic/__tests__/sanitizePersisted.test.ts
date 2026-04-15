import { describe, expect, it } from "vitest";
import type { Cell, CellKey } from "../../types";
import type { PersistedGame } from "../persistence";
import { rarityToTier } from "../rarity";
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
    version: 1,
    date: "2026-04-15",
    cells: { ...emptyCells() },
    remainingLives: 3,
    usedCountries: [],
    status: "playing",
    startedAt: 1_700_000_000_000,
    finishedAt: null,
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
    expect(out?.remainingLives).toBe(3);
  });

  it("rejette un pays non présent dans validAnswers pour la case", () => {
    const cells = { ...emptyCells() };
    cells["0,0"] = {
      status: "filled",
      countryCode: "USA",
      rarity: 0.2,
      rarityTier: "rare",
    };
    const p = basePersisted({
      cells,
      usedCountries: ["USA"],
    });
    expect(sanitizePersistedForGrid(p, validAnswers)).toBeNull();
  });

  it("borne remainingLives au maximum autorisé", () => {
    const p = basePersisted({ remainingLives: 99 });
    const out = sanitizePersistedForGrid(p, validAnswers);
    expect(out?.remainingLives).toBe(3);
  });

  it("rejette deux fois le même pays sur deux cases", () => {
    const cells = { ...emptyCells() };
    cells["0,0"] = {
      status: "filled",
      countryCode: "FRA",
      rarity: 0.2,
      rarityTier: "uncommon",
    };
    cells["0,1"] = {
      status: "filled",
      countryCode: "FRA",
      rarity: 0.2,
      rarityTier: "uncommon",
    };
    const p = basePersisted({
      cells,
      usedCountries: ["FRA", "FRA"],
      remainingLives: 2,
    });
    const va = {
      ...validAnswers,
      "0,1": ["FRA"],
    };
    expect(sanitizePersistedForGrid(p, va)).toBeNull();
  });

  it("rejette status won sans 9 cases remplies", () => {
    const cells = { ...emptyCells() };
    cells["0,0"] = {
      status: "filled",
      countryCode: "FRA",
      rarity: 0.2,
      rarityTier: "uncommon",
    };
    const p = basePersisted({
      cells,
      status: "won",
      usedCountries: ["FRA"],
    });
    expect(sanitizePersistedForGrid(p, validAnswers)).toBeNull();
  });

  it("rejette status lost avec des vies restantes", () => {
    const p = basePersisted({ status: "lost", remainingLives: 2 });
    expect(sanitizePersistedForGrid(p, validAnswers)).toBeNull();
  });

  it("recalcule rarityTier depuis rarity (corrige une tier bidon)", () => {
    const cells = { ...emptyCells() };
    cells["0,0"] = {
      status: "filled",
      countryCode: "FRA",
      rarity: 0.8,
      rarityTier: "ultra",
    };
    const p = basePersisted({
      cells,
      usedCountries: ["FRA"],
      remainingLives: 3,
    });
    const out = sanitizePersistedForGrid(p, validAnswers);
    expect(out?.cells["0,0"]).toEqual({
      status: "filled",
      countryCode: "FRA",
      rarity: 0.8,
      rarityTier: rarityToTier(0.8),
    });
  });

  it("accepte une partie gagnée cohérente et fixe finishedAt si absent", () => {
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
        rarity: 0.3,
        rarityTier: rarityToTier(0.3),
      };
    });
    const p = basePersisted({
      cells,
      usedCountries: codes,
      status: "won",
      finishedAt: null,
    });
    const out = sanitizePersistedForGrid(p, validAnswers);
    expect(out?.status).toBe("won");
    expect(out?.finishedAt).toBe(p.startedAt);
    expect(out?.usedCountries).toHaveLength(9);
  });

  it("rejette startedAt non numérique", () => {
    const p = basePersisted({ startedAt: Number.NaN });
    expect(sanitizePersistedForGrid(p, validAnswers)).toBeNull();
  });
});
