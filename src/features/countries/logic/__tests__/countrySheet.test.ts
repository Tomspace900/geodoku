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
    // Régime et souveraineté restent affichés : la catégorie n'est pas vide.
    expect(rowByLabel(model, "countrySheet.field.regime")).toBeDefined();
    expect(rowByLabel(model, "countrySheet.field.sovereignty")).toBeDefined();
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

  it("passes non-playable border territory codes (ESH, HKG, MAC) through unfiltered", () => {
    const dza = COUNTRY_FACTS.DZA;
    const model = buildCountrySheet("DZA", dza);
    const row = rowByLabel(model, "countrySheet.field.borders");
    expect(row?.value.kind).toBe("countries");
    if (row?.value.kind === "countries") {
      expect(row.value.iso3).toEqual(dza.borders);
      expect(row.value.iso3).toContain("ESH");
    }
  });

  it("merges basis to convention when the capital-not-largest note applies", () => {
    // BDI (Burundi) : geoTags porte capital_not_largest.
    const model = buildCountrySheet("BDI", COUNTRY_FACTS.BDI);
    const row = rowByLabel(model, "countrySheet.field.capitals");
    expect(row?.basis).toBe("convention");
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
});
