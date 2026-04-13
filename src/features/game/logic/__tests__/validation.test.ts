import countriesJson from "@/features/countries/data/countries.json";
import type { Country } from "@/features/countries/types";
import { describe, expect, it } from "vitest";
import { validateGuess } from "../validation";

const countries = countriesJson as Country[];

function byCode(code: string): Country {
  const c = countries.find((c) => c.code === code);
  if (!c) throw new Error(`Country not found: ${code}`);
  return c;
}

// Austria: Europe + landlocked  → satisfies continent_europe AND water_landlocked
// France:  Europe + coastal     → satisfies continent_europe, NOT water_landlocked
// Zimbabwe: Africa + landlocked → NOT continent_europe, satisfies water_landlocked

const austria = byCode("AUT");
const france = byCode("FRA");
const zimbabwe = byCode("ZWE");

describe("validateGuess", () => {
  it("returns already_used when country is in usedCountries", () => {
    const result = validateGuess({
      rowConstraintId: "continent_europe",
      colConstraintId: "water_landlocked",
      country: austria,
      usedCountries: new Set(["AUT"]),
    });
    expect(result).toEqual({ valid: false, reason: "already_used" });
  });

  it("returns wrong_row when country does not satisfy row constraint", () => {
    // Zimbabwe is NOT in Europe
    const result = validateGuess({
      rowConstraintId: "continent_europe",
      colConstraintId: "water_landlocked",
      country: zimbabwe,
      usedCountries: new Set(),
    });
    expect(result).toEqual({ valid: false, reason: "wrong_row" });
  });

  it("returns wrong_col when country satisfies row but not col constraint", () => {
    // France IS in Europe but is NOT landlocked
    const result = validateGuess({
      rowConstraintId: "continent_europe",
      colConstraintId: "water_landlocked",
      country: france,
      usedCountries: new Set(),
    });
    expect(result).toEqual({ valid: false, reason: "wrong_col" });
  });

  it("returns valid when country satisfies both constraints", () => {
    // Austria IS in Europe AND IS landlocked
    const result = validateGuess({
      rowConstraintId: "continent_europe",
      colConstraintId: "water_landlocked",
      country: austria,
      usedCountries: new Set(),
    });
    expect(result).toEqual({ valid: true });
  });
});
