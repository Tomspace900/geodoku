import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Country } from "../../src/features/countries/types.ts";
import type { Patches } from "./buildCountriesLib.ts";

const _dir = dirname(fileURLToPath(import.meta.url));
const patches: Patches = JSON.parse(
  readFileSync(join(_dir, "patches.json"), "utf-8"),
) as Patches;
const countries: Country[] = JSON.parse(
  readFileSync(
    join(_dir, "../../src/features/countries/data/countries.json"),
    "utf-8",
  ),
) as Country[];

const codes = new Set(countries.map((c) => c.code));

/** Codes that may appear on a border edge (UN members + territories like GIB used by world-countries). */
const validBorderTargets = new Set<string>(codes);
for (const c of countries) {
  for (const b of c.borders) {
    validBorderTargets.add(b);
  }
}

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

describe("patches.json ↔ countries.json", () => {
  it("has every list entry reference an existing country code", () => {
    assertAllCountryCodes("middleEastCodes", patches.middleEastCodes ?? []);
    assertAllCountryCodes("eventFifaWcHost", patches.eventFifaWcHost ?? []);
    assertAllCountryCodes(
      "eventSummerOlympicsHost",
      patches.eventSummerOlympicsHost ?? [],
    );
    assertAllCountryCodes("euMemberCodes", patches.euMemberCodes ?? []);
    assertAllCountryCodes("g20MemberCodes", patches.g20MemberCodes ?? []);
  });

  it("has unique codes in each political/geo list", () => {
    noDupes(patches.middleEastCodes ?? [], (x) => x);
    noDupes(patches.eventFifaWcHost ?? [], (x) => x);
    noDupes(patches.eventSummerOlympicsHost ?? [], (x) => x);
    noDupes(patches.euMemberCodes ?? [], (x) => x);
    noDupes(patches.g20MemberCodes ?? [], (x) => x);
  });

  it("has wikiTitles, aliasOverrides, overrides, flagOverrides keys that exist in dataset", () => {
    for (const k of Object.keys(patches.wikiTitles ?? {})) {
      expect(codes.has(k), `wikiTitles: ${k}`).toBe(true);
    }
    for (const k of Object.keys(patches.aliasOverrides)) {
      expect(codes.has(k), `aliasOverrides: ${k}`).toBe(true);
    }
    for (const k of Object.keys(patches.overrides)) {
      expect(codes.has(k), `overrides: ${k}`).toBe(true);
    }
    for (const k of Object.keys(patches.flagOverrides ?? {})) {
      expect(codes.has(k), `flagOverrides: ${k}`).toBe(true);
    }
  });

  it("has border override codes that exist as playable countries or as edges in the built graph", () => {
    for (const [cca3, partial] of Object.entries(patches.overrides)) {
      if (partial.borders) {
        assertBorderCodes(`overrides[${cca3}].borders`, partial.borders);
      }
    }
  });

  it("additions: unique code and borders refer to real countries", () => {
    noDupes(patches.additions, (a) => a.code);
    for (const add of patches.additions) {
      expect(codes.has(add.code), `addition code ${add.code}`).toBe(true);
      assertBorderCodes(`addition[${add.code}].borders`, add.borders);
    }
  });
});

describe("patches structural invariants", () => {
  it("exposes non-empty core collections", () => {
    expect(patches.middleEastCodes?.length).toBeGreaterThan(0);
    expect(patches.additions.length).toBeGreaterThan(0);
  });
});
