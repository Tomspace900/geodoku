import { describe, expect, it } from "vitest";
import { validateCurrencyCode } from "./validateCountryCatalog";

describe("validateCurrencyCode", () => {
  it("accepts a current currency with fr and en names", () => {
    expect(validateCurrencyCode("EUR")).toEqual([]);
  });

  it("rejects a code that is not ISO 4217", () => {
    expect(validateCurrencyCode("TVD")).not.toEqual([]);
  });

  it("rejects a dated name — SLL is known to Intl but abolished", () => {
    expect(validateCurrencyCode("SLL")).not.toEqual([]);
  });

  // Nom fr absent de l'ICU 77 (Node 22.19, l'ancien Node du projet), présent
  // depuis l'ICU 78 (Node 22.23, 24.22) : échoue sur un Node dont l'ICU est
  // antérieure, comme pnpm lancé hors du Node du projet (AGENTS.md §2).
  it("accepts ZWG (2024), named since ICU 78", () => {
    expect(validateCurrencyCode("ZWG")).toEqual([]);
  });
});
