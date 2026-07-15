import type { Country } from "../../src/features/countries/types";

const COUNTRY_CODE = /^[A-Z]{3}$/;
const ISO2_CODE = /^[A-Z]{2}$/;
// Territoires hors gameplay qui restent des voisins géographiques légitimes.
const EXTERNAL_BORDER_CODES = new Set(["ESH", "HKG", "MAC"]);

/** Retourne toutes les incohérences afin qu'un run de CI soit actionnable. */
export function validateCountryCatalog(
  countries: readonly Country[],
): string[] {
  const errors: string[] = [];
  const iso3Codes = new Set<string>();
  const iso2Codes = new Set<string>();

  countries.forEach((country, index) => {
    const prefix = country.iso3 || `index ${index}`;
    if (!COUNTRY_CODE.test(country.iso3)) {
      errors.push(`${prefix}: iso3 invalide`);
    }
    if (!ISO2_CODE.test(country.iso2)) errors.push(`${prefix}: iso2 invalide`);
    if (iso3Codes.has(country.iso3)) errors.push(`${prefix}: iso3 dupliqué`);
    if (iso2Codes.has(country.iso2)) errors.push(`${prefix}: iso2 dupliqué`);
    iso3Codes.add(country.iso3);
    iso2Codes.add(country.iso2);

    if (!country.names?.fr || !country.names?.en) {
      errors.push(`${prefix}: noms FR/EN manquants`);
    }
    if (!country.flagEmoji) errors.push(`${prefix}: drapeau manquant`);
    if (!Number.isFinite(country.population) || country.population <= 0) {
      errors.push(`${prefix}: population invalide`);
    }
    if (!Number.isFinite(country.areaKm2) || country.areaKm2 <= 0) {
      errors.push(`${prefix}: superficie invalide`);
    }
    if (
      !Number.isFinite(country.latitude) ||
      country.latitude < -90 ||
      country.latitude > 90
    ) {
      errors.push(`${prefix}: latitude invalide`);
    }

    const requiredArrays: Array<[string, unknown]> = [
      ["aliases", country.aliases],
      ["borders", country.borders],
      ["officialLanguages", country.officialLanguages],
      ["flagColors", country.flagColors],
      ["flagSymbols", country.flagSymbols],
      ["flagLayout", country.flagLayout],
      ["events", country.events],
      ["memberships", country.memberships],
      ["capitals", country.capitals],
      ["geoTags", country.geoTags],
      ["physicalFeatures", country.physicalFeatures],
    ];
    requiredArrays.forEach(([field, value]) => {
      if (!Array.isArray(value)) errors.push(`${prefix}: ${field} invalide`);
    });
    if (country.officialLanguages.length === 0) {
      errors.push(`${prefix}: langue officielle manquante`);
    }
    if (country.flagColors.length === 0) {
      errors.push(`${prefix}: couleurs de drapeau manquantes`);
    }
    if (country.drivingSide !== "left" && country.drivingSide !== "right") {
      errors.push(`${prefix}: sens de conduite invalide`);
    }
    if (country.regime !== "monarchy" && country.regime !== "republic") {
      errors.push(`${prefix}: régime invalide`);
    }
    country.capitals.forEach((capital) => {
      if (
        !capital.name ||
        !Number.isFinite(capital.latitude) ||
        capital.latitude < -90 ||
        capital.latitude > 90 ||
        !Number.isFinite(capital.longitude) ||
        capital.longitude < -180 ||
        capital.longitude > 180 ||
        !Array.isArray(capital.roles)
      ) {
        errors.push(`${prefix}: capitale invalide`);
      }
    });
  });

  countries.forEach((country) => {
    country.borders.forEach((border) => {
      if (
        COUNTRY_CODE.test(border) &&
        !iso3Codes.has(border) &&
        !EXTERNAL_BORDER_CODES.has(border)
      ) {
        errors.push(`${country.iso3}: frontière inconnue ${border}`);
      }
    });
  });

  return errors;
}
