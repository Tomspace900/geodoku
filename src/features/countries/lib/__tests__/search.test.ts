import { describe, expect, it } from "vitest";
import { getCountryByCode, searchCountries } from "../search";

describe("searchCountries", () => {
  it("finds France by full name", () => {
    const results = searchCountries("France");
    expect(results.some((c) => c.code === "FRA")).toBe(true);
  });

  it("finds France by prefix 'fra' (case insensitive)", () => {
    const results = searchCountries("fra");
    expect(results.some((c) => c.code === "FRA")).toBe(true);
  });

  it("finds France by uppercase 'FRA'", () => {
    const results = searchCountries("FRA");
    expect(results.some((c) => c.code === "FRA")).toBe(true);
  });

  it("finds Germany by ISO3 code 'deu'", () => {
    const results = searchCountries("deu");
    expect(results.some((c) => c.code === "DEU")).toBe(true);
  });

  it("finds United States by partial name 'united'", () => {
    const results = searchCountries("united");
    expect(results.some((c) => c.code === "USA")).toBe(true);
  });

  it("returns empty array for empty query", () => {
    expect(searchCountries("")).toEqual([]);
  });

  it("returns empty array for unrecognised query", () => {
    expect(searchCountries("xyznotacountryatall")).toEqual([]);
  });

  it("respects the limit parameter", () => {
    const results = searchCountries("a", 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("returns at most 8 results by default", () => {
    const results = searchCountries("a");
    expect(results.length).toBeLessThanOrEqual(8);
  });
});

describe("getCountryByCode", () => {
  it("returns the country for a valid ISO3 code", () => {
    const c = getCountryByCode("FRA");
    expect(c).toBeDefined();
    expect(c?.nameCanonical).toBe("France");
  });

  it("returns undefined for an unknown code", () => {
    expect(getCountryByCode("ZZZ")).toBeUndefined();
  });
});
