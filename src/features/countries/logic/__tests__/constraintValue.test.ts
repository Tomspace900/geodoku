import { describe, expect, it } from "vitest";
import {
  ARCHIVED_CONSTRAINT_IDS,
  CONSTRAINT_IDS,
} from "../../../../../content/constraints";
import { COUNTRY_FACTS } from "../../../../../content/countries/facts";
import { translate } from "../../../../i18n";
import { constraintValueFor } from "../constraintValue";
import { formatConstraintValue } from "../constraintValueFormat";

const ALL_IDS = [...CONSTRAINT_IDS, ...ARCHIVED_CONSTRAINT_IDS];

/** Normalise les espaces insécables que l'ICU et les libellés écrivent exprès. */
function frText(
  id: Parameters<typeof constraintValueFor>[0],
  iso: keyof typeof COUNTRY_FACTS,
) {
  const value = constraintValueFor(id, COUNTRY_FACTS[iso]);
  return value
    ? formatConstraintValue(value, "fr", (key, vars) =>
        translate("fr", key, vars),
      ).replace(/\s/g, " ")
    : null;
}

describe("constraintValueFor", () => {
  it("never throws, whichever constraint and country", () => {
    const failures = ALL_IDS.flatMap((id) =>
      Object.values(COUNTRY_FACTS).flatMap((facts) => {
        try {
          constraintValueFor(id, facts);
          return [];
        } catch {
          return [id];
        }
      }),
    );
    expect(failures).toEqual([]);
  });

  it("returns nothing for a constraint its label already says (continent)", () => {
    expect(constraintValueFor("continent_asia", COUNTRY_FACTS.BTN)).toBeNull();
  });

  it("returns nothing for a boolean constraint (landlocked, drives on left)", () => {
    expect(
      constraintValueFor("water_landlocked", COUNTRY_FACTS.BTN),
    ).toBeNull();
    expect(
      constraintValueFor("society_drives_on_left", COUNTRY_FACTS.JPN),
    ).toBeNull();
  });

  it("returns the population for a population threshold", () => {
    expect(
      constraintValueFor("population_more_germany", COUNTRY_FACTS.IND),
    ).toEqual({ kind: "population", value: COUNTRY_FACTS.IND.population });
  });

  it("returns the production rank, with the product label", () => {
    expect(
      constraintValueFor("production_cocoa_top10", COUNTRY_FACTS.IDN),
    ).toEqual({
      kind: "rank",
      rank: 2,
      productLabelKey: "countrySheet.enum.production.cocoa",
    });
  });

  it("returns nothing when the underlying fact is missing (null share)", () => {
    const withoutForest = { ...COUNTRY_FACTS.FRA, forestCoverShare: null };
    expect(
      constraintValueFor("forest_cover_majority", withoutForest),
    ).toBeNull();
  });

  it("shows the official language even when there is only one", () => {
    expect(frText("language_french", "FRA")).toBe("français");
  });

  it("lists every official language of a multilingual country", () => {
    expect(
      constraintValueFor("language_french", COUNTRY_FACTS.CHE),
    ).toMatchObject({ kind: "languages" });
  });

  it("names the constraint's language first, so a shortened list still shows it (Spanish is 4th in Bolivia)", () => {
    expect(frText("language_spanish", "BOL")).toBe(
      "espagnol, aymara, guarani et quechua",
    );
  });

  it("names every official language, the constraint's first", () => {
    const text = frText("language_english", "ZAF") ?? "";
    expect(text.startsWith("anglais, ")).toBe(true);
    expect(text.split(/, | et /)).toHaveLength(
      COUNTRY_FACTS.ZAF.officialLanguages.length,
    );
  });

  it("shows nothing for a flag symbol, which the label already names", () => {
    expect(constraintValueFor("flag_has_star", COUNTRY_FACTS.USA)).toBeNull();
  });

  it("lists the years a country hosted that event, and only that one", () => {
    expect(frText("event_fifa_wc_host", "DEU")).toBe("1974 et 2006");
    expect(frText("event_summer_olympics_host", "DEU")).toBe("1936 et 1972");
  });

  it("counts a co-hosted edition for each host", () => {
    expect(frText("event_fifa_wc_host", "MEX")).toBe("1970, 1986 et 2026");
  });

  it("dates Tokyo by its official name, 2020", () => {
    expect(frText("event_summer_olympics_host", "JPN")).toBe("1964 et 2020");
  });

  it("shows no value on an archived constraint — its frozen list would contradict the current facts", () => {
    const withValue = ARCHIVED_CONSTRAINT_IDS.flatMap((id) =>
      Object.values(COUNTRY_FACTS).some(
        (facts) => constraintValueFor(id, facts) !== null,
      )
        ? [id]
        : [],
    );
    expect(withValue).toEqual([]);
  });

  it("shows no independence date when the retained event is a unification (South Yemen left in 1967, not 1990)", () => {
    expect(
      constraintValueFor("history_from_united_kingdom", COUNTRY_FACTS.YEM),
    ).toBeNull();
  });

  it("gives the independence event of a former colony, with its year", () => {
    expect(
      constraintValueFor("history_from_france", COUNTRY_FACTS.DZA),
    ).toMatchObject({ kind: "sovereignty", year: 1962 });
  });

  it("names the one neighbour of a single-neighbour country", () => {
    expect(constraintValueFor("borders_solo", COUNTRY_FACTS.PRT)).toEqual({
      kind: "neighbors",
      iso3: ["ESP"],
    });
  });

  it("names the summit for « sommet de plus de 5 000 m »", () => {
    expect(frText("physical_peak_over_5000m", "TZA")).toMatch(
      /^Kilimandjaro \(5 895 m\)$/,
    );
  });

  it("names the capital for « la capitale n'est pas la plus grande ville »", () => {
    expect(frText("society_capital_not_largest", "BRA")).toBe(
      "Capitale : Brasilia",
    );
  });
});

describe("formatConstraintValue", () => {
  it("writes a population on three significant digits", () => {
    expect(frText("population_more_germany", "IND")).toMatch(/^1,43 Md hab\.$/);
  });

  it("writes a production rank in short form", () => {
    expect(frText("production_cocoa_top10", "IDN")).toBe(
      "2ᵉ producteur de cacao",
    );
  });

  it("writes the independence of a former colony as nature and date", () => {
    expect(frText("history_from_france", "DZA")).toBe(
      "Indépendance (5 juillet 1962)",
    );
  });

  it("writes the single neighbour by its localized name", () => {
    expect(frText("borders_solo", "PRT")).toBe("Voisin : Espagne");
  });

  it("writes a share as a percentage of the territory", () => {
    expect(frText("forest_cover_majority", "BRA")).toBe("59 % de forêt");
  });
});
