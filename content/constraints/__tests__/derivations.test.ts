import { describe, expect, it } from "vitest";
import { COUNTRY_FACTS } from "../../countries/facts";
import { DERIVATIONS, type DerivationContext } from "../derivations";

const CTX: DerivationContext = { factsOf: (code) => COUNTRY_FACTS[code] };

function derive(id: keyof typeof DERIVATIONS, iso3: string): boolean {
  return DERIVATIONS[id](
    COUNTRY_FACTS[iso3 as keyof typeof COUNTRY_FACTS],
    CTX,
  );
}

/**
 * Cas sensibles aux seuils : chaque contrainte est testée sur un pays juste
 * au-dessus et un juste en-dessous de sa bascule. Le contrôle exhaustif
 * dérivation ↔ answers.ts vit dans `pnpm check:content`.
 */
describe("DERIVATIONS — bascules de seuil", () => {
  it("borders_solo : exactement une frontière", () => {
    expect({
      canada: derive("borders_solo", "CAN"), // frontière unique (USA)
      poland: derive("borders_solo", "POL"), // plusieurs
      iceland: derive("borders_solo", "ISL"), // aucune
    }).toEqual({ canada: true, poland: false, iceland: false });
  });

  it("latitude_polar : |latitude| > 55", () => {
    expect({
      norway: derive("latitude_polar", "NOR"),
      iceland: derive("latitude_polar", "ISL"),
      france: derive("latitude_polar", "FRA"),
      australia: derive("latitude_polar", "AUS"),
    }).toEqual({
      norway: true,
      iceland: true,
      france: false,
      australia: false,
    });
  });

  it("density_more_japan : densité comparée au repère live", () => {
    expect({
      netherlands: derive("density_more_japan", "NLD"),
      usa: derive("density_more_japan", "USA"),
      russia: derive("density_more_japan", "RUS"),
    }).toEqual({ netherlands: true, usa: false, russia: false });
  });

  it("area_larger_france : superficie comparée au repère live", () => {
    expect({
      india: derive("area_larger_france", "IND"),
      germany: derive("area_larger_france", "DEU"),
      spain: derive("area_larger_france", "ESP"),
    }).toEqual({ india: true, germany: false, spain: false });
  });

  it("political_opec : appartenance au groupe (memberships)", () => {
    expect({
      saudi_arabia: derive("political_opec", "SAU"),
      nigeria: derive("political_opec", "NGA"),
      united_states: derive("political_opec", "USA"),
    }).toEqual({ saudi_arabia: true, nigeria: true, united_states: false });
  });

  it("time_zones_multiple : au moins 2 décalages civils simultanés", () => {
    expect({
      russia: derive("time_zones_multiple", "RUS"),
      spain: derive("time_zones_multiple", "ESP"), // péninsule + Canaries
      germany: derive("time_zones_multiple", "DEU"), // un seul
      iceland: derive("time_zones_multiple", "ISL"),
    }).toEqual({ russia: true, spain: true, germany: false, iceland: false });
  });

  it("nature_holocene_volcano : présence au registre GVP", () => {
    expect({
      iceland: derive("nature_holocene_volcano", "ISL"),
      indonesia: derive("nature_holocene_volcano", "IDN"),
      poland: derive("nature_holocene_volcano", "POL"),
      egypt: derive("nature_holocene_volcano", "EGY"),
    }).toEqual({
      iceland: true,
      indonesia: true,
      poland: false,
      egypt: false,
    });
  });

  it("nature_mountain_area_majority : part montagneuse > 50 %", () => {
    expect({
      nepal: derive("nature_mountain_area_majority", "NPL"),
      switzerland: derive("nature_mountain_area_majority", "CHE"),
      france: derive("nature_mountain_area_majority", "FRA"),
      netherlands: derive("nature_mountain_area_majority", "NLD"),
    }).toEqual({
      nepal: true,
      switzerland: true,
      france: false,
      netherlands: false,
    });
  });

  it("forest_cover_majority : couvert forestier > 50 %", () => {
    expect({
      finland: derive("forest_cover_majority", "FIN"),
      gabon: derive("forest_cover_majority", "GAB"),
      egypt: derive("forest_cover_majority", "EGY"),
      australia: derive("forest_cover_majority", "AUS"),
    }).toEqual({
      finland: true,
      gabon: true,
      egypt: false,
      australia: false,
    });
  });

  it("urban_centres_min_3_over_1m : au moins 3 centres > 1 M", () => {
    expect({
      china: derive("urban_centres_min_3_over_1m", "CHN"),
      usa: derive("urban_centres_min_3_over_1m", "USA"),
      portugal: derive("urban_centres_min_3_over_1m", "PRT"), // 2
      iceland: derive("urban_centres_min_3_over_1m", "ISL"),
    }).toEqual({ china: true, usa: true, portugal: false, iceland: false });
  });

  it("ocean_multiple_basins : au moins 2 bassins (Méditerranée/Caraïbes → Atlantique)", () => {
    expect({
      usa: derive("ocean_multiple_basins", "USA"),
      egypt: derive("ocean_multiple_basins", "EGY"), // Méditerranée + mer Rouge
      norway: derive("ocean_multiple_basins", "NOR"), // Atlantique + Arctique
      germany: derive("ocean_multiple_basins", "DEU"), // Atlantique seul
      chile: derive("ocean_multiple_basins", "CHL"), // Pacifique seul
    }).toEqual({
      usa: true,
      egypt: true,
      norway: true,
      germany: false,
      chile: false,
    });
  });

  it("event_winter_olympics_host : a accueilli les JO d'hiver", () => {
    expect({
      france: derive("event_winter_olympics_host", "FRA"),
      austria: derive("event_winter_olympics_host", "AUT"),
      bosnia: derive("event_winter_olympics_host", "BIH"),
      // Royaume-Uni : hôte des JO d'été, jamais d'hiver.
      united_kingdom: derive("event_winter_olympics_host", "GBR"),
    }).toEqual({
      france: true,
      austria: true,
      bosnia: true,
      united_kingdom: false,
    });
  });

  it("production_wheat_top10 : rang FAOSTAT ≤ 10", () => {
    expect({
      germany: derive("production_wheat_top10", "DEU"), // rang 10
      ukraine: derive("production_wheat_top10", "UKR"), // rang 9
      kazakhstan: derive("production_wheat_top10", "KAZ"), // hors top 10
      japan: derive("production_wheat_top10", "JPN"),
    }).toEqual({
      germany: true,
      ukraine: true,
      kazakhstan: false,
      japan: false,
    });
  });

  it("production_crude_oil_top15 : rang EIA ≤ 15", () => {
    expect({
      libya: derive("production_crude_oil_top15", "LBY"), // rang 15
      qatar: derive("production_crude_oil_top15", "QAT"), // rang 16
      norway: derive("production_crude_oil_top15", "NOR"), // rang 12
      france: derive("production_crude_oil_top15", "FRA"),
    }).toEqual({
      libya: true,
      qatar: false,
      norway: true,
      france: false,
    });
  });

  it("energy_coal_electricity_majority : part charbon > 50 %", () => {
    expect({
      vietnam: derive("energy_coal_electricity_majority", "VNM"), // 50,32 %
      australia: derive("energy_coal_electricity_majority", "AUS"), // 45,21 %
      poland: derive("energy_coal_electricity_majority", "POL"), // 54,32 %
      france: derive("energy_coal_electricity_majority", "FRA"),
    }).toEqual({
      vietnam: true,
      australia: false,
      poland: true,
      france: false,
    });
  });

  it("history_from_france : appartenance à formerSovereigns, sans filtre de kind", () => {
    expect({
      senegal: derive("history_from_france", "SEN"),
      vanuatu: derive("history_from_france", "VUT"), // condominium franco-britannique
      india: derive("history_from_france", "IND"),
      thailand: derive("history_from_france", "THA"), // jamais colonisée
    }).toEqual({
      senegal: true,
      vanuatu: true,
      india: false,
      thailand: false,
    });
  });

  it("history_from_united_kingdom : formerSovereigns seul, flag d'éligibilité ignoré", () => {
    expect({
      india: derive("history_from_united_kingdom", "IND"),
      israel: derive("history_from_united_kingdom", "ISR"), // qualifies=false mais listé v1
      united_states: derive("history_from_united_kingdom", "USA"), // formerSovereigns vide
      senegal: derive("history_from_united_kingdom", "SEN"),
    }).toEqual({
      india: true,
      israel: true,
      united_states: false,
      senegal: false,
    });
  });

  it("history_sovereignty_since_1990 : année ≥ 1990 ET kind d'acquisition", () => {
    expect({
      croatia: derive("history_sovereignty_since_1990", "HRV"), // 1991 independence
      namibia: derive("history_sovereignty_since_1990", "NAM"), // 1990, pile sur la borne
      russia: derive("history_sovereignty_since_1990", "RUS"), // 1991 continuation → hors
      yemen: derive("history_sovereignty_since_1990", "YEM"), // 1990 unification → hors
      germany: derive("history_sovereignty_since_1990", "DEU"), // 1871
    }).toEqual({
      croatia: true,
      namibia: true,
      russia: false,
      yemen: false,
      germany: false,
    });
  });
});
