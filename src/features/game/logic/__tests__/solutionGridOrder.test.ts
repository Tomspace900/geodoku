import { describe, expect, it } from "vitest";
import { raritySharePercent } from "../rarity";
import {
  orderSolutionCountries,
  resolveSolutionCountryTier,
} from "../solutionGridOrder";

const compareIso = (a: string, b: string) => a.localeCompare(b);

describe("resolveSolutionCountryTier", () => {
  it("derives every country's tier from the day's share (player's pick included)", () => {
    // 0.5 n'est pas > 0.5 → uncommon (même chemin pour la réponse du joueur).
    expect(resolveSolutionCountryTier("FR", 10, { FR: 0.5 })).toBe("uncommon");
  });

  it("maps 0% share to ultra when stats exist", () => {
    expect(resolveSolutionCountryTier("AL", 5, {})).toBe("ultra");
  });

  it("returns null when no stats yet", () => {
    expect(resolveSolutionCountryTier("FR", 0, {})).toBeNull();
  });
});

describe("orderSolutionCountries", () => {
  it("sorts by share ascending, then name", () => {
    const ordered = orderSolutionCountries(
      ["FR", "IT", "AL", "HR", "ME", "SI", "TR"],
      12,
      { IT: 0.08, HR: 0.08, TR: 0.08, FR: 0.25 },
      compareIso,
    );
    expect(ordered.map((c) => c.iso)).toEqual([
      "AL",
      "ME",
      "SI",
      "HR",
      "IT",
      "TR",
      "FR",
    ]);
  });

  it("falls back to alphabetical when no stats", () => {
    const ordered = orderSolutionCountries(
      ["DE", "AT", "CH"],
      0,
      {},
      compareIso,
    );
    expect(ordered.map((c) => c.iso)).toEqual(["AT", "CH", "DE"]);
    expect(ordered.every((c) => c.tier === null)).toBe(true);
  });

  it("sorts by share ascending even below the display threshold (<5)", () => {
    const ordered = orderSolutionCountries(
      ["FR", "IT", "AL"],
      4,
      { FR: 0.5, IT: 0.25, AL: 0.05 },
      compareIso,
    );
    expect(ordered.map((c) => c.iso)).toEqual(["AL", "IT", "FR"]);
  });

  it("below 5, orders same-tier countries by finer share, not just by tier", () => {
    // AT 20 %, CH 15 % : même tier (rare), mais CH est plus rare → CH avant AT.
    // Un tri par tier seul (puis nom alphabétique) donnerait AT avant CH.
    const ordered = orderSolutionCountries(
      ["AT", "CH"],
      4,
      { AT: 0.2, CH: 0.15 },
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
    const ordered = orderSolutionCountries(
      ["FR", "IT", "AL", "HR", "ME", "SI", "TR"],
      12,
      rarityByCountry,
      compareIso,
    );
    const displayed = ordered.map(({ iso }) =>
      raritySharePercent(rarityByCountry[iso] ?? 0),
    );
    for (let i = 1; i < displayed.length; i++) {
      expect(displayed[i]).toBeGreaterThanOrEqual(displayed[i - 1]!);
    }
  });
});
