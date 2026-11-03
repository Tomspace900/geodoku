import { describe, expect, it } from "vitest";
import { bestCombo } from "../bestCombo";
import { toGuessDistribution } from "../distribution";

const ANSWERS: Record<string, string[]> = {
  "0,0": ["FRA", "DEU"],
  "0,1": ["FRA", "ITA"],
  "0,2": ["ESP"],
  "1,0": ["PRT"],
  "1,1": ["BEL"],
  "1,2": ["NLD"],
  "2,0": ["AUT"],
  "2,1": ["CHE"],
  "2,2": ["POL"],
};

describe("bestCombo", () => {
  it("choisit le pays le plus rare de chaque case", () => {
    const distribution = toGuessDistribution({
      "0,0": { FRA: 9, DEU: 1 },
    });
    expect(bestCombo(ANSWERS, distribution)?.["0,0"].iso).toBe("DEU");
  });

  it("ne réutilise jamais un pays, même s'il est le plus rare de deux cases", () => {
    // FRA est inédit dans 0,0 comme dans 0,1. En 0,0 l'autre choix (DEU) ne
    // rapporte rien, en 0,1 ITA (25 %) rapporte encore : FRA va donc en 0,0.
    const distribution = toGuessDistribution({
      "0,0": { DEU: 9 },
      "0,1": { ITA: 1, ESP: 3 },
    });
    const combo = bestCombo(ANSWERS, distribution);
    expect([combo?.["0,0"].iso, combo?.["0,1"].iso]).toEqual(["FRA", "ITA"]);
  });

  it("vaut une part de 0 pour un pays que personne n'a choisi", () => {
    expect(bestCombo(ANSWERS, undefined)?.["2,2"]).toEqual({
      iso: "POL",
      share: 0,
    });
  });

  it("renvoie null pour une grille sans solution complète", () => {
    expect(bestCombo({ ...ANSWERS, "2,2": ["ESP"] }, undefined)).toBeNull();
  });
});
