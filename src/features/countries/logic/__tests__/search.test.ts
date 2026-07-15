import { describe, expect, it } from "vitest";
import { getCountryByIso3, searchCountries } from "../search";

describe("searchCountries — FR", () => {
  it("finds France by full name in French", () => {
    const results = searchCountries("France");
    expect(results.some((c) => c.iso3 === "FRA")).toBe(true);
  });

  it("finds France by prefix 'fra' (case insensitive)", () => {
    const results = searchCountries("fra");
    expect(results.some((c) => c.iso3 === "FRA")).toBe(true);
  });

  it("finds France by uppercase 'FRA'", () => {
    const results = searchCountries("FRA");
    expect(results.some((c) => c.iso3 === "FRA")).toBe(true);
  });

  it("finds Brazil by French name 'brésil'", () => {
    const results = searchCountries("brésil");
    expect(results.some((c) => c.iso3 === "BRA")).toBe(true);
  });

  it("finds USA by alias 'États-Unis'", () => {
    const results = searchCountries("états-unis");
    expect(results.some((c) => c.iso3 === "USA")).toBe(true);
  });

  it("finds Germany by ISO3 code 'deu'", () => {
    const results = searchCountries("deu");
    expect(results.some((c) => c.iso3 === "DEU")).toBe(true);
  });

  it("finds Germany by ISO2 code 'de'", () => {
    const results = searchCountries("de");
    expect(results.some((c) => c.iso3 === "DEU")).toBe(true);
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

  it("finds Saint-Marin when query omits the hyphen", () => {
    const results = searchCountries("saint mar");
    expect(results.some((c) => c.iso3 === "SMR")).toBe(true);
  });

  it("finds Germany by English name while locale is French", () => {
    const results = searchCountries("germany");
    expect(results.some((c) => c.iso3 === "DEU")).toBe(true);
  });

  it("finds USA by English alias while locale is French", () => {
    const results = searchCountries("united states");
    expect(results.some((c) => c.iso3 === "USA")).toBe(true);
  });

  it("finds DR Congo by alias 'RDC'", () => {
    const results = searchCountries("rdc");
    expect(results.some((c) => c.iso3 === "COD")).toBe(true);
  });

  it("finds Cape Verde by alias 'Cabo Verde'", () => {
    const results = searchCountries("cabo verde");
    expect(results.some((c) => c.iso3 === "CPV")).toBe(true);
  });
});

describe("searchCountries — EN", () => {
  it("finds France by English name", () => {
    const results = searchCountries("France");
    expect(results.some((c) => c.iso3 === "FRA")).toBe(true);
  });

  it("finds United States by partial name 'united'", () => {
    const results = searchCountries("united");
    expect(results.some((c) => c.iso3 === "USA")).toBe(true);
  });

  it("finds Germany by English name", () => {
    const results = searchCountries("Germany");
    expect(results.some((c) => c.iso3 === "DEU")).toBe(true);
  });

  it("finds USA by alias 'USA'", () => {
    const results = searchCountries("USA");
    expect(results.some((c) => c.iso3 === "USA")).toBe(true);
  });

  it("finds UK by alias 'UK'", () => {
    const results = searchCountries("UK");
    expect(results.some((c) => c.iso3 === "GBR")).toBe(true);
  });

  it("finds UK by alias 'England'", () => {
    const results = searchCountries("england");
    expect(results.some((c) => c.iso3 === "GBR")).toBe(true);
  });

  it("finds DR Congo by alias 'DRC'", () => {
    const results = searchCountries("drc");
    expect(results.some((c) => c.iso3 === "COD")).toBe(true);
  });

  it("finds Kyrgyzstan by French name while locale is English", () => {
    const results = searchCountries("kirghizistan");
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
