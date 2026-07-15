import {
  ARCHIVED_CONSTRAINTS,
  CONSTRAINTS,
} from "@/features/game/logic/constraints";
import { describe, expect, it } from "vitest";
import { createTranslator, translate } from "../index";
import { en } from "../locales/en";
import { fr } from "../locales/fr";
import type { TKey } from "../types";

function flattenStrings(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") return { [prefix]: value };
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) =>
      Object.entries(flattenStrings(child, prefix ? `${prefix}.${key}` : key)),
    ),
  );
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

describe("translate", () => {
  it("returns the French string for a valid key in FR locale", () => {
    expect(translate("fr", "ui.appName")).toBe("Geodoku");
    expect(translate("fr", "constraint.continent_africa")).toBe(
      "Pays d'Afrique",
    );
  });

  it("returns the English string for a valid key in EN locale", () => {
    expect(translate("en", "ui.appName")).toBe("Geodoku");
    expect(translate("en", "constraint.continent_africa")).toBe(
      "African country",
    );
  });

  it("returns a different string for FR vs EN", () => {
    const fr = translate("fr", "ui.howToPlay");
    const en = translate("en", "ui.howToPlay");
    expect(fr).toBe("Comment jouer\u00A0?");
    expect(en).toBe("How to play?");
    expect(fr).not.toBe(en);
  });

  it("falls back to EN when the requested locale is missing a key", () => {
    const isolatedTranslate = createTranslator({
      en: { ui: { label: "English label" } },
      fr: { ui: {} },
    });

    expect(isolatedTranslate("fr", "ui.label")).toBe("English label");
  });

  it("returns the raw key when key does not exist in EN locale", () => {
    const badKey = "ui.nonExistentKey" as TKey;
    expect(translate("en", badKey)).toBe("ui.nonExistentKey");
  });

  it("falls back to EN for an unknown key in FR locale", () => {
    const badKey = "ui.nonExistentKey" as TKey;
    // FR → tries EN → not found → returns key
    expect(translate("fr", badKey)).toBe("ui.nonExistentKey");
  });

  it("ignores extra vars when the string has no placeholders", () => {
    const result = translate("fr", "ui.appName", { score: 87 });
    expect(result).toBe("Geodoku");
  });

  it("leaves missing interpolation variables as {placeholder}", () => {
    const result = translate("fr", "ui.possibleAnswersPartial");
    expect(result).toContain("{remaining}");
    expect(result).toContain("{total}");
  });

  it("handles constraint keys correctly", () => {
    expect(translate("fr", "constraint.water_landlocked")).toBe(
      "Enclavé (sans accès à la mer)",
    );
    expect(translate("en", "constraint.water_landlocked")).toBe(
      "Landlocked (no sea access)",
    );
  });

  it("handles all constraint keys without returning raw key", () => {
    // Archived constraints keep their labels so past grids stay replayable.
    for (const c of [...CONSTRAINTS, ...ARCHIVED_CONSTRAINTS]) {
      const key = `constraint.${c.id}` as TKey;
      const frResult = translate("fr", key);
      const enResult = translate("en", key);
      expect(frResult).not.toBe(key);
      expect(enResult).not.toBe(key);
    }
  });

  it("keeps the complete FR and EN catalogs in structural parity", () => {
    expect(Object.keys(flattenStrings(fr)).sort()).toEqual(
      Object.keys(flattenStrings(en)).sort(),
    );
  });

  it("keeps interpolation placeholders aligned between FR and EN", () => {
    const flatFr = flattenStrings(fr);
    const flatEn = flattenStrings(en);
    const mismatches = Object.keys(flatEn).filter(
      (key) =>
        JSON.stringify(placeholders(flatFr[key] ?? "")) !==
        JSON.stringify(placeholders(flatEn[key])),
    );

    expect(mismatches).toEqual([]);
  });
});
