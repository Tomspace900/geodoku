import { describe, expect, it } from "vitest";
import { getCountryByCode, searchCountries } from "../search";

describe("searchCountries — FR", () => {
  it("finds France by full name in French", () => {
    const results = searchCountries("France", "fr");
    expect(results.some((c) => c.code === "FRA")).toBe(true);
  });

  it("finds France by prefix 'fra' (case insensitive)", () => {
    const results = searchCountries("fra", "fr");
    expect(results.some((c) => c.code === "FRA")).toBe(true);
  });

  it("finds France by uppercase 'FRA'", () => {
    const results = searchCountries("FRA", "fr");
    expect(results.some((c) => c.code === "FRA")).toBe(true);
  });

  it("finds Brazil by French name 'brésil'", () => {
    const results = searchCountries("brésil", "fr");
    expect(results.some((c) => c.code === "BRA")).toBe(true);
  });

  it("finds USA by alias 'États-Unis'", () => {
    const results = searchCountries("états-unis", "fr");
    expect(results.some((c) => c.code === "USA")).toBe(true);
  });

  it("finds Germany by ISO3 code 'deu'", () => {
    const results = searchCountries("deu", "fr");
    expect(results.some((c) => c.code === "DEU")).toBe(true);
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
});

describe("searchCountries — EN", () => {
  it("finds France by English name", () => {
    const results = searchCountries("France", "en");
    expect(results.some((c) => c.code === "FRA")).toBe(true);
  });

  it("finds United States by partial name 'united'", () => {
    const results = searchCountries("united", "en");
    expect(results.some((c) => c.code === "USA")).toBe(true);
  });

  it("finds Germany by English name", () => {
    const results = searchCountries("Germany", "en");
    expect(results.some((c) => c.code === "DEU")).toBe(true);
  });

  it("finds USA by alias 'USA'", () => {
    const results = searchCountries("USA", "en");
    expect(results.some((c) => c.code === "USA")).toBe(true);
  });

  it("finds UK by alias 'UK'", () => {
    const results = searchCountries("UK", "en");
    expect(results.some((c) => c.code === "GBR")).toBe(true);
  });
});

describe("getCountryByCode", () => {
  it("returns the country for a valid ISO3 code", () => {
    const c = getCountryByCode("FRA");
    expect(c).toBeDefined();
    expect(c?.names.fr).toBe("France");
    expect(c?.names.en).toBe("France");
  });

  it("returns undefined for an unknown code", () => {
    expect(getCountryByCode("ZZZ")).toBeUndefined();
  });
});
