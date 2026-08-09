import { describe, expect, it } from "vitest";
import type {
  CellGuessDistribution,
  CellKey,
  GameState,
  RarityTier,
} from "../../types";
import { STARTING_LIVES } from "../constants";
import { createInitialState } from "../reducer";
import {
  type ScoreBreakdown,
  averageRarityTier,
  computeScore,
  computeScoreBreakdown,
} from "../scoreVariant";

function breakdown(
  shares: number[] | null,
  filledCount: number,
  lives: number,
  estimated = false,
): ScoreBreakdown {
  return {
    shares,
    estimated,
    filledCount,
    lives,
    livesCapacity: STARTING_LIVES,
  };
}

const fill = (share: number, n: number): number[] =>
  Array.from({ length: n }, () => share);

describe("averageRarityTier — couleur de l'arc, dérivée de la fraction de rareté", () => {
  it("returns common for an empty grid", () => {
    expect(averageRarityTier([])).toBe("common");
  });

  it("mappe la fraction au tier (part 5 % → fraction 1,0, plancher ultra → ultra)", () => {
    expect(averageRarityTier(fill(0.05, 4))).toBe<RarityTier>("ultra");
  });

  it("grille 100 % très commune (part ≥ 0,6, aucune rareté) → common", () => {
    expect(averageRarityTier(fill(0.7, 9))).toBe<RarityTier>("common");
  });

  it("part 0,4 (fraction 0,4) → uncommon", () => {
    expect(averageRarityTier(fill(0.4, 9))).toBe<RarityTier>("uncommon");
  });

  it("part 0,25 (fraction 0,7) → rare, à la frontière", () => {
    expect(averageRarityTier(fill(0.25, 9))).toBe<RarityTier>("rare");
  });

  it("colle au score, pas à la moyenne des parts : une case commune ne fait pas basculer la couronne", () => {
    // 8 cases rares (part 0,2 → fraction 0,8) + 1 case très commune (part 0,9 → fraction 0).
    // Fraction moyenne = 6,4 / 9 ≈ 0,71 → rare. La moyenne des PARTS brutes serait
    // (8×0,2 + 0,9)/9 ≈ 0,28 (uncommon) — d'où le raisonnement en fraction.
    expect(averageRarityTier([...fill(0.2, 8), 0.9])).toBe<RarityTier>("rare");
  });
});

describe("computeScore — barème tranché (grille 50 · rareté 50 · vies 20, /1000)", () => {
  it("grille pleine, tout ultra (part 0), 5 vies = 1000", () => {
    expect(computeScore(breakdown(fill(0, 9), 9, 5))).toEqual({
      total: 1000,
      gridValue: 450,
      gridMax: 450,
      rarityValue: 450,
      rarityMax: 450,
      livesValue: 100,
      livesMax: 100,
    });
  });

  it("part ≥ 0,6 (très commun) → aucun bonus de rareté", () => {
    const r = computeScore(breakdown(fill(0.7, 9), 9, 5));
    expect(r.rarityValue).toBe(0);
    expect(r.total).toBe(550); // 450 grille + 0 rareté + 100 vies
  });

  it("part 0,25 (frontière rare) → 0,7 de case = 35 pts → 315", () => {
    // (0,6 − 0,25)/0,5 = 0,7 → 9 × 0,7 × 50 = 315.
    expect(computeScore(breakdown(fill(0.25, 9), 9, 0)).rarityValue).toBe(315);
  });

  it("plancher ultra : part ≤ 0,1 → case pleine (50)", () => {
    // (0,6 − 0,1)/0,5 = 1 : dès la frontière ultra, la case vaut le max.
    expect(computeScore(breakdown(fill(0.1, 9), 9, 0)).rarityValue).toBe(450);
  });

  it("Z=0,6 : un commun proche du seuil rapporte encore, ≥ 0,6 = 0", () => {
    // part 0,55 → (0,6 − 0,55)/0,5 = 0,1 → 5 pts/case → 45 ; part 0,6 → 0.
    expect(computeScore(breakdown(fill(0.55, 9), 9, 0)).rarityValue).toBe(45);
    expect(computeScore(breakdown(fill(0.6, 9), 9, 0)).rarityValue).toBe(0);
  });

  it("cumulée : une case non remplie vaut 0 (pas de prorata sur les vides)", () => {
    // 3 cases ultra sur 9 → 3 × 50 = 150.
    expect(computeScore(breakdown(fill(0, 3), 3, 0)).rarityValue).toBe(150);
  });

  it("l'anneau grille ne compte QUE les cases, jamais les vies", () => {
    expect(computeScore(breakdown(fill(0.5, 9), 9, 5)).gridValue).toBe(450);
    expect(computeScore(breakdown(fill(0.5, 9), 9, 0)).gridValue).toBe(450);
  });

  it("les vies sont un bonus séparé (20 par vie)", () => {
    expect(computeScore(breakdown(fill(0.5, 9), 9, 5)).livesValue).toBe(100);
    expect(computeScore(breakdown(fill(0.5, 9), 9, 0)).livesValue).toBe(0);
  });

  it("rareté en attente : total et rareté null, grille et vies connues", () => {
    const r = computeScore(breakdown(null, 9, 5));
    expect(r.total).toBeNull();
    expect(r.rarityValue).toBeNull();
    expect(r.gridValue).toBe(450);
    expect(r.livesValue).toBe(100);
  });

  it("arrondi une seule fois sur la somme (pas case par case)", () => {
    // 9 cases à 1/3 : (0,6 − 1/3)/0,5 = 0,533… → 9 × 0,533… × 50 = 240 (arrondi
    // global, ≠ 243 si l'on arrondissait 26,67 par case).
    expect(computeScore(breakdown(fill(1 / 3, 9), 9, 0)).rarityValue).toBe(240);
  });
});

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState("daily", "2024-01-01", [], []), ...overrides };
}

describe("computeScoreBreakdown — part brute + estimation", () => {
  it("grille vide : shares [], non estimé, sans distribution", () => {
    expect(
      computeScoreBreakdown(
        makeState({ lives: { kind: "limited", remaining: 4 } }),
        undefined,
      ),
    ).toEqual({
      shares: [],
      estimated: false,
      filledCount: 0,
      lives: 4,
      livesCapacity: STARTING_LIVES,
    });
  });

  it("part brute du jour, non estimé quand la case a assez de soumissions", () => {
    const state = makeState();
    state.cells["0,0" as CellKey] = { status: "filled", countryCode: "FR" };
    const dist: Record<string, CellGuessDistribution> = {
      "0,0": { totalGuesses: 10, rarityByCountry: { FR: 0.3 } },
    };
    const b = computeScoreBreakdown(state, dist);
    expect(b.shares).toEqual([0.3]);
    expect(b.estimated).toBe(false);
  });

  it("part brute + estimated tant que la case est mince (total < 5)", () => {
    const state = makeState();
    state.cells["0,0" as CellKey] = { status: "filled", countryCode: "FR" };
    const dist: Record<string, CellGuessDistribution> = {
      "0,0": { totalGuesses: 3, rarityByCountry: { FR: 1 / 3 } },
    };
    const b = computeScoreBreakdown(state, dist);
    expect(b.shares).toEqual([1 / 3]);
    expect(b.estimated).toBe(true);
  });

  it("mode entraînement : part vies neutralisée, échelle sur 900", () => {
    const state = makeState({
      mode: "training",
      lives: { kind: "unlimited", failedAttempts: 12 },
    });
    const b = computeScoreBreakdown(state, undefined);
    expect(b.lives).toBe(0);
    expect(b.livesCapacity).toBe(0);

    // Grille pleine tout-ultra : 450 + 450 + 0 = 900, et pas de max vies affiché.
    const full = computeScore({ ...b, shares: fill(0, 9), filledCount: 9 });
    expect(full.livesMax).toBe(0);
    expect(full.livesValue).toBe(0);
    expect(full.total).toBe(900);
  });

  // En entraînement la cohorte est close : un pays que personne n'a choisi vaut
  // 0, sinon le total resterait `null` et l'écran de fin afficherait « … » à vie.
  it("entraînement : un pays jamais choisi ce jour-là résout le score au lieu de le bloquer", () => {
    const state = makeState({
      mode: "training",
      lives: { kind: "unlimited", failedAttempts: 0 },
    });
    state.cells["0,0" as CellKey] = { status: "filled", countryCode: "NRU" };
    const dist: Record<string, CellGuessDistribution> = {
      "0,0": { totalGuesses: 10, rarityByCountry: { MCO: 0.8 } },
    };
    const b = computeScoreBreakdown(state, dist);
    expect(b.shares).toEqual([0]);
    expect(b.estimated).toBe(false);
    expect(computeScore(b).total).not.toBeNull();
  });

  it("shares null tant qu'une case remplie n'a pas de donnée", () => {
    const state = makeState();
    state.cells["0,0" as CellKey] = { status: "filled", countryCode: "FR" };
    state.cells["0,1" as CellKey] = { status: "filled", countryCode: "IT" };
    const dist: Record<string, CellGuessDistribution> = {
      "0,0": { totalGuesses: 10, rarityByCountry: { FR: 0.3 } },
    };
    const b = computeScoreBreakdown(state, dist);
    expect(b.filledCount).toBe(2);
    expect(b.shares).toBeNull();
  });
});
