import { describe, expect, it } from "vitest";
import {
  buildCapitalLabelsQuery,
  harvestVintage,
  matchCapitalLabels,
  normalizeCityName,
  parseCapitalRows,
  validateHarvestVintage,
  type WikidataCapitalRow,
} from "./capitalLabelsLib";

const ROWS: WikidataCapitalRow[] = [
  { iso3: "AUT", qid: "Q1741", fr: "Vienne", en: "Vienna" },
  { iso3: "TON", qid: "Q3", fr: "Nukuʻalofa", en: "Nukuʻalofa" },
  { iso3: "ZAF", qid: "Q5465", fr: "Le Cap", en: "Cape Town" },
  { iso3: "ZAF", qid: "Q3926", fr: "Pretoria", en: "Pretoria" },
  { iso3: "NOR", qid: "Q585", fr: null, en: null },
  { iso3: "FRA", qid: "Q90", fr: null, en: "Paris" },
];

describe("normalizeCityName", () => {
  it("rapproche apostrophes typographiques et droites", () => {
    expect(normalizeCityName("Nuku'alofa")).toBe(
      normalizeCityName("Nukuʻalofa"),
    );
  });

  it("ignore accents et casse", () => {
    expect(normalizeCityName("Bogotá")).toBe("bogota");
  });
});

describe("matchCapitalLabels", () => {
  it("traduit une capitale par son libellé anglais", () => {
    const { labels } = matchCapitalLabels({ AUT: ["Vienna"] }, ROWS, {});
    expect(labels.AUT?.Vienna).toEqual({ fr: "Vienne", en: "Vienna" });
  });

  it("ne traduit que les capitales sources : Pretoria seule ne fait pas apparaître Le Cap", () => {
    const { labels } = matchCapitalLabels({ ZAF: ["Pretoria"] }, ROWS, {});
    expect(Object.keys(labels.ZAF ?? {})).toEqual(["Pretoria"]);
  });

  it("rejoint « Nuku'alofa » et « Nukuʻalofa »", () => {
    const { unresolved } = matchCapitalLabels(
      { TON: ["Nuku'alofa"] },
      ROWS,
      {},
    );
    expect(unresolved).toEqual([]);
  });

  it("laisse non résolu un nom sans libellé Wikidata correspondant", () => {
    const { unresolved } = matchCapitalLabels({ AUT: ["Salzburg"] }, ROWS, {});
    expect(unresolved.map((entry) => entry.name)).toEqual(["Salzburg"]);
  });

  it("n'utilise jamais l'anglais quand le libellé fr manque", () => {
    const { labels, unresolved } = matchCapitalLabels(
      { FRA: ["Paris"] },
      ROWS,
      {},
    );
    expect(labels.FRA).toBeUndefined();
    expect(unresolved).toHaveLength(1);
  });

  it("laisse un override court-circuiter la récolte", () => {
    const { labels, unresolved } = matchCapitalLabels({ NOR: ["Oslo"] }, ROWS, {
      NOR: { Oslo: { fr: "Oslo", en: "Oslo", reason: "mul" } },
    });
    expect(labels).toEqual({});
    expect(unresolved).toEqual([]);
  });
});

describe("parseCapitalRows", () => {
  it("lit les liaisons SPARQL et retombe sur l'ISO3 fourni (Kosovo)", () => {
    const rows = parseCapitalRows(
      {
        results: {
          bindings: [
            {
              capital: { value: "http://www.wikidata.org/entity/Q1662" },
              fr: { value: "Pristina" },
              en: { value: "Pristina" },
            },
          ],
        },
      },
      "XKX",
    );
    expect(rows).toEqual([
      { iso3: "XKX", qid: "Q1662", fr: "Pristina", en: "Pristina" },
    ]);
  });
});

describe("buildCapitalLabelsQuery", () => {
  it("borne la requête aux codes du jeu", () => {
    expect(buildCapitalLabelsQuery(["FRA", "ZAF"])).toContain(
      'VALUES ?iso3 { "FRA" "ZAF" }',
    );
  });
});

describe("harvestVintage", () => {
  it("formate une date ordinaire", () => {
    expect(harvestVintage("2026-09-23")).toEqual({
      fr: "récolte du 23 septembre 2026",
      en: "harvested 23 September 2026",
    });
  });

  it("écrit « 1er » en français le premier du mois", () => {
    expect(harvestVintage("2026-10-01")).toEqual({
      fr: "récolte du 1er octobre 2026",
      en: "harvested 1 October 2026",
    });
  });
});

describe("validateHarvestVintage", () => {
  it("accepte un millésime accordé à la récolte", () => {
    expect(
      validateHarvestVintage(harvestVintage("2026-09-23"), "2026-09-23"),
    ).toEqual([]);
  });

  it("signale un millésime désaccordé, valeurs et remède à l'appui", () => {
    const [error] = validateHarvestVintage(
      harvestVintage("2026-09-23"),
      "2026-10-01",
    );
    expect(error).toContain("récolte du 1er octobre 2026");
    expect(error).toContain("récolte du 23 septembre 2026");
    expect(error).toContain("content/sources.ts");
  });
});
