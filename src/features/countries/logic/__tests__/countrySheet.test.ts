import { describe, expect, it } from "vitest";
import { COUNTRY_FACTS } from "../../../../../content/countries/facts";
import { buildCountrySheet } from "../countrySheet";

function rowsOf(model: ReturnType<typeof buildCountrySheet>, titleKey: string) {
  return model.categories.find((c) => c.titleKey === titleKey)?.rows ?? [];
}

function rowByLabel(
  model: ReturnType<typeof buildCountrySheet>,
  labelKey: string,
) {
  return model.categories
    .flatMap((c) => c.rows)
    .find((row) => row.labelKey === labelKey);
}

describe("buildCountrySheet", () => {
  it("resolves the subregion label from the raw snapshot string", () => {
    const model = buildCountrySheet("FRA", COUNTRY_FACTS.FRA);
    expect(model.subregionLabelKey).toBe(
      "countrySheet.enum.subregion.westernEurope",
    );
    expect(model.subregionRaw).toBe("Western Europe");
  });

  it("masks a null field instead of showing a hollow value (no volcano for Kosovo)", () => {
    const model = buildCountrySheet("XKX", COUNTRY_FACTS.XKX);
    expect(
      rowByLabel(model, "countrySheet.field.lastVolcanicEruption"),
    ).toBeUndefined();
  });

  it("never masks urbanCentresOver1M — a country with none shows 0, not absence", () => {
    const model = buildCountrySheet("XKX", COUNTRY_FACTS.XKX);
    const row = rowByLabel(model, "countrySheet.field.urbanCentres");
    expect(row?.value).toEqual({
      kind: "countWithZeroLabel",
      value: 0,
      zeroLabelKey: "countrySheet.value.noneFeminine",
    });
  });

  it("omits list-based rows (events, memberships, former powers) when empty", () => {
    const model = buildCountrySheet("XKX", COUNTRY_FACTS.XKX);
    expect(rowByLabel(model, "countrySheet.field.events")).toBeUndefined();
    expect(rowByLabel(model, "countrySheet.field.memberships")).toBeUndefined();
    expect(
      rowByLabel(model, "countrySheet.field.formerSovereigns"),
    ).toBeUndefined();
    // Régime reste affiché : la catégorie n'est pas vide.
    expect(rowByLabel(model, "countrySheet.field.regime")).toBeDefined();
  });

  it("never builds a sovereignty row — masked until lot 4 (sourceDescription not reviewed pre-1990)", () => {
    const model = buildCountrySheet("FRA", COUNTRY_FACTS.FRA);
    expect(rowByLabel(model, "countrySheet.field.sovereignty")).toBeUndefined();
  });

  it("omits an entire category once all of its rows are masked (no production for Kosovo)", () => {
    const model = buildCountrySheet("XKX", COUNTRY_FACTS.XKX);
    const societyRows = rowsOf(model, "countrySheet.category.societyEconomy");
    expect(
      societyRows.some(
        (row) => row.labelKey === "countrySheet.field.productions",
      ),
    ).toBe(false);
  });

  it("never masks the borders row — an empty list shows a dedicated empty label", () => {
    const model = buildCountrySheet("XKX", COUNTRY_FACTS.XKX);
    const row = rowByLabel(model, "countrySheet.field.borders");
    expect(row?.value.kind).toBe("countries");
    if (row?.value.kind === "countries") {
      expect(row.value.emptyLabelKey).toBe("countrySheet.value.none");
    }
  });

  it("computes density from population and area", () => {
    const model = buildCountrySheet("FRA", COUNTRY_FACTS.FRA);
    const row = rowByLabel(model, "countrySheet.field.density");
    expect(row?.value.kind).toBe("density");
    if (row?.value.kind === "density") {
      expect(row.value.value).toBeCloseTo(
        COUNTRY_FACTS.FRA.population / COUNTRY_FACTS.FRA.areaKm2,
        5,
      );
    }
    // Densité : union des sources population + superficie.
    expect(row?.sources).toContain("rest_countries");
    expect(row?.sources).toContain("world_countries");
  });

  it("captures multiple capitals with their roles (South Africa)", () => {
    const model = buildCountrySheet("ZAF", COUNTRY_FACTS.ZAF);
    const row = rowByLabel(model, "countrySheet.field.capitals");
    expect(row?.value.kind).toBe("capitals");
    if (row?.value.kind === "capitals") {
      expect(row.value.capitals.length).toBe(COUNTRY_FACTS.ZAF.capitals.length);
      expect(row.value.capitals.map((c) => c.name)).toEqual(
        COUNTRY_FACTS.ZAF.capitals.map((c) => c.name),
      );
    }
  });

  it("excludes non-playable border territory codes (ESH, HKG, MAC) — only catalogue countries are cited", () => {
    const dza = COUNTRY_FACTS.DZA;
    const model = buildCountrySheet("DZA", dza);
    const row = rowByLabel(model, "countrySheet.field.borders");
    expect(row?.value.kind).toBe("countries");
    if (row?.value.kind === "countries") {
      expect(row.value.iso3).not.toContain("ESH");
      expect(row.value.iso3).toContain("TUN");
      expect(row.value.iso3).toContain("MAR");
      expect(row.value.iso3.length).toBe(dza.borders.length - 1);
    }
  });

  it("keeps the capitals row basis as source even when the capital-not-largest note applies", () => {
    // BDI (Burundi) : geoTags porte capital_not_largest, mais la liste des
    // capitales elle-même reste REST Countries — la note est une convention
    // séparée, pas une moyenne des deux provenances.
    const model = buildCountrySheet("BDI", COUNTRY_FACTS.BDI);
    const row = rowByLabel(model, "countrySheet.field.capitals");
    expect(row?.basis).toBe("source");
    expect(row?.value.kind).toBe("capitals");
    if (row?.value.kind === "capitals") {
      expect(row.value.capitalNotLargestCity).toBe(true);
    }
  });

  it("drops an entire category when every row is masked", () => {
    // Un pays sans aucun fait de relief notable ne doit pas laisser une
    // catégorie "Relief et nature" vide à l'affichage.
    const noNatureFacts = {
      ...COUNTRY_FACTS.XKX,
      mountainAreaShare: null,
      forestCoverShare: null,
      physicalFeatures: [],
      lastVolcanicEruptionYear: null,
    };
    const model = buildCountrySheet("XKX", noNatureFacts);
    expect(
      model.categories.some(
        (c) => c.titleKey === "countrySheet.category.natureRelief",
      ),
    ).toBe(false);
  });

  it("cites only the source of the products actually displayed (France: wheat only)", () => {
    // La France n'a qu'un rang blé (FAOSTAT) : la ligne ne doit jamais citer
    // l'USDA (café) ni l'EIA (pétrole, gaz) — cf. lot 2, correctif C.
    const model = buildCountrySheet("FRA", COUNTRY_FACTS.FRA);
    const row = rowByLabel(model, "countrySheet.field.productions");
    expect(row?.sources).toEqual(["faostat_2022_2024"]);
    expect(row?.value.kind).toBe("productions");
    if (row?.value.kind === "productions") {
      expect(row.value.entries).toHaveLength(1);
    }
  });

  it("renders the timezones row as a distinct-UTC-offsets count, plural label above one", () => {
    const model = buildCountrySheet("FRA", COUNTRY_FACTS.FRA);
    const row = rowByLabel(model, "countrySheet.field.timezones");
    expect(row?.value).toEqual({
      kind: "utcOffsets",
      count: COUNTRY_FACTS.FRA.utcOffsetCount,
      labelKey: "countrySheet.value.utcOffsetsCountPlural",
    });
  });

  it("uses the singular UTC-offsets label for a single-offset country", () => {
    // XKX (Kosovo) : un seul décalage horaire.
    const model = buildCountrySheet("XKX", COUNTRY_FACTS.XKX);
    const row = rowByLabel(model, "countrySheet.field.timezones");
    expect(row?.value).toEqual({
      kind: "utcOffsets",
      count: 1,
      labelKey: "countrySheet.value.utcOffsetsCountSingular",
    });
  });

  it("cites only the source of the event actually hosted (South Africa: FIFA World Cup only)", () => {
    // L'Afrique du Sud n'a accueilli que la Coupe du monde (FIFA) : la ligne ne
    // doit jamais citer le CIO (Jeux olympiques) — cf. lot 2, correctif du
    // 2026-09-18.
    const model = buildCountrySheet("ZAF", COUNTRY_FACTS.ZAF);
    const row = rowByLabel(model, "countrySheet.field.events");
    expect(row?.sources).toEqual(["fifa_world_cup"]);
  });
});
