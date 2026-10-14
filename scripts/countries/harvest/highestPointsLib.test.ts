import { describe, expect, it } from "vitest";
import {
  buildHighestPoints,
  buildHighestPointsQuery,
  type FactbookPoint,
  highestOf,
  matchHighestPoint,
  parseHighestPointText,
  parseWikidataPeaks,
  type WikidataPeak,
} from "./highestPointsLib";

describe("parseHighestPointText — formes réelles du Factbook", () => {
  it("lit un nom et une altitude avec unité", () => {
    expect(parseHighestPointText("Zugspitze 2,963 m")).toEqual({
      sourceName: "Zugspitze",
      elevationM: 2963,
      named: true,
    });
  });

  it("accepte l'unité absente (France)", () => {
    expect(parseHighestPointText("Mont Blanc 4,810")?.elevationM).toBe(4810);
  });

  it("ignore une parenthèse après l'altitude (Chili)", () => {
    expect(
      parseHighestPointText(
        "Nevado Ojos del Salado 6,893 m (highest volcano in the world)",
      ),
    ).toMatchObject({ sourceName: "Nevado Ojos del Salado", elevationM: 6893 });
  });

  it("ignore une parenthèse avec virgule et point-virgule (Argentine)", () => {
    expect(
      parseHighestPointText(
        "Cerro Aconcagua (located in the northwestern corner of the province of Mendoza; highest point in South America) 6,962 m",
      ),
    ).toMatchObject({ sourceName: "Cerro Aconcagua", elevationM: 6962 });
  });

  it("retire la parenthèse du milieu (Pays-Bas)", () => {
    expect(
      parseHighestPointText(
        "Mount Scenery (on the island of Saba in the Caribbean, now considered an integral part of the Netherlands) 862 m",
      ),
    ).toMatchObject({ sourceName: "Mount Scenery", elevationM: 862 });
  });

  it("coupe une note après <br> (Kazakhstan)", () => {
    expect(
      parseHighestPointText(
        "Pik Khan-Tengri 7,010 m<br>note - the northern most 7,000 meter peak in the World",
      ),
    ).toMatchObject({ sourceName: "Pik Khan-Tengri", elevationM: 7010 });
  });

  it("coupe une note après un point-virgule (Israël)", () => {
    expect(
      parseHighestPointText(
        "Mitspe Shlagim 2,224 m; note - this is the highest named point, the actual one is at 2,236 m",
      ),
    ).toMatchObject({ sourceName: "Mitspe Shlagim", elevationM: 2224 });
  });

  it("marque un point « unnamed » comme sans nom (Bénin, Burundi)", () => {
    expect(
      parseHighestPointText(
        "unnamed elevation 675 m; located 2.5 km southeast of the town of Kotopounga",
      ),
    ).toMatchObject({ named: false, elevationM: 675 });
    expect(
      parseHighestPointText("unnamed elevation on Mukike Range 2,685 m"),
    ).toMatchObject({ named: false, elevationM: 2685 });
  });

  it("garde le dernier nombre quand le nom en contient un (Bahamas)", () => {
    expect(
      parseHighestPointText("1.3 km NE of Old Bight on Cat Island 64 m"),
    ).toMatchObject({
      sourceName: "1.3 km NE of Old Bight on Cat Island",
      elevationM: 64,
    });
  });

  it("retire la virgule finale d'un nom vague (Arabie saoudite)", () => {
    expect(parseHighestPointText("As Sarawat range, 3,000 m")).toMatchObject({
      sourceName: "As Sarawat range",
      elevationM: 3000,
    });
  });

  it("refuse un texte sans altitude", () => {
    expect(parseHighestPointText("Mont Blanc")).toBeNull();
  });
});

const peak = (
  qid: string,
  en: string | null,
  elevations: number[],
  fr: string | null = en,
): WikidataPeak => ({ qid, fr, en, elevations });

const named = (sourceName: string, elevationM: number) => ({
  sourceName,
  elevationM,
  named: true,
});

describe("matchHighestPoint", () => {
  it("reconnaît le même sommet sous une autre graphie, par l'altitude", () => {
    const match = matchHighestPoint(named("Galdhopiggen", 2469), [
      peak("Q1", "Galdhøpiggen", [2469]),
    ]);
    expect(match).toMatchObject({
      kind: "matched",
      peak: { en: "Galdhøpiggen" },
    });
  });

  it("tolère l'écart entre plusieurs mesures Wikidata (Mont Blanc)", () => {
    const match = matchHighestPoint(named("Mont Blanc", 4810), [
      peak("Q2", "Mont Blanc", [4805.59, 4807.02, 4810.02]),
    ]);
    expect(match.kind).toBe("matched");
  });

  it("n'accepte pas un sommet hors tolérance (Australie : pic Mawson)", () => {
    const match = matchHighestPoint(named("Mount Kosciuszko", 2228), [
      peak("Q3", "Mawson Peak", [2745]),
    ]);
    expect(match.kind).toBe("unresolved");
  });

  it("départage deux sommets proches par le nom (Colombie)", () => {
    const match = matchHighestPoint(named("Pico Cristobal Colon", 5775), [
      peak("Q4", "Pico Simón Bolívar", [5775]),
      peak("Q5", "Pico Cristóbal Colón", [5775]),
    ]);
    expect(match).toMatchObject({ kind: "matched", peak: { qid: "Q5" } });
  });

  it("laisse la revue trancher deux sommets proches de même nom", () => {
    const match = matchHighestPoint(named("Mount X", 100), [
      peak("Q6", "Hill A", [100]),
      peak("Q7", "Hill B", [102]),
    ]);
    expect(match.kind).toBe("unresolved");
  });

  it("refuse un sommet sans libellé fr (jamais de repli sur l'anglais)", () => {
    const match = matchHighestPoint(named("Denali", 6190), [
      peak("Q8", null, [6190], "Denali"),
    ]);
    expect(match.kind).toBe("unresolved");
  });

  it("ne cherche pas de libellé pour un point sans nom", () => {
    expect(
      matchHighestPoint(
        { sourceName: "unnamed elevation", elevationM: 63, named: false },
        [peak("Q9", "Hill", [63])],
      ),
    ).toEqual({ kind: "unnamed" });
  });
});

describe("highestOf", () => {
  it("retient le plus haut des deux points de la Palestine", () => {
    const points: FactbookPoint[] = [
      { ...named("Khallat al Batrakh", 1020), gec: "we" },
      { ...named("Abu 'Awdah", 105), gec: "gz" },
    ];
    expect(highestOf(points).gec).toBe("we");
  });
});

describe("buildHighestPoints", () => {
  const factbook = {
    NOR: { ...named("Galdhopiggen", 2469), gec: "no" },
    GMB: {
      sourceName: "unnamed elevation",
      elevationM: 63,
      named: false,
      gec: "ga",
    },
    SRB: { ...named("Midzor", 2169), gec: "ri" },
  };
  const wikidata = {
    NOR: { gec: ["no"], peaks: [peak("Q1", "Galdhøpiggen", [2469])] },
    SRB: { gec: ["ri"], peaks: [peak("Q2", "Velika Rudoka", [2658])] },
  };

  it("garde l'altitude du Factbook et le libellé Wikidata", () => {
    const { points } = buildHighestPoints(factbook, wikidata, {});
    expect(points.NOR).toEqual({
      sourceName: "Galdhopiggen",
      elevationM: 2469,
      label: { fr: "Galdhøpiggen", en: "Galdhøpiggen" },
      wikidata: "Q1",
    });
  });

  it("porte un point sans nom avec un libellé null, sans le signaler", () => {
    const { points, unresolved } = buildHighestPoints(factbook, wikidata, {});
    expect(points.GMB?.label).toBeNull();
    expect(unresolved.map(({ iso3 }) => iso3)).not.toContain("GMB");
  });

  it("signale un sommet non reconnu sans override, et pas avec", () => {
    expect(
      buildHighestPoints(factbook, wikidata, {}).unresolved.map(
        ({ iso3 }) => iso3,
      ),
    ).toEqual(["SRB"]);
    expect(
      buildHighestPoints(factbook, wikidata, {
        SRB: {
          kind: "label",
          label: { fr: "Midžor", en: "Midžor" },
          reason: "test",
        },
      }).unresolved,
    ).toEqual([]);
  });
});

describe("parseWikidataPeaks", () => {
  it("regroupe les mesures d'un même sommet et les GEC par pays", () => {
    const countries = parseWikidataPeaks({
      results: {
        bindings: [
          {
            iso3: { value: "FRA" },
            gec: { value: "FR" },
            peak: { value: "http://www.wikidata.org/entity/Q583" },
            fr: { value: "Mont Blanc" },
            en: { value: "Mont Blanc" },
            elev: { value: "4805.59" },
          },
          {
            iso3: { value: "FRA" },
            gec: { value: "FR" },
            peak: { value: "http://www.wikidata.org/entity/Q583" },
            fr: { value: "Mont Blanc" },
            en: { value: "Mont Blanc" },
            elev: { value: "4810.02" },
          },
        ],
      },
    });
    expect(countries.FRA).toEqual({
      gec: ["fr"],
      peaks: [
        {
          qid: "Q583",
          fr: "Mont Blanc",
          en: "Mont Blanc",
          elevations: [4805.59, 4810.02],
        },
      ],
    });
  });

  it("garde un pays sans P610 (Gambie)", () => {
    const countries = parseWikidataPeaks({
      results: { bindings: [{ iso3: { value: "GMB" }, gec: { value: "GA" } }] },
    });
    expect(countries.GMB?.peaks).toEqual([]);
  });
});

describe("buildHighestPointsQuery", () => {
  it("borne la requête aux codes demandés", () => {
    const query = buildHighestPointsQuery(["FRA", "ITA"]);
    expect(query).toContain('VALUES ?iso3 { "FRA" "ITA" }');
  });
});
