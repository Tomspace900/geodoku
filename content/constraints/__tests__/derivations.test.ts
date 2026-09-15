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
      // Métropole + DOM : même règle que l'Espagne, appliquée à la France.
      france: derive("time_zones_multiple", "FRA"),
      // Aucun territoire intégré décalé : les territoires d'outre-mer et les
      // pays constitutifs autonomes ne comptent pas.
      united_kingdom: derive("time_zones_multiple", "GBR"),
      denmark: derive("time_zones_multiple", "DNK"),
      germany: derive("time_zones_multiple", "DEU"), // un seul
      iceland: derive("time_zones_multiple", "ISL"),
    }).toEqual({
      russia: true,
      spain: true,
      france: true,
      united_kingdom: false,
      denmark: false,
      germany: false,
      iceland: false,
    });
  });

  it("nature_active_volcano : éruption datée depuis 1500, territoire intégré", () => {
    expect({
      iceland: derive("nature_active_volcano", "ISL"),
      indonesia: derive("nature_active_volcano", "IDN"),
      poland: derive("nature_active_volcano", "POL"),
      // La France entre par la Martinique, la Guadeloupe et La Réunion.
      france: derive("nature_active_volcano", "FRA"),
      // Le Royaume-Uni n'a aucun volcan sur l'île de Grande-Bretagne : ses 14
      // volcans GVP sont tous en territoire d'outre-mer, donc hors périmètre.
      united_kingdom: derive("nature_active_volcano", "GBR"),
      // Éruptions uniquement préhistoriques : l'Holocène les retenait, pas nous.
      germany: derive("nature_active_volcano", "DEU"),
      rwanda: derive("nature_active_volcano", "RWA"),
      // Continent sans éruption historique, Heard/McDonald étant hors périmètre.
      australia: derive("nature_active_volcano", "AUS"),
    }).toEqual({
      iceland: true,
      indonesia: true,
      poland: false,
      france: true,
      united_kingdom: false,
      germany: false,
      rwanda: false,
      australia: false,
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

  it("ocean_multiple_basins : au moins 2 océans, une mer fermée n'en est pas un", () => {
    expect({
      usa: derive("ocean_multiple_basins", "USA"), // Atlantique + Pacifique + Arctique
      norway: derive("ocean_multiple_basins", "NOR"), // Atlantique + Arctique
      southAfrica: derive("ocean_multiple_basins", "ZAF"), // Atlantique + Indien
      panama: derive("ocean_multiple_basins", "PAN"), // Pacifique + mer des Caraïbes
      egypt: derive("ocean_multiple_basins", "EGY"), // Méditerranée + mer Rouge
      germany: derive("ocean_multiple_basins", "DEU"), // Atlantique seul
      chile: derive("ocean_multiple_basins", "CHL"), // Pacifique seul
    }).toEqual({
      usa: true,
      norway: true,
      southAfrica: true,
      // Le canal relie deux océans, mais la côte panaméenne nord donne sur une
      // mer fermée : la règle « une mer n'est pas un océan » le fait sortir.
      panama: false,
      egypt: false,
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

  /**
   * Les datasets agricoles sont **trimés au top 10** à la curation : hors du
   * classement, `productionRank` retombe sur `+∞`. La bascule se joue donc entre
   * le rang 10 et l'absence, pas entre 10 et 11.
   */
  it("production_cocoa_top10 : rang 10 dedans, absent du classement dehors", () => {
    expect({
      colombia: derive("production_cocoa_top10", "COL"), // rang 10
      ivory_coast: derive("production_cocoa_top10", "CIV"), // rang 1
      mexico: derive("production_cocoa_top10", "MEX"), // producteur hors top 10
    }).toEqual({ colombia: true, ivory_coast: true, mexico: false });
  });

  it("production_coffee_top10 : rang 10 dedans, absent du classement dehors", () => {
    expect({
      brazil: derive("production_coffee_top10", "BRA"), // rang 1
      mexico: derive("production_coffee_top10", "MEX"), // rang 10
      guatemala: derive("production_coffee_top10", "GTM"), // rang 11, dehors
      kenya: derive("production_coffee_top10", "KEN"), // producteur hors top 10
      // La série FAOSTAT classait la RCA 10ᵉ mondiale (316 kt) par imputation, ce
      // qui écartait le Mexique. Le re-sourçage USDA-FAS (revue métier
      // 2026-09-10) la sort du classement — elle n'y est même pas listée.
      central_african_republic: derive("production_coffee_top10", "CAF"),
    }).toEqual({
      brazil: true,
      mexico: true,
      guatemala: false,
      kenya: false,
      central_african_republic: false,
    });
  });

  it("production_rice_top10 : rang 10 dedans, absent du classement dehors", () => {
    expect({
      cambodia: derive("production_rice_top10", "KHM"), // rang 10
      china: derive("production_rice_top10", "CHN"), // rang 1
      japan: derive("production_rice_top10", "JPN"), // producteur hors top 10
    }).toEqual({ cambodia: true, china: true, japan: false });
  });

  it("production_natural_gas_top15 : rang EIA ≤ 15", () => {
    expect({
      egypt: derive("production_natural_gas_top15", "EGY"), // rang 15
      argentina: derive("production_natural_gas_top15", "ARG"), // rang 16
      united_states: derive("production_natural_gas_top15", "USA"), // rang 1
      france: derive("production_natural_gas_top15", "FRA"),
    }).toEqual({
      egypt: true,
      argentina: false,
      united_states: true,
      france: false,
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
      united_states: derive("history_from_united_kingdom", "USA"), // trou de parsing v1 rattrapé
      canada: derive("history_from_united_kingdom", "CAN"), // idem (Statute of Westminster)
      senegal: derive("history_from_united_kingdom", "SEN"),
    }).toEqual({
      india: true,
      israel: true,
      united_states: true,
      canada: true,
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
