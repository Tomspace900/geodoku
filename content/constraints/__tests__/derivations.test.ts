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
