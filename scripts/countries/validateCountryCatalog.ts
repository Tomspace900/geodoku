import type { CountryFacts } from "../../content/countries/type";
import type { Country } from "../../src/features/countries/types";

const COUNTRY_CODE = /^[A-Z]{3}$/;
const ISO2_CODE = /^[A-Z]{2}$/;
// Territoires hors gameplay qui restent des voisins géographiques légitimes.
const EXTERNAL_BORDER_CODES = new Set(["ESH", "HKG", "MAC"]);

/**
 * Invariants d'**identité** du catalogue (`content/countries/catalog.ts`).
 * Retourne toutes les incohérences afin qu'un run de CI soit actionnable.
 */
export function validateCountryCatalog(
  countries: readonly Country[],
): string[] {
  const errors: string[] = [];
  const iso3Codes = new Set<string>();
  const iso2Codes = new Set<string>();

  countries.forEach((country, index) => {
    const prefix = country.iso3 || `index ${index}`;
    if (!COUNTRY_CODE.test(country.iso3))
      errors.push(`${prefix}: iso3 invalide`);
    if (!ISO2_CODE.test(country.iso2)) errors.push(`${prefix}: iso2 invalide`);
    if (iso3Codes.has(country.iso3)) errors.push(`${prefix}: iso3 dupliqué`);
    if (iso2Codes.has(country.iso2)) errors.push(`${prefix}: iso2 dupliqué`);
    iso3Codes.add(country.iso3);
    iso2Codes.add(country.iso2);

    if (!country.names?.fr || !country.names?.en) {
      errors.push(`${prefix}: noms FR/EN manquants`);
    }
    if (!country.flagEmoji) errors.push(`${prefix}: drapeau manquant`);
    if (!Array.isArray(country.aliases))
      errors.push(`${prefix}: alias invalides`);
  });

  return errors;
}

/**
 * Invariants des **faits** gameplay (`content/countries/facts.ts`), indexés par
 * ISO3. `codes` = la liste de référence (catalogue) : toute entrée `facts` doit
 * la couvrir exactement.
 */
export function validateCountryFacts(
  factsByCode: Readonly<Record<string, CountryFacts>>,
  codes: readonly string[],
): string[] {
  const errors: string[] = [];
  const knownCodes = new Set(codes);

  const factCodes = Object.keys(factsByCode).sort();
  const expected = [...codes].sort();
  if (factCodes.length !== expected.length) {
    errors.push(
      `facts: ${factCodes.length} entrées au lieu de ${expected.length}`,
    );
  }
  expected.forEach((code) => {
    if (!(code in factsByCode)) errors.push(`facts: ${code} manquant`);
  });
  factCodes.forEach((code) => {
    if (!knownCodes.has(code)) errors.push(`facts: ${code} hors catalogue`);
  });

  Object.entries(factsByCode).forEach(([code, facts]) => {
    if (!Number.isFinite(facts.population) || facts.population <= 0) {
      errors.push(`${code}: population invalide`);
    }
    if (!Number.isFinite(facts.areaKm2) || facts.areaKm2 <= 0) {
      errors.push(`${code}: superficie invalide`);
    }
    if (
      !Number.isFinite(facts.latitude) ||
      facts.latitude < -90 ||
      facts.latitude > 90
    ) {
      errors.push(`${code}: latitude invalide`);
    }

    const requiredArrays: Array<[string, unknown]> = [
      ["borders", facts.borders],
      ["officialLanguages", facts.officialLanguages],
      ["flagColors", facts.flagColors],
      ["flagSymbols", facts.flagSymbols],
      ["flagLayout", facts.flagLayout],
      ["events", facts.events],
      ["memberships", facts.memberships],
      ["capitals", facts.capitals],
      ["geoTags", facts.geoTags],
      ["physicalFeatures", facts.physicalFeatures],
    ];
    requiredArrays.forEach(([field, value]) => {
      if (!Array.isArray(value)) errors.push(`${code}: ${field} invalide`);
    });
    if (facts.officialLanguages.length === 0) {
      errors.push(`${code}: langue officielle manquante`);
    }
    if (facts.flagColors.length === 0) {
      errors.push(`${code}: couleurs de drapeau manquantes`);
    }
    if (facts.drivingSide !== "left" && facts.drivingSide !== "right") {
      errors.push(`${code}: sens de conduite invalide`);
    }
    if (facts.regime !== "monarchy" && facts.regime !== "republic") {
      errors.push(`${code}: régime invalide`);
    }
    facts.capitals.forEach((capital) => {
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
        errors.push(`${code}: capitale invalide`);
      }
    });
    facts.borders.forEach((border) => {
      if (
        COUNTRY_CODE.test(border) &&
        !knownCodes.has(border) &&
        !EXTERNAL_BORDER_CODES.has(border)
      ) {
        errors.push(`${code}: frontière inconnue ${border}`);
      }
    });
  });

  return errors;
}
