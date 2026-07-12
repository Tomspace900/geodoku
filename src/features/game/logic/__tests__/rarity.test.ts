import { describe, expect, it } from "vitest";
import {
  filledCellTier,
  formatRarityPercent,
  playerCellTier,
  playerLeaveOneOutShare,
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

describe("playerLeaveOneOutShare (part des autres joueurs)", () => {
  it("exclut le coup du joueur : (count − 1) / (total − 1)", () => {
    // FR pris par 3 des 10 joueurs → parmi les autres : 2 / 9.
    expect(
      playerLeaveOneOutShare("FR", {
        totalGuesses: 10,
        rarityByCountry: { FR: 0.3 },
      }),
    ).toEqual({ share: 2 / 9, estimated: false });
  });

  it("total ≤ 2 : leave-one-out dégénéré → part brute + estimated", () => {
    // total = 2 : (count − 1) / 1 ne vaudrait que 0 ou 1 → on garde la brute.
    expect(
      playerLeaveOneOutShare("FR", {
        totalGuesses: 2,
        rarityByCountry: { FR: 0.5 },
      }),
    ).toEqual({ share: 0.5, estimated: true });
  });

  it("total = 1 : pas de division par zéro → part brute + estimated", () => {
    expect(
      playerLeaveOneOutShare("FR", {
        totalGuesses: 1,
        rarityByCountry: { FR: 1 },
      }),
    ).toEqual({ share: 1, estimated: true });
  });

  it("total = 3 : leave-one-out déjà utilisé, mais encore estimated", () => {
    // FR pris par 1 des 3 joueurs → parmi les autres 0 / 2 = 0 (≠ brute 1/3).
    expect(
      playerLeaveOneOutShare("FR", {
        totalGuesses: 3,
        rarityByCountry: { FR: 1 / 3 },
      }),
    ).toEqual({ share: 0, estimated: true });
  });

  it("total = 5 : leave-one-out, l'avertissement estimated s'éteint", () => {
    // FR pris par 2 des 5 joueurs → parmi les autres 1 / 4 = 0,25.
    expect(
      playerLeaveOneOutShare("FR", {
        totalGuesses: 5,
        rarityByCountry: { FR: 2 / 5 },
      }),
    ).toEqual({ share: 0.25, estimated: false });
  });

  it("null sans donnée pour ce pays / cette case", () => {
    expect(
      playerLeaveOneOutShare("FR", {
        totalGuesses: 10,
        rarityByCountry: { IT: 0.5 },
      }),
    ).toBeNull();
    expect(playerLeaveOneOutShare("FR", undefined)).toBeNull();
  });
});

describe("playerCellTier (tier du joueur, leave-one-out)", () => {
  it("dérive le tier de la part des AUTRES joueurs", () => {
    // Toi seul sur FR (count 1 / total 10) → parmi les autres 0 / 9 = 0 → ultra.
    expect(
      playerCellTier("FR", { totalGuesses: 10, rarityByCountry: { FR: 0.1 } }),
    ).toBe("ultra");
  });
});
