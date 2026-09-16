import { describe, expect, it } from "vitest";
import type { CellGuessDistribution } from "../../types";
import { raritySharePercent } from "../rarity";
import { orderSolutionCountries } from "../solutionGridOrder";

const compareIso = (a: string, b: string) => a.localeCompare(b);

describe("orderSolutionCountries", () => {
  it("sorts by share ascending, then name, with unresolved shares pushed to the end", () => {
    // AL/ME/SI n'ont pas encore de part agrégée (cohorte ouverte) : elles
    // suivent les réponses connues plutôt que de s'y mêler comme des « 0 % ».
    const cellDist: CellGuessDistribution = {
      totalGuesses: 12,
      rarityByCountry: { IT: 0.08, HR: 0.08, TR: 0.08, FR: 0.25 },
    };
    const ordered = orderSolutionCountries(
      ["FR", "IT", "AL", "HR", "ME", "SI", "TR"],
      cellDist,
      false,
      compareIso,
    );
    expect(ordered.map((c) => c.iso)).toEqual([
      "HR",
      "IT",
      "TR",
      "FR",
      "AL",
      "ME",
      "SI",
    ]);
    expect(ordered.filter((c) => ["AL", "ME", "SI"].includes(c.iso))).toEqual([
      { iso: "AL", tier: null },
      { iso: "ME", tier: null },
      { iso: "SI", tier: null },
    ]);
  });

  it("falls back to alphabetical without a distribution", () => {
    const ordered = orderSolutionCountries(
      ["DE", "AT", "CH"],
      undefined,
      false,
      compareIso,
    );
    expect(ordered.map((c) => c.iso)).toEqual(["AT", "CH", "DE"]);
    expect(ordered.every((c) => c.tier === null)).toBe(true);
  });

  it("sorts by share ascending even below the display threshold (<5)", () => {
    const cellDist: CellGuessDistribution = {
      totalGuesses: 4,
      rarityByCountry: { FR: 0.5, IT: 0.25, AL: 0.05 },
    };
    const ordered = orderSolutionCountries(
      ["FR", "IT", "AL"],
      cellDist,
      false,
      compareIso,
    );
    expect(ordered.map((c) => c.iso)).toEqual(["AL", "IT", "FR"]);
  });

  it("below 5, orders same-tier countries by finer share, not just by tier", () => {
    // AT 20 %, CH 15 % : même tier (rare), mais CH est plus rare → CH avant AT.
    // Un tri par tier seul (puis nom alphabétique) donnerait AT avant CH.
    const cellDist: CellGuessDistribution = {
      totalGuesses: 4,
      rarityByCountry: { AT: 0.2, CH: 0.15 },
    };
    const ordered = orderSolutionCountries(
      ["AT", "CH"],
      cellDist,
      false,
      compareIso,
    );
    expect(ordered.map((c) => c.iso)).toEqual(["CH", "AT"]);
  });

  it("keeps displayed percents monotonic top to bottom", () => {
    const rarityByCountry: Record<string, number> = {
      FR: 0.25,
      IT: 0.083,
      AL: 0,
      HR: 0.083,
      ME: 0,
      SI: 0,
      TR: 0.083,
    };
    const cellDist: CellGuessDistribution = {
      totalGuesses: 12,
      rarityByCountry,
    };
    const ordered = orderSolutionCountries(
      ["FR", "IT", "AL", "HR", "ME", "SI", "TR"],
      cellDist,
      false,
      compareIso,
    );
    const displayed = ordered.map(({ iso }) =>
      raritySharePercent(rarityByCountry[iso] ?? 0),
    );
    for (let i = 1; i < displayed.length; i++) {
      expect(displayed[i]).toBeGreaterThanOrEqual(displayed[i - 1]!);
    }
  });

  it("on a closed cohort, an absent answer sorts as the rarest (ultra, share 0)", () => {
    const cellDist: CellGuessDistribution = {
      totalGuesses: 3,
      rarityByCountry: { FR: 0.5 },
    };
    const ordered = orderSolutionCountries(
      ["FR", "DE"],
      cellDist,
      true,
      compareIso,
    );
    expect(ordered.map((c) => c.iso)).toEqual(["DE", "FR"]);
    expect(ordered[0]).toEqual({ iso: "DE", tier: "ultra" });
  });
});
