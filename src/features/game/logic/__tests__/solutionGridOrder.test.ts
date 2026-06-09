import { describe, expect, it } from "vitest";
import { raritySharePercent } from "../rarity";
import {
  orderSolutionCountries,
  resolveSolutionCountryTier,
} from "../solutionGridOrder";

const compareIso = (a: string, b: string) => a.localeCompare(b);

describe("resolveSolutionCountryTier", () => {
  it("uses the player's tier for their own pick", () => {
    expect(
      resolveSolutionCountryTier(
        "FR",
        {
          status: "filled",
          countryCode: "FR",
          rarity: 0.2,
          rarityTier: "rare",
        },
        10,
        { FR: 0.5 },
      ),
    ).toBe("rare");
  });

  it("maps 0% share to ultra when stats exist", () => {
    expect(resolveSolutionCountryTier("AL", undefined, 5, {})).toBe("ultra");
  });

  it("returns null when no stats yet", () => {
    expect(resolveSolutionCountryTier("FR", undefined, 0, {})).toBeNull();
  });
});

describe("orderSolutionCountries", () => {
  it("sorts by share ascending, then name", () => {
    const ordered = orderSolutionCountries(
      ["FR", "IT", "AL", "HR", "ME", "SI", "TR"],
      12,
      { IT: 0.08, HR: 0.08, TR: 0.08, FR: 0.25 },
      undefined,
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
      undefined,
      compareIso,
    );
    expect(ordered.map((c) => c.iso)).toEqual(["AT", "CH", "DE"]);
    expect(ordered.every((c) => c.tier === null)).toBe(true);
  });

  it("sorts by tier when stats exist but share percent is hidden", () => {
    const ordered = orderSolutionCountries(
      ["FR", "IT", "AL"],
      4,
      { FR: 0.5, IT: 0.25, AL: 0.05 },
      undefined,
      compareIso,
    );
    expect(ordered.map((c) => c.iso)).toEqual(["AL", "IT", "FR"]);
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
      undefined,
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
