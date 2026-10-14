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

  it("tolerates a recent code the ICU may not name yet", () => {
    expect(validateCurrencyCode("ZWG")).toEqual([]);
  });
});
