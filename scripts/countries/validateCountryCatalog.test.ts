import { describe, expect, it } from "vitest";
import { COUNTRY_CATALOG } from "../../content/countries/catalog";
import { COUNTRY_CODES } from "../../content/countries/countryCodes";
import { COUNTRY_FACTS } from "../../content/countries/facts";
import flagDataJson from "./flagData.json" with { type: "json" };
import {
  validateCountryCatalog,
  validateCountryFacts,
} from "./validateCountryCatalog";

describe("catalogue pays versionné", () => {
  it("respecte les invariants d'identité", () => {
    expect(validateCountryCatalog(COUNTRY_CATALOG)).toEqual([]);
  });

  it("respecte les invariants de faits gameplay", () => {
    expect(validateCountryFacts(COUNTRY_FACTS, COUNTRY_CODES)).toEqual([]);
  });

  it("garde la liste compacte ISO3 et les drapeaux curés synchronisés", () => {
    const codes = COUNTRY_CATALOG.map((country) => country.iso3).sort();
    expect({
      compact: [...COUNTRY_CODES].sort(),
      flags: Object.keys(flagDataJson).sort(),
    }).toEqual({
      compact: codes,
      // Kosovo est une addition manuelle complète dans countryPatches.ts.
      flags: codes.filter((code) => code !== "XKX"),
    });
  });
});
