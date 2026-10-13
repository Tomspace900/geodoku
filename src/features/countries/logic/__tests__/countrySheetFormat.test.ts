import { describe, expect, it } from "vitest";
import { COUNTRY_FACTS } from "../../../../../content/countries/facts";
import {
  capitalizeFirst,
  formatFullDate,
  formatLanguageName,
  formatList,
  formatOrdinal,
  formatPercent,
  formatSurface,
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
    ["ber", "fr", "langues berbères"],
    ["bjz", "en", "Belize Kriol English"],
    ["nzs", "en", "New Zealand Sign Language"],
    ["pov", "fr", "créole de Guinée-Bissau"],
    ["zdj", "en", "Ngazidja Comorian"],
  ] as const)(
    "falls back to a curated label for %s not resolved by Intl (%s)",
    (code, locale, expected) => {
      expect(formatLanguageName(code, locale)).toBe(expected);
    },
  );
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

describe("formatFullDate", () => {
  it("writes the day in French", () => {
    expect(formatFullDate("1962-07-05", "fr")).toBe("5 juillet 1962");
  });

  it("writes the day in English, day first like the source vintages", () => {
    expect(formatFullDate("1962-07-05", "en")).toBe("5 July 1962");
  });

  it("writes the first of the month « 1er » in French", () => {
    expect(formatFullDate("1867-07-01", "fr")).toBe("1er juillet 1867");
  });

  it("keeps a plain 1 in English", () => {
    expect(formatFullDate("1867-07-01", "en")).toBe("1 July 1867");
  });
});

describe("capitalizeFirst", () => {
  it("met la majuscule initiale d'un nom commun de Wikidata", () => {
    expect(capitalizeFirst("mont Blanc", "fr")).toBe("Mont Blanc");
    expect(capitalizeFirst("pic d'Orizaba", "fr")).toBe("Pic d'Orizaba");
  });

  it("laisse un libellé déjà capitalisé", () => {
    expect(capitalizeFirst("Mount Scenery", "en")).toBe("Mount Scenery");
  });
});

describe("formatLanguageName on the real snapshot", () => {
  const codes = [
    ...new Set(
      Object.values(COUNTRY_FACTS).flatMap((facts) => facts.officialLanguages),
    ),
  ];

  it.each(["fr", "en"] as const)(
    "never renders a raw ISO code (%s)",
    (locale) => {
      const raw = codes.filter(
        (code) => formatLanguageName(code, locale) === code,
      );
      expect(raw).toEqual([]);
    },
  );

  it("writes every French language name in lowercase, as the ICU does", () => {
    const capitalized = codes.filter((code) => {
      const name = formatLanguageName(code, "fr");
      return name.charAt(0) !== name.charAt(0).toLocaleLowerCase("fr");
    });
    expect(capitalized).toEqual([]);
  });
});

describe("formatSurface", () => {
  it("keeps whole km² at or above 1", () => {
    expect(formatSurface(30528, "en")).toBe("30,528");
    expect(formatSurface(2.02, "fr")).toBe("2");
  });

  it("never rounds a sub-km² territory down to 0 (Vatican City)", () => {
    expect(formatSurface(0.44, "fr")).toBe("0,44");
    expect(formatSurface(0.44, "en")).toBe("0.44");
  });
});
