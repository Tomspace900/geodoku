import { describe, expect, it } from "vitest";
import { aboutForConstraint } from "../../constraints/abouts";
import { FACT_PROVENANCE, PRODUCTION_PROVENANCE } from "../factProvenance";

function expectSameProvenance(
  row: { basis: string; sources: readonly string[] },
  about: { basis: string; sources: readonly string[] },
) {
  expect(row.basis).toBe(about.basis);
  expect([...row.sources].sort()).toEqual([...about.sources].sort());
}

/**
 * Une ligne de fiche qui recoupe une contrainte du lot 1 doit citer
 * exactement la même provenance que son `about.ts` — sans quoi la fiche et le
 * toast de source se contredisent sur le même fait (cf. lot 2, correctif C).
 */
describe("FACT_PROVENANCE — cohérence avec les about.ts de contraintes", () => {
  it("équateur : physical_crosses_equator", () => {
    expectSameProvenance(
      FACT_PROVENANCE.equatorCrosser,
      aboutForConstraint("physical_crosses_equator"),
    );
  });

  it("milieux : nature_desert et nature_rainforest", () => {
    expectSameProvenance(
      FACT_PROVENANCE.biomes,
      aboutForConstraint("nature_desert"),
    );
    expectSameProvenance(
      FACT_PROVENANCE.biomes,
      aboutForConstraint("nature_rainforest"),
    );
  });

  it("sommet de plus de 5 000 m : physical_peak_over_5000m", () => {
    expectSameProvenance(
      FACT_PROVENANCE.peakOver5000m,
      aboutForConstraint("physical_peak_over_5000m"),
    );
  });

  it("Moyen-Orient : subregion_middle_east", () => {
    expectSameProvenance(
      FACT_PROVENANCE.middleEast,
      aboutForConstraint("subregion_middle_east"),
    );
  });

  it("capitale pas plus grande ville : society_capital_not_largest", () => {
    expectSameProvenance(
      FACT_PROVENANCE.capitalNotLargestNote,
      aboutForConstraint("society_capital_not_largest"),
    );
  });

  it("façades maritimes : ocean_* et physical_*_coast", () => {
    expectSameProvenance(
      FACT_PROVENANCE.coastlines,
      aboutForConstraint("ocean_atlantic"),
    );
    expectSameProvenance(
      FACT_PROVENANCE.coastlines,
      aboutForConstraint("ocean_indian"),
    );
    expectSameProvenance(
      FACT_PROVENANCE.coastlines,
      aboutForConstraint("ocean_multiple_basins"),
    );
    expectSameProvenance(
      FACT_PROVENANCE.coastlines,
      aboutForConstraint("ocean_pacific"),
    );
    expectSameProvenance(
      FACT_PROVENANCE.coastlines,
      aboutForConstraint("physical_caribbean_coast"),
    );
    expectSameProvenance(
      FACT_PROVENANCE.coastlines,
      aboutForConstraint("physical_mediterranean_coast"),
    );
  });

  it("continent : continent_africa", () => {
    expectSameProvenance(
      FACT_PROVENANCE.continent,
      aboutForConstraint("continent_africa"),
    );
  });

  it("sous-région : subregion_caribbean et subregion_southeast_asia", () => {
    expectSameProvenance(
      FACT_PROVENANCE.subregion,
      aboutForConstraint("subregion_caribbean"),
    );
    expectSameProvenance(
      FACT_PROVENANCE.subregion,
      aboutForConstraint("subregion_southeast_asia"),
    );
  });

  it("productions : une source par produit affiché", () => {
    expectSameProvenance(
      PRODUCTION_PROVENANCE.wheat,
      aboutForConstraint("production_wheat_top10"),
    );
    expectSameProvenance(
      PRODUCTION_PROVENANCE.rice,
      aboutForConstraint("production_rice_top10"),
    );
    expectSameProvenance(
      PRODUCTION_PROVENANCE.cocoa,
      aboutForConstraint("production_cocoa_top10"),
    );
    expectSameProvenance(
      PRODUCTION_PROVENANCE.coffee,
      aboutForConstraint("production_coffee_top10"),
    );
    expectSameProvenance(
      PRODUCTION_PROVENANCE.crude_oil,
      aboutForConstraint("production_crude_oil_top15"),
    );
    expectSameProvenance(
      PRODUCTION_PROVENANCE.natural_gas,
      aboutForConstraint("production_natural_gas_top15"),
    );
  });
});
