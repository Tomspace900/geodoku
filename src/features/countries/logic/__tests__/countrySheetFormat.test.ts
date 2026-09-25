import { describe, expect, it } from "vitest";
import {
  computeDensity,
  formatCurrency,
  formatDemonym,
  formatLanguageName,
  formatList,
  formatOrdinal,
  formatPercent,
  formatYear,
  sourceReferences,
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
  it("rounds to the nearest integer percent at or above 10%", () => {
    expect(formatPercent(0.213, "en")).toBe("21%");
    expect(formatPercent(0.213, "fr")).toBe("21 %");
  });

  it("shows one decimal below 10% so a small non-zero share never reads 0%", () => {
    // French coal-fired electricity share (0.18%) — the bug this guards against.
    expect(formatPercent(0.0018, "en")).toBe("0.2%");
    expect(formatPercent(0.0018, "fr")).toBe("0,2 %");
  });

  it("still shows a plain 0% for an actual zero share", () => {
    expect(formatPercent(0, "en")).toBe("0%");
    expect(formatPercent(0, "fr")).toBe("0 %");
  });

  it("floors to < 0.1% below one tenth of a percent, never 0.0%", () => {
    // Belarus coal-fired electricity (0.04%), Egypt/Oman forest cover.
    expect(formatPercent(0.0004, "en")).toBe("< 0.1%");
    expect(formatPercent(0.0004, "fr")).toBe("< 0,1 %");
  });

  it("shows the plain value at exactly 0.1%, without the floor prefix", () => {
    expect(formatPercent(0.001, "en")).toBe("0.1%");
    expect(formatPercent(0.001, "fr")).toBe("0,1 %");
  });
});

describe("formatList", () => {
  it("joins items with a localized conjunction", () => {
    expect(formatList(["France", "Germany", "Spain"], "en")).toBe(
      "France, Germany, and Spain",
    );
  });
});

describe("sourceReferences", () => {
  it("resolves source ids to their localized name, url and vintage", () => {
    expect(
      sourceReferences(["rest_countries", "faostat_2022_2024"], "en"),
    ).toEqual([
      {
        id: "rest_countries",
        name: "REST Countries",
        url: "https://restcountries.com/",
        vintage: null,
      },
      {
        id: "faostat_2022_2024",
        name: "FAOSTAT",
        url: "https://www.fao.org/faostat/",
        vintage: "2022–2024 average",
      },
    ]);
  });
});

describe("formatDemonym", () => {
  const french = {
    fr: { m: "Français", f: "Française" },
    en: { m: "French", f: "French" },
  };

  it("lists both forms in French when they differ", () => {
    expect(formatDemonym(french, "fr")).toBe("Français, Française");
  });

  it("shows a single form when masculine equals feminine", () => {
    expect(formatDemonym(french, "en")).toBe("French");
  });
});

describe("formatCurrency", () => {
  it("shows the localized name then the code", () => {
    expect(formatCurrency("EUR", "en")).toBe("Euro (EUR)");
  });

  it("capitalizes the French name", () => {
    expect(formatCurrency("EUR", "fr")).toBe("Euro (EUR)");
  });

  it("falls back to the bare code when Intl has no name for it", () => {
    expect(formatCurrency("XXZ", "en")).toBe("XXZ");
  });
});
