import { describe, expect, it } from "vitest";
import { getUsedCountryCodes } from "../usedCountries";

describe("getUsedCountryCodes", () => {
  it("dérive uniquement les pays des cases remplies", () => {
    const used = getUsedCountryCodes({
      "0,0": { status: "filled", countryCode: "FRA" },
      "0,1": { status: "empty" },
      "0,2": { status: "blocked" },
      "1,0": { status: "filled", countryCode: "JPN" },
    });

    expect([...used]).toEqual(["FRA", "JPN"]);
  });
});
