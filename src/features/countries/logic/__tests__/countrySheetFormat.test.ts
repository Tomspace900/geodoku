import { describe, expect, it } from "vitest";
import {
  computeDensity,
  formatLanguageName,
  formatList,
  formatOrdinal,
  formatPercent,
  formatYear,
} from "../countrySheetFormat";

describe("formatOrdinal", () => {
  it("uses the irregular French form for 1", () => {
    expect(formatOrdinal(1, "fr")).toBe("1er");
  });

  it("uses the superscript e for other French ranks", () => {
    expect(formatOrdinal(7, "fr")).toBe("7ᵉ");
  });

  it("uses English ordinal suffixes (st/nd/rd/th)", () => {
    expect(formatOrdinal(1, "en")).toBe("1st");
    expect(formatOrdinal(2, "en")).toBe("2nd");
    expect(formatOrdinal(3, "en")).toBe("3rd");
    expect(formatOrdinal(7, "en")).toBe("7th");
    expect(formatOrdinal(11, "en")).toBe("11th");
  });
});

describe("formatYear", () => {
  it("formats a negative year as BCE/av. J.-C., never grouped by thousands", () => {
    expect(formatYear(-8300, "fr")).toBe("8300 av. J.-C.");
    expect(formatYear(-8300, "en")).toBe("8300 BCE");
  });

  it("formats a positive year as a plain ungrouped number", () => {
    expect(formatYear(1932, "fr")).toBe("1932");
    expect(formatYear(1932, "en")).toBe("1932");
  });
});

describe("formatLanguageName", () => {
  it("resolves a standard ISO 639-1 code via Intl", () => {
    expect(formatLanguageName("fr", "en")).toBe("French");
  });

  it.each([
    ["ber", "fr", "Langues berbères"],
    ["bjz", "en", "Belize Kriol English"],
    ["nzs", "en", "New Zealand Sign Language"],
    ["pov", "fr", "Créole de Guinée-Bissau"],
    ["zdj", "en", "Ngazidja Comorian"],
  ] as const)(
    "falls back to a curated label for %s not resolved by Intl (%s)",
    (code, locale, expected) => {
      expect(formatLanguageName(code, locale)).toBe(expected);
    },
  );
});

describe("computeDensity", () => {
  it("divides population by area", () => {
    expect(computeDensity(1000, 10)).toBe(100);
  });

  it("returns 0 for a zero area rather than dividing by zero", () => {
    expect(computeDensity(1000, 0)).toBe(0);
  });
});

describe("formatPercent", () => {
  it("rounds to the nearest integer percent", () => {
    expect(formatPercent(0.213, "en")).toBe("21%");
  });
});

describe("formatList", () => {
  it("joins items with a localized conjunction", () => {
    expect(formatList(["France", "Germany", "Spain"], "en")).toBe(
      "France, Germany, and Spain",
    );
  });
});
