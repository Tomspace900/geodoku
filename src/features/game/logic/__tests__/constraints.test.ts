import { describe, expect, it } from "vitest";
import countriesJson from "@/features/countries/data/countries.json" with {
  type: "json",
};
import type { Country } from "@/features/countries/types";
import { CONSTRAINT_BY_ID } from "@/features/game/logic/constraints";

const COUNTRIES = countriesJson as unknown as Country[];

function isSouthernHemisphere(iso3: string): boolean {
  const country = COUNTRIES.find((c) => c.iso3 === iso3);
  if (!country) throw new Error(`Pays absent du catalogue: ${iso3}`);
  const constraint = CONSTRAINT_BY_ID.get("latitude_south_hemisphere");
  if (!constraint) throw new Error("Contrainte hémisphère sud introuvable");
  return constraint.predicate(country);
}

describe("latitude_south_hemisphere", () => {
  // Les pays à cheval sur l'équateur sont tranchés sur la MAJORITÉ DE LA
  // SUPERFICIE TERRESTRE (cf. countryPatches). La latitude de world-countries est
  // arrondie au degré : ces 13 cas sont les seuls que l'arrondi peut faire basculer,
  // et une régénération de countries.json qui perdrait un patch se verrait ici.
  const EQUATOR_CROSSERS: ReadonlyArray<[string, boolean]> = [
    ["BRA", true],
    ["IDN", true],
    ["ECU", true],
    ["COG", true],
    ["GAB", true],
    ["COD", true],
    ["KEN", false],
    ["STP", false],
    ["UGA", false],
    ["KIR", false],
    ["MDV", false],
    ["COL", false],
    ["SOM", false],
  ];

  it("classe chaque pays à cheval sur l'équateur du côté de sa majorité de superficie", () => {
    const actual = EQUATOR_CROSSERS.map(
      ([iso3]) => [iso3, isSouthernHemisphere(iso3)] as const,
    );
    expect(actual).toEqual(EQUATOR_CROSSERS);
  });
});
