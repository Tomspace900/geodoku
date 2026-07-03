import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Country } from "../../src/features/countries/types.ts";
import type { FlagData, SourceCorrection } from "./buildCountriesLib.ts";
import { countryPatches } from "./countryPatches.ts";

const _dir = dirname(fileURLToPath(import.meta.url));
const flagData: FlagData = JSON.parse(
  readFileSync(join(_dir, "flagData.json"), "utf-8"),
) as FlagData;
const countries: Country[] = JSON.parse(
  readFileSync(
    join(_dir, "../../src/features/countries/data/countries.json"),
    "utf-8",
  ),
) as Country[];

const { gameplayClassifications } = countryPatches;
const codes = new Set(countries.map((c) => c.iso3));
const additionCodes = new Set(
  countryPatches.manualCountryAdditions.map((a) => a.iso3),
);

/** Codes that may appear on a border edge (playable countries + graph edges like XKX). */
const validBorderTargets = new Set<string>(codes);
for (const c of countries) {
  for (const b of c.borders) {
    validBorderTargets.add(b);
  }
}

const ALLOWED_SOURCE_CORRECTION_KEYS = new Set<keyof SourceCorrection>([
  "borders",
  "waterAccess",
]);

function assertAllCountryCodes(label: string, list: string[]): void {
  for (const code of list) {
    if (!codes.has(code)) {
      throw new Error(`${label}: unknown code "${code}"`);
    }
  }
}

function assertBorderCodes(label: string, list: string[]): void {
  for (const code of list) {
    if (!validBorderTargets.has(code)) {
      throw new Error(`${label}: unknown border code "${code}"`);
    }
  }
}

function noDupes<T>(arr: T[], key: (x: T) => string): void {
  const seen = new Set<string>();
  for (const x of arr) {
    const k = key(x);
    if (seen.has(k)) throw new Error(`Duplicate in list: ${k}`);
    seen.add(k);
  }
}

describe("countryPatches ↔ countries.json", () => {
  it("has every gameplay list entry reference an existing country code", () => {
    assertAllCountryCodes("middleEast", gameplayClassifications.middleEast);
    assertAllCountryCodes(
      "eventFifaWcHost",
      gameplayClassifications.eventFifaWcHost,
    );
    assertAllCountryCodes(
      "eventSummerOlympicsHost",
      gameplayClassifications.eventSummerOlympicsHost,
    );
    assertAllCountryCodes("monarchy", gameplayClassifications.monarchy);
    assertAllCountryCodes(
      "equatorCrosser",
      gameplayClassifications.equatorCrosser,
    );
    assertAllCountryCodes(
      "mediterraneanCoast",
      gameplayClassifications.mediterraneanCoast,
    );
    assertAllCountryCodes(
      "caribbeanCoast",
      gameplayClassifications.caribbeanCoast,
    );
    assertAllCountryCodes(
      "peakOver5000m",
      gameplayClassifications.peakOver5000m,
    );
  });

  it("has unique codes in each gameplay list", () => {
    noDupes(gameplayClassifications.middleEast, (x) => x);
    noDupes(gameplayClassifications.eventFifaWcHost, (x) => x);
    noDupes(gameplayClassifications.eventSummerOlympicsHost, (x) => x);
    noDupes(gameplayClassifications.monarchy, (x) => x);
    noDupes(gameplayClassifications.equatorCrosser, (x) => x);
    noDupes(gameplayClassifications.mediterraneanCoast, (x) => x);
    noDupes(gameplayClassifications.caribbeanCoast, (x) => x);
    noDupes(gameplayClassifications.peakOver5000m, (x) => x);
  });

  it("has wiki, search alias and source correction keys that exist in dataset", () => {
    for (const k of Object.keys(countryPatches.wikipediaTitlesByIso3)) {
      expect(codes.has(k), `wikipediaTitlesByIso3: ${k}`).toBe(true);
    }
    for (const k of Object.keys(countryPatches.searchAliasesByIso3)) {
      expect(codes.has(k), `searchAliasesByIso3: ${k}`).toBe(true);
    }
    for (const k of Object.keys(countryPatches.sourceCorrectionsByIso3)) {
      expect(codes.has(k), `sourceCorrectionsByIso3: ${k}`).toBe(true);
    }
  });

  it("limits source corrections to borders and waterAccess only", () => {
    for (const [iso3, correction] of Object.entries(
      countryPatches.sourceCorrectionsByIso3,
    )) {
      for (const key of Object.keys(correction)) {
        expect(
          ALLOWED_SOURCE_CORRECTION_KEYS.has(key as keyof SourceCorrection),
          `sourceCorrectionsByIso3[${iso3}] has disallowed key "${key}"`,
        ).toBe(true);
      }
    }
  });

  it("has border correction codes that exist as playable countries or graph edges", () => {
    for (const [iso3, correction] of Object.entries(
      countryPatches.sourceCorrectionsByIso3,
    )) {
      if (correction.borders) {
        assertBorderCodes(
          `sourceCorrectionsByIso3[${iso3}].borders`,
          correction.borders,
        );
      }
    }
  });

  it("additions: unique ISO3 and borders refer to real countries", () => {
    noDupes(countryPatches.manualCountryAdditions, (a) => a.iso3);
    for (const add of countryPatches.manualCountryAdditions) {
      expect(codes.has(add.iso3), `addition iso3 ${add.iso3}`).toBe(true);
      assertBorderCodes(`addition[${add.iso3}].borders`, add.borders);
    }
  });
});

describe("countryPatches structural invariants", () => {
  it("exposes non-empty core collections", () => {
    expect(gameplayClassifications.middleEast.length).toBeGreaterThan(0);
    expect(countryPatches.manualCountryAdditions.length).toBeGreaterThan(0);
  });
});

describe("flagData.json ↔ countries.json", () => {
  it("covers every world-country code (additions carry flags inline)", () => {
    for (const c of countries) {
      if (additionCodes.has(c.iso3)) continue;
      expect(flagData[c.iso3], `flagData missing: ${c.iso3}`).toBeDefined();
    }
  });

  it("has no flagData key absent from the dataset", () => {
    for (const code of Object.keys(flagData)) {
      expect(codes.has(code), `flagData stray code: ${code}`).toBe(true);
    }
  });

  it("has non-empty flagColors and an array of flagSymbols for each entry", () => {
    for (const [code, entry] of Object.entries(flagData)) {
      expect(
        entry.flagColors.length,
        `flagColors empty: ${code}`,
      ).toBeGreaterThan(0);
      expect(Array.isArray(entry.flagSymbols), `flagSymbols: ${code}`).toBe(
        true,
      );
    }
  });
});
