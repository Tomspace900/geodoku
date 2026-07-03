import { describe, expect, it } from "vitest";
import type { Country } from "../../src/features/countries/types.ts";
import {
  type FlagData,
  type GameplayClassifications,
  type RcEnrichRow,
  type RcEnrichment,
  applySourceCorrections,
  assignPopularity,
  buildAliases,
  dedupe,
  deriveContinent,
  deriveWaterAccess,
  flagFieldsForCode,
  gameplayArraysForCode,
  mapLanguages,
  physicalFeaturesForCode,
  rcEnrichmentMapFromRows,
  regimeForCode,
  toWikipediaTitle,
} from "./buildCountriesLib.ts";

function minimalCountry(code: string): Country {
  return {
    iso3: code,
    iso2: code.slice(0, 2),
    names: { fr: "X", en: "X" },
    aliases: [code],
    flagEmoji: "🏳️",
    continent: "europe",
    waterAccess: "landlocked",
    borders: [],
    areaKm2: 1,
    population: 1,
    officialLanguages: ["en"],
    latitude: 0,
    subregion: "",
    flagColors: ["red"],
    flagSymbols: [],
    flagLayout: [],
    events: [],
    memberships: [],
    capitals: [],
    drivingSide: "right",
    geoTags: [],
    regime: "republic",
    physicalFeatures: [],
  };
}

describe("deriveContinent", () => {
  it("maps UN regions to game continents", () => {
    expect(deriveContinent("Europe", "Western Europe")).toBe("europe");
    expect(deriveContinent("Africa", "Western Africa")).toBe("africa");
    expect(deriveContinent("Asia", "Western Asia")).toBe("asia");
    expect(deriveContinent("Oceania", "Polynesia")).toBe("oceania");
  });

  it("splits Americas by subregion", () => {
    expect(deriveContinent("Americas", "South America")).toBe("south_america");
    expect(deriveContinent("Americas", "Caribbean")).toBe("north_america");
  });

  it("throws on unknown region", () => {
    expect(() => deriveContinent("Atlantis", "N/A")).toThrow(/Unknown region/);
  });
});

describe("deriveWaterAccess", () => {
  it("classifies by landlock and border count", () => {
    expect(deriveWaterAccess(true, 2)).toBe("landlocked");
    expect(deriveWaterAccess(false, 0)).toBe("island");
    expect(deriveWaterAccess(false, 3)).toBe("coastal");
  });
});

describe("mapLanguages", () => {
  it("maps ISO 639-3 keys to 639-1 when known", () => {
    expect(mapLanguages({ eng: "English", fra: "French" })).toEqual([
      "en",
      "fr",
    ]);
  });

  it("keeps 639-3 when there is no 639-1 mapping (null) or unknown code", () => {
    expect(mapLanguages({ cnr: "Montenegrin" })).toEqual(["cnr"]);
    expect(mapLanguages({ xyz: "Other" })).toEqual(["xyz"]);
  });
});

describe("rcEnrichmentMapFromRows", () => {
  it("merges cca3 string or array, skips bad codes", () => {
    const rows: RcEnrichRow[] = [
      { cca3: "FRA", iso2: "FR", population: 1, drivingSide: "right" },
      { cca3: ["GBR", "IMN"], iso2: "GB", population: 2, drivingSide: "left" },
      { cca3: "bad", population: 99 },
    ];
    const m = rcEnrichmentMapFromRows(rows);
    expect(m.get("FRA")?.population).toBe(1);
    expect(m.get("IMN")?.population).toBe(2);
    expect(m.has("bad")).toBe(false);
  });
});

describe("buildAliases", () => {
  it("dedupes extra aliases only", () => {
    const a = buildAliases(["French Republic", "FRA", "FR", "FRA"]);
    expect(a[0]).toBe("French Republic");
    expect(new Set(a).size).toBe(a.length);
    expect(a).toEqual(["French Republic", "FRA", "FR"]);
  });
});

describe("toWikipediaTitle", () => {
  it("replaces spaces with underscores", () => {
    expect(toWikipediaTitle("Czech Republic")).toBe("Czech_Republic");
  });
});

describe("flagFieldsForCode", () => {
  const flagData: FlagData = {
    FRA: {
      flagColors: ["blue", "white", "red"],
      flagSymbols: [],
      flagLayout: ["vertical_stripes"],
    },
    NOR: {
      flagColors: ["red", "blue", "white"],
      flagSymbols: ["cross"],
      flagLayout: [],
    },
  };

  it("returns the curated entry for a known code", () => {
    expect(flagFieldsForCode("NOR", flagData)).toEqual({
      flagColors: ["red", "blue", "white"],
      flagSymbols: ["cross"],
      flagLayout: [],
    });
  });

  it("throws on a missing entry (no silent incomplete table)", () => {
    expect(() => flagFieldsForCode("ZZZ", flagData)).toThrow(
      /missing flagData/,
    );
  });
});

describe("applySourceCorrections", () => {
  it("only patches allowed source fields", () => {
    const country = minimalCountry("AUS");
    country.waterAccess = "island";
    applySourceCorrections(country, { waterAccess: "coastal" });
    expect(country.waterAccess).toBe("coastal");
    applySourceCorrections(country, { borders: ["NZL"] });
    expect(country.borders).toEqual(["NZL"]);
  });
});

describe("gameplayArraysForCode", () => {
  const classifications: GameplayClassifications = {
    middleEast: ["SYR"],
    eventFifaWcHost: ["FRA"],
    eventSummerOlympicsHost: ["FRA", "GRC"],
    monarchy: [],
    equatorCrosser: [],
    mediterraneanCoast: [],
    caribbeanCoast: [],
    peakOver5000m: [],
    capitalNotLargest: ["USA"],
    desert: [],
    rainforest: [],
    atlanticCoast: [],
    pacificCoast: [],
    indianOceanCoast: [],
  };
  const rc: RcEnrichment = {
    iso2: "FR",
    population: 1,
    alternateNames: [],
    capitals: [],
    drivingSide: "right" as const,
    memberships: ["eu", "g20", "nato"],
  };

  it("stacks all matching tags for one code", () => {
    const g = gameplayArraysForCode("FRA", classifications, rc);
    expect(g.events).toEqual(["fifa_wc_host", "summer_olympics_host"]);
  });

  it("adds middle_east geo tag when listed", () => {
    const g = gameplayArraysForCode("SYR", classifications, rc);
    expect(g.geoTags).toEqual(["middle_east"]);
  });

  it("adds society geo tags from REST Countries and curated classifications", () => {
    expect(
      gameplayArraysForCode("JPN", classifications, {
        ...rc,
        drivingSide: "left",
      }).geoTags,
    ).toEqual(["drives_on_left"]);
    expect(gameplayArraysForCode("USA", classifications, rc).geoTags).toEqual([
      "capital_not_largest",
    ]);
  });
});

describe("regimeForCode", () => {
  const classifications: GameplayClassifications = {
    middleEast: [],
    eventFifaWcHost: [],
    eventSummerOlympicsHost: [],
    monarchy: ["GBR", "JPN"],
    equatorCrosser: [],
    mediterraneanCoast: [],
    caribbeanCoast: [],
    peakOver5000m: [],
    capitalNotLargest: [],
    desert: [],
    rainforest: [],
    atlanticCoast: [],
    pacificCoast: [],
    indianOceanCoast: [],
  };

  it("returns monarchy when code is listed", () => {
    expect(regimeForCode("GBR", classifications)).toBe("monarchy");
    expect(regimeForCode("JPN", classifications)).toBe("monarchy");
  });

  it("defaults to republic otherwise", () => {
    expect(regimeForCode("FRA", classifications)).toBe("republic");
    expect(regimeForCode("USA", classifications)).toBe("republic");
  });
});

describe("physicalFeaturesForCode", () => {
  const classifications: GameplayClassifications = {
    middleEast: [],
    eventFifaWcHost: [],
    eventSummerOlympicsHost: [],
    monarchy: [],
    equatorCrosser: ["ECU", "BRA"],
    mediterraneanCoast: ["FRA", "ITA"],
    caribbeanCoast: ["COL", "VEN"],
    peakOver5000m: ["FRA", "NPL"],
    capitalNotLargest: [],
    desert: ["DZA"],
    rainforest: ["COD"],
    atlanticCoast: ["PRT"],
    pacificCoast: ["CHL", "JPN"],
    indianOceanCoast: ["KEN", "IND"],
  };

  it("stacks all matching physical features", () => {
    expect(physicalFeaturesForCode("FRA", classifications)).toEqual([
      "mediterranean_coast",
      "peak_over_5000m",
    ]);
    expect(physicalFeaturesForCode("BRA", classifications)).toEqual([
      "equator_crosser",
    ]);
  });

  it("stacks biome and ocean features", () => {
    expect(physicalFeaturesForCode("DZA", classifications)).toEqual([
      "has_desert",
    ]);
    expect(physicalFeaturesForCode("COD", classifications)).toEqual([
      "rainforest",
    ]);
    expect(physicalFeaturesForCode("PRT", classifications)).toEqual([
      "atlantic_coast",
    ]);
    expect(physicalFeaturesForCode("CHL", classifications)).toEqual([
      "pacific_coast",
    ]);
    expect(physicalFeaturesForCode("KEN", classifications)).toEqual([
      "indian_ocean_coast",
    ]);
  });

  it("returns empty when no features listed", () => {
    expect(physicalFeaturesForCode("POL", classifications)).toEqual([]);
  });
});

describe("dedupe", () => {
  it("removes duplicates while preserving first-seen order", () => {
    expect(dedupe(["a", "b", "a", "c"])).toEqual(["a", "b", "c"]);
  });
});

describe("assignPopularity", () => {
  it("maps pageviews to percentile rank 0..1 (two countries)", () => {
    const a = minimalCountry("AAA");
    const b = minimalCountry("BBB");
    const map = new Map<string, number>([
      ["AAA", 10],
      ["BBB", 10_000],
    ]);
    assignPopularity([a, b], map);
    expect(a.popularityIndex).toBe(0);
    expect(b.popularityIndex).toBe(1);
  });

  it("maps three distinct pageviews to 0, 0.5, 1", () => {
    const a = minimalCountry("AAA");
    const b = minimalCountry("BBB");
    const c = minimalCountry("CCC");
    const map = new Map<string, number>([
      ["AAA", 10],
      ["BBB", 100],
      ["CCC", 10_000],
    ]);
    assignPopularity([a, b, c], map);
    expect(a.popularityIndex).toBe(0);
    expect(b.popularityIndex).toBe(0.5);
    expect(c.popularityIndex).toBe(1);
  });

  it("single country with views gets median rank 0.5", () => {
    const only = minimalCountry("ONLY");
    assignPopularity([only], new Map([["ONLY", 99999]]));
    expect(only.popularityIndex).toBe(0.5);
  });

  it("uses median fallback for countries missing from pageview map", () => {
    const a = minimalCountry("AAA");
    const b = minimalCountry("BBB");
    const c = minimalCountry("CCC");
    assignPopularity(
      [a, b, c],
      new Map([
        ["AAA", 10],
        ["BBB", 100],
      ]),
    );
    expect(a.popularityIndex).toBe(0);
    expect(b.popularityIndex).toBe(1);
    expect(c.popularityIndex).toBe(0.5);
  });

  it("uses average rank when pageview counts tie", () => {
    const a = minimalCountry("AAA");
    const b = minimalCountry("BBB");
    const c = minimalCountry("CCC");
    assignPopularity(
      [a, b, c],
      new Map([
        ["AAA", 100],
        ["BBB", 100],
        ["CCC", 200],
      ]),
    );
    expect(a.popularityIndex).toBe(0.25);
    expect(b.popularityIndex).toBe(0.25);
    expect(c.popularityIndex).toBe(1);
  });

  it("is a no-op when no country has valid pageviews", () => {
    const a = minimalCountry("AAA");
    assignPopularity([a], new Map());
    expect(a.wikipediaMonthlyViews).toBeUndefined();
    expect(a.popularityIndex).toBeUndefined();
  });
});
