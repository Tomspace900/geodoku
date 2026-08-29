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

  it("political_g7 : appartenance au groupe (memberships)", () => {
    expect({
      germany: derive("political_g7", "DEU"),
      japan: derive("political_g7", "JPN"),
      spain: derive("political_g7", "ESP"),
      brazil: derive("political_g7", "BRA"),
    }).toEqual({ germany: true, japan: true, spain: false, brazil: false });
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

  it("time_zones_min_3 : au moins 3 décalages civils simultanés", () => {
    expect({
      russia: derive("time_zones_min_3", "RUS"),
      canada: derive("time_zones_min_3", "CAN"),
      france: derive("time_zones_min_3", "FRA"), // 2 seulement
      germany: derive("time_zones_min_3", "DEU"),
    }).toEqual({ russia: true, canada: true, france: false, germany: false });
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
});
