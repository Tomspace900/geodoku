import { describe, expect, it } from "vitest";
import type { Country } from "../../src/features/countries/types.ts";
import {
  type Patches,
  type RcEnrichRow,
  assignPopularity,
  buildAliases,
  dedupe,
  deriveContinent,
  deriveWaterAccess,
  gameplayArraysForCode,
  mapLanguages,
  mergeFlagFields,
  parseFlagFromAlt,
  physicalFeaturesForCode,
  rcEnrichmentMapFromRows,
  regimeForCode,
  toWikipediaTitle,
} from "./buildCountriesLib.ts";

function minimalCountry(code: string): Country {
  return {
    code,
    names: { fr: "X", en: "X" },
    aliases: { fr: [code], en: [code] },
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
    events: [],
    groups: [],
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
      { cca3: "FRA", population: 1, flags: { alt: "blue white red" } },
      { cca3: ["GBR", "IMN"], population: 2 },
      { cca3: "bad", population: 99 },
    ];
    const m = rcEnrichmentMapFromRows(rows);
    expect(m.get("FRA")?.population).toBe(1);
    expect(m.get("IMN")?.population).toBe(2);
    expect(m.has("bad")).toBe(false);
  });
});

describe("parseFlagFromAlt", () => {
  it("returns empty for missing alt", () => {
    expect(parseFlagFromAlt(undefined).flagColors).toEqual([]);
    expect(parseFlagFromAlt("  ").flagSymbols).toEqual([]);
  });

  it("detects colors and symbols from prose", () => {
    const p = parseFlagFromAlt(
      "A red, blue, white flag with a golden eagle and a cross; green stripe",
    );
    expect(p.flagColors).toEqual(
      expect.arrayContaining(["red", "blue", "white", "green", "yellow"]),
    );
    expect(p.flagSymbols).toEqual(expect.arrayContaining(["cross", "animal"]));
  });

  it("maps ultramarine and other alt words to blue (e.g. Barbados)", () => {
    const p = parseFlagFromAlt(
      "Three vertical bands of ultramarine, gold, ultramarine with a black trident",
    );
    expect(p.flagColors).toEqual(
      expect.arrayContaining(["blue", "yellow", "black"]),
    );
  });
});

describe("buildAliases", () => {
  it("dedupes [localized name, cca2, cca3] and appends overrides", () => {
    const a = buildAliases("France", "France", "FR", "FRA", {
      en: ["French Republic", "FRA", "FR"],
    });
    expect(a.en[0]).toBe("France");
    expect(new Set(a.en).size).toBe(a.en.length);
    expect(a.en).toContain("French Republic");
  });
});

describe("toWikipediaTitle", () => {
  it("replaces spaces with underscores", () => {
    expect(toWikipediaTitle("Czech Republic")).toBe("Czech_Republic");
  });
});

describe("mergeFlagFields", () => {
  const parsed = {
    flagColors: ["red" as const],
    flagSymbols: [] as Country["flagSymbols"],
  };
  const emptyPatches: Patches = {
    overrides: {},
    aliasOverrides: {},
    additions: [],
  };

  it("uses parsed when no flagOverrides entry", () => {
    expect(mergeFlagFields("FRA", parsed, emptyPatches)).toEqual(parsed);
  });

  it("merges from patches.flagOverrides when set", () => {
    const patches: Patches = {
      ...emptyPatches,
      flagOverrides: { FRA: { flagColors: ["blue", "white", "red"] } },
    };
    const m = mergeFlagFields("FRA", parsed, patches);
    expect(m.flagColors).toEqual(["blue", "white", "red"]);
    expect(m.flagSymbols).toEqual([]);
  });
});

describe("gameplayArraysForCode", () => {
  const patches: Patches = {
    overrides: {},
    aliasOverrides: {},
    additions: [],
    eventFifaWcHost: ["FRA"],
    eventSummerOlympicsHost: ["FRA", "GRC"],
    euMemberCodes: ["FRA"],
    g20MemberCodes: ["FRA", "USA"],
    natoMemberCodes: ["FRA", "USA"],
    commonwealthMemberCodes: ["GBR", "IND"],
    middleEastCodes: ["SYR"],
  };

  it("stacks all matching tags for one code", () => {
    const g = gameplayArraysForCode("FRA", patches);
    expect(g.events).toEqual(["fifa_wc_host", "summer_olympics_host"]);
    expect(g.groups).toEqual(["eu", "g20", "nato"]);
  });

  it("emits commonwealth group when listed", () => {
    const g = gameplayArraysForCode("IND", patches);
    expect(g.groups).toEqual(["commonwealth"]);
  });

  it("adds middle_east geo tag when listed", () => {
    const g = gameplayArraysForCode("SYR", patches);
    expect(g.geoTags).toEqual(["middle_east"]);
  });
});

describe("regimeForCode", () => {
  const patches: Patches = {
    overrides: {},
    aliasOverrides: {},
    additions: [],
    monarchyCodes: ["GBR", "JPN"],
  };

  it("returns monarchy when code is listed", () => {
    expect(regimeForCode("GBR", patches)).toBe("monarchy");
    expect(regimeForCode("JPN", patches)).toBe("monarchy");
  });

  it("defaults to republic otherwise", () => {
    expect(regimeForCode("FRA", patches)).toBe("republic");
    expect(regimeForCode("USA", patches)).toBe("republic");
  });
});

describe("physicalFeaturesForCode", () => {
  const patches: Patches = {
    overrides: {},
    aliasOverrides: {},
    additions: [],
    equatorCrosserCodes: ["ECU", "BRA"],
    mediterraneanCoastCodes: ["FRA", "ITA"],
    caribbeanCoastCodes: ["COL", "VEN"],
    peakOver5000mCodes: ["FRA", "NPL"],
  };

  it("stacks all matching physical features", () => {
    expect(physicalFeaturesForCode("FRA", patches)).toEqual([
      "mediterranean_coast",
      "peak_over_5000m",
    ]);
    expect(physicalFeaturesForCode("BRA", patches)).toEqual([
      "equator_crosser",
    ]);
  });

  it("returns empty when no features listed", () => {
    expect(physicalFeaturesForCode("JPN", patches)).toEqual([]);
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
