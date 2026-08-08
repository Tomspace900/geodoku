import { describe, expect, it } from "vitest";
import {
  filledCellShare,
  filledCellTier,
  formatRarityPercent,
  isCohortComplete,
  raritySharePercent,
  rarityToTier,
} from "../rarity";

describe("rarityToTier", () => {
  it("returns common for rarity > 0.5", () => {
    expect(rarityToTier(0.8)).toBe("common");
  });

  it("returns common for rarity = 1", () => {
    expect(rarityToTier(1)).toBe("common");
  });

  it("returns uncommon for rarity in (0.25, 0.5]", () => {
    expect(rarityToTier(0.4)).toBe("uncommon");
  });

  it("returns rare for rarity in (0.10, 0.25]", () => {
    expect(rarityToTier(0.15)).toBe("rare");
  });

  it("returns ultra for rarity <= 0.10", () => {
    expect(rarityToTier(0.05)).toBe("ultra");
  });

  it("returns ultra for rarity = 0", () => {
    expect(rarityToTier(0)).toBe("ultra");
  });

  it("returns uncommon at the 0.25 boundary (not > uncommon threshold)", () => {
    // 0.25 is NOT > 0.25, so falls through to rare check: 0.25 > 0.10 → rare
    expect(rarityToTier(0.25)).toBe("rare");
  });
});

describe("formatRarityPercent", () => {
  it("returns 0% for 0", () => {
    expect(formatRarityPercent(0)).toBe("0%");
  });

  it("rounds very small values to nearest integer", () => {
    expect(formatRarityPercent(0.003)).toBe("0%");
    expect(formatRarityPercent(0.006)).toBe("1%");
  });

  it("returns 50% for 0.5", () => {
    expect(formatRarityPercent(0.5)).toBe("50%");
  });

  it("returns 100% for 1", () => {
    expect(formatRarityPercent(1)).toBe("100%");
  });
});

describe("raritySharePercent", () => {
  it("matches formatRarityPercent without suffix", () => {
    expect(raritySharePercent(0.083)).toBe(8);
    expect(`${raritySharePercent(0.25)}%`).toBe(formatRarityPercent(0.25));
  });
});

describe("filledCellTier (part brute, cohorte)", () => {
  it("derives the tier from the country's raw share", () => {
    expect(
      filledCellTier("FR", { totalGuesses: 10, rarityByCountry: { FR: 0.05 } }),
    ).toBe("ultra");
    expect(
      filledCellTier("FR", { totalGuesses: 10, rarityByCountry: { FR: 0.8 } }),
    ).toBe("common");
  });

  it("returns null while the distribution is loading (undefined)", () => {
    expect(filledCellTier("FR", undefined)).toBeNull();
  });

  it("returns null when the cell has no guesses yet", () => {
    expect(
      filledCellTier("FR", { totalGuesses: 0, rarityByCountry: {} }),
    ).toBeNull();
  });

  it("returns null when the country is absent from the distribution", () => {
    expect(
      filledCellTier("FR", { totalGuesses: 10, rarityByCountry: { IT: 0.5 } }),
    ).toBeNull();
  });
});

describe("filledCellShare (part brute cohorte + estimated)", () => {
  it("renvoie la part brute du jour (coup du joueur inclus)", () => {
    expect(
      filledCellShare("FR", {
        totalGuesses: 10,
        rarityByCountry: { FR: 0.3 },
      }),
    ).toEqual({ share: 0.3, estimated: false });
  });

  it("estimated tant que la case reste sous ESTIMATED_MAX_TOTAL (5)", () => {
    expect(
      filledCellShare("FR", {
        totalGuesses: 3,
        rarityByCountry: { FR: 1 / 3 },
      }),
    ).toEqual({ share: 1 / 3, estimated: true });
  });

  it("l'avertissement estimated s'éteint au seuil (total = 5)", () => {
    expect(
      filledCellShare("FR", {
        totalGuesses: 5,
        rarityByCountry: { FR: 0.4 },
      }),
    ).toEqual({ share: 0.4, estimated: false });
  });

  it("null sans donnée pour ce pays / cette case", () => {
    expect(
      filledCellShare("FR", {
        totalGuesses: 10,
        rarityByCountry: { IT: 0.5 },
      }),
    ).toBeNull();
    expect(filledCellShare("FR", undefined)).toBeNull();
  });
});

// Régression observée en entraînement : sur la grille du 2026-08-03, la case
// 2,2 comptait 10 soumissions mais seulement MCO et SMR ; un joueur qui posait
// Nauru — valide, jamais choisi ce jour-là — n'obtenait aucun badge, et le score
// restait indéfiniment « en attente » (part `null` → `shares: null`).
describe("filledCellShare — cohorte close (grille passée)", () => {
  it("lit un pays que personne n'a choisi comme une part de 0, donc ultra", () => {
    const cellDist = { totalGuesses: 10, rarityByCountry: { MCO: 0.8 } };
    expect(filledCellShare("NRU", cellDist, true)).toEqual({
      share: 0,
      estimated: false,
    });
    expect(filledCellTier("NRU", cellDist, true)).toBe("ultra");
  });

  it("se résout même sur une case que personne n'a jamais jouée", () => {
    // Sans cela le score d'entraînement ne se résoudrait jamais.
    expect(
      filledCellShare("NRU", { totalGuesses: 0, rarityByCountry: {} }, true),
    ).toEqual({ share: 0, estimated: false });
  });

  it("ne marque jamais « estimated » : rien ne s'affinera sur une cohorte figée", () => {
    expect(
      filledCellShare(
        "FR",
        { totalGuesses: 2, rarityByCountry: { FR: 0.5 } },
        true,
      ),
    ).toEqual({ share: 0.5, estimated: false });
  });

  it("reste null tant que la distribution n'est pas chargée", () => {
    expect(filledCellShare("NRU", undefined, true)).toBeNull();
  });

  it("laisse la grille du jour inchangée : absent = pas encore agrégé", () => {
    const cellDist = { totalGuesses: 10, rarityByCountry: { MCO: 0.8 } };
    expect(filledCellShare("NRU", cellDist)).toBeNull();
    expect(filledCellShare("NRU", cellDist, false)).toBeNull();
  });
});

describe("isCohortComplete", () => {
  it("close en entraînement, ouverte sur la grille du jour", () => {
    expect(isCohortComplete("training")).toBe(true);
    expect(isCohortComplete("daily")).toBe(false);
  });
});
