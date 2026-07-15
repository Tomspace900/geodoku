import { describe, expect, it } from "vitest";
import countriesJson from "../../src/features/countries/data/countries.json" with {
  type: "json",
};
import countryCodesJson from "../../src/features/countries/data/countryCodes.json" with {
  type: "json",
};
import type { Country } from "../../src/features/countries/types";
import flagDataJson from "./flagData.json" with { type: "json" };
import { validateCountryCatalog } from "./validateCountryCatalog";

describe("catalogue pays versionné", () => {
  const countries = countriesJson as Country[];

  it("respecte tous les invariants de contenu", () => {
    expect(validateCountryCatalog(countries)).toEqual([]);
  });

  it("garde la liste compacte ISO3 et les drapeaux curés synchronisés", () => {
    const codes = countries.map((country) => country.iso3).sort();
    expect({
      compact: [...countryCodesJson].sort(),
      flags: Object.keys(flagDataJson).sort(),
    }).toEqual({
      compact: codes,
      // Kosovo est une addition manuelle complète dans countryPatches.ts.
      flags: codes.filter((code) => code !== "XKX"),
    });
  });
});
