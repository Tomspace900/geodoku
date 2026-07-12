import { describe, expect, it } from "vitest";
import type {
  CellGuessDistribution,
  CellKey,
  GameState,
  RarityTier,
} from "../../types";
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
  return { shares, estimated, filledCount, lives };
}

const fill = (share: number, n: number): number[] =>
  Array.from({ length: n }, () => share);

describe("averageRarityTier — couleur de l'arc, dérivée de la fraction de rareté", () => {
  it("returns common for an empty grid", () => {
    expect(averageRarityTier([])).toBe("common");
  });

  it("mappe la fraction moyenne au tier (part 5% → fraction 0,9 → ultra)", () => {
    expect(averageRarityTier(fill(0.05, 4))).toBe<RarityTier>("ultra");
  });

  it("grille 100 % commune (part ≥ 0,5, aucune rareté) → common", () => {
    expect(averageRarityTier(fill(0.7, 9))).toBe<RarityTier>("common");
  });

  it("part 0,4 (fraction 0,2) → uncommon", () => {
    expect(averageRarityTier(fill(0.4, 9))).toBe<RarityTier>("uncommon");
  });

  it("part 0,25 (fraction 0,5) → rare, à la frontière", () => {
    expect(averageRarityTier(fill(0.25, 9))).toBe<RarityTier>("rare");
  });

  it("colle au score, pas à la moyenne des parts : une case commune ne fait pas basculer la couronne", () => {
    // 8 cases rares (part 0,2 → fraction 0,6) + 1 case très commune (part 0,9 → fraction 0).
    // Fraction moyenne = 4,8 / 9 ≈ 0,53 → rare (cohérent avec ~240 pts de rareté).
    // L'ancienne moyenne des parts valait (8×0,2 + 0,9)/9 ≈ 0,28 → uncommon (incohérent).
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

  it("case commune (part > 50 %) → aucun bonus de rareté", () => {
    const r = computeScore(breakdown(fill(0.7, 9), 9, 5));
    expect(r.rarityValue).toBe(0);
    expect(r.total).toBe(550); // 450 grille + 0 rareté + 100 vies
  });

  it("sous 50 %, la case rapporte au prorata : part 0,25 → moitié de la case", () => {
    // 9 cases à 0,25 → fraction 0,5 → 9 × 0,5 × 50 = 225.
    expect(computeScore(breakdown(fill(0.25, 9), 9, 0)).rarityValue).toBe(225);
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
    // 9 cases à 1/3 : fraction 1/3 → 9 × (1/3) × 50 = 150 exactement.
    expect(computeScore(breakdown(fill(1 / 3, 9), 9, 0)).rarityValue).toBe(150);
  });
});

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState("2024-01-01", [], []), ...overrides };
}

describe("computeScoreBreakdown — leave-one-out + estimation", () => {
  it("grille vide : shares [], non estimé, sans distribution", () => {
    expect(
      computeScoreBreakdown(makeState({ remainingLives: 4 }), undefined),
    ).toEqual({ shares: [], estimated: false, filledCount: 0, lives: 4 });
  });

  it("part leave-one-out, non estimé quand la case a assez de soumissions", () => {
    const state = makeState();
    state.cells["0,0" as CellKey] = { status: "filled", countryCode: "FR" };
    const dist: Record<string, CellGuessDistribution> = {
      "0,0": { totalGuesses: 10, rarityByCountry: { FR: 0.3 } },
    };
    const b = computeScoreBreakdown(state, dist);
    expect(b.shares).toEqual([2 / 9]); // (3 − 1) / (10 − 1)
    expect(b.estimated).toBe(false);
  });

  it("leave-one-out mais estimated dans la zone provisoire (total 3–4)", () => {
    const state = makeState();
    state.cells["0,0" as CellKey] = { status: "filled", countryCode: "FR" };
    const dist: Record<string, CellGuessDistribution> = {
      "0,0": { totalGuesses: 3, rarityByCountry: { FR: 1 / 3 } },
    };
    const b = computeScoreBreakdown(state, dist);
    expect(b.shares).toEqual([0]); // (1 − 1) / (3 − 1) — bon estimateur, pas la brute
    expect(b.estimated).toBe(true);
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
