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
});
