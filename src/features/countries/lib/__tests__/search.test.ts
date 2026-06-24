import { describe, expect, it } from "vitest";
import { getCountryByIso3, searchCountries } from "../search";

describe("searchCountries — FR", () => {
  it("finds France by full name in French", () => {
    const results = searchCountries("France", "fr");
    expect(results.some((c) => c.iso3 === "FRA")).toBe(true);
  });

  it("finds France by prefix 'fra' (case insensitive)", () => {
    const results = searchCountries("fra", "fr");
    expect(results.some((c) => c.iso3 === "FRA")).toBe(true);
  });

  it("finds France by uppercase 'FRA'", () => {
    const results = searchCountries("FRA", "fr");
    expect(results.some((c) => c.iso3 === "FRA")).toBe(true);
  });

  it("finds Brazil by French name 'brésil'", () => {
    const results = searchCountries("brésil", "fr");
    expect(results.some((c) => c.iso3 === "BRA")).toBe(true);
  });

  it("finds USA by alias 'États-Unis'", () => {
    const results = searchCountries("états-unis", "fr");
    expect(results.some((c) => c.iso3 === "USA")).toBe(true);
  });

  it("finds Germany by ISO3 code 'deu'", () => {
    const results = searchCountries("deu", "fr");
    expect(results.some((c) => c.iso3 === "DEU")).toBe(true);
  });

  it("finds Germany by ISO2 code 'de'", () => {
    const results = searchCountries("de", "fr");
    expect(results.some((c) => c.iso3 === "DEU")).toBe(true);
  });

  it("returns empty array for empty query", () => {
    expect(searchCountries("", "fr")).toEqual([]);
  });

  it("returns empty array for unrecognised query", () => {
    expect(searchCountries("xyznotacountryatall", "fr")).toEqual([]);
  });

  it("respects the limit parameter", () => {
    const results = searchCountries("a", "fr", 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("returns at most 8 results by default", () => {
    const results = searchCountries("a", "fr");
    expect(results.length).toBeLessThanOrEqual(8);
  });

  it("finds Saint-Marin when query omits the hyphen", () => {
    const results = searchCountries("saint mar", "fr");
    expect(results.some((c) => c.iso3 === "SMR")).toBe(true);
  });

  it("finds Germany by English name while locale is French", () => {
    const results = searchCountries("germany", "fr");
    expect(results.some((c) => c.iso3 === "DEU")).toBe(true);
  });

  it("finds USA by English alias while locale is French", () => {
    const results = searchCountries("united states", "fr");
    expect(results.some((c) => c.iso3 === "USA")).toBe(true);
  });
});

describe("searchCountries — EN", () => {
  it("finds France by English name", () => {
    const results = searchCountries("France", "en");
    expect(results.some((c) => c.iso3 === "FRA")).toBe(true);
  });

  it("finds United States by partial name 'united'", () => {
    const results = searchCountries("united", "en");
    expect(results.some((c) => c.iso3 === "USA")).toBe(true);
  });

  it("finds Germany by English name", () => {
    const results = searchCountries("Germany", "en");
    expect(results.some((c) => c.iso3 === "DEU")).toBe(true);
  });

  it("finds USA by alias 'USA'", () => {
    const results = searchCountries("USA", "en");
    expect(results.some((c) => c.iso3 === "USA")).toBe(true);
  });

  it("finds UK by alias 'UK'", () => {
    const results = searchCountries("UK", "en");
    expect(results.some((c) => c.iso3 === "GBR")).toBe(true);
  });

  it("finds Kyrgyzstan by French name while locale is English", () => {
    const results = searchCountries("kirghizistan", "en");
    expect(results.some((c) => c.iso3 === "KGZ")).toBe(true);
  });
});

describe("getCountryByIso3", () => {
  it("returns the country for a valid ISO3 code", () => {
    const c = getCountryByIso3("FRA");
    expect(c).toBeDefined();
    expect(c?.iso3).toBe("FRA");
    expect(c?.iso2).toBe("FR");
    expect(c?.names.fr).toBe("France");
    expect(c?.names.en).toBe("France");
  });

  it("returns undefined for an unknown code", () => {
    expect(getCountryByIso3("ZZZ")).toBeUndefined();
  });
});
