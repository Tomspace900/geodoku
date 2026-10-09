/**
 * Garde des libellés chiffrés dérivés d'un pays de référence — câblée à
 * `check-content.ts` (revue #122).
 *
 * « Plus dense que le Japon (320 hab./km²) » écrit un chiffre en dur alors que
 * le seuil se calcule sur le snapshot (`densityOf(JPN)`) : après une regen, le
 * libellé pouvait mentir sans que rien ne le signale (le Japon affichait 330 pour
 * 324,5 ; le Canada « 40 M » pour 41,8 M). Règle unique : le chiffre du libellé
 * est la valeur de référence **arrondie à 2 chiffres significatifs**, en fr et en
 * en. Une regen qui déplace la référence fait échouer la garde et force à relire
 * le libellé.
 *
 * Les fonctions sont pures (données injectées, testables dans les deux sens) ;
 * `validateReferenceLabels` les câble sur le contenu réel, sur le patron de
 * `validateConstraintAbouts`.
 */
import type { ConstraintId } from "../../content/constraints";
import type { CountryCode } from "../../content/countries/countryCodes";
import { COUNTRY_FACTS } from "../../content/countries/facts";
import { CONSTRAINT_BY_ID } from "../../src/features/game/logic/constraints";
import { translate } from "../../src/i18n";

export type ReferenceMetric = "areaKm2" | "population" | "density";

export type ReferenceLabel = Readonly<{
  country: CountryCode;
  metric: ReferenceMetric;
}>;

/**
 * Les douze libellés dont le chiffre vient d'un pays de référence. Un nouveau
 * libellé de ce genre s'ajoute ici : la garde ne devine pas les chiffres des
 * seuils fixes (« 5 000 m », « 50 % », « depuis 1500 »).
 */
export const REFERENCE_LABELS: Readonly<
  Partial<Record<ConstraintId, ReferenceLabel>>
> = {
  area_larger_india: { country: "IND", metric: "areaKm2" },
  area_larger_mexico: { country: "MEX", metric: "areaKm2" },
  area_larger_france: { country: "FRA", metric: "areaKm2" },
  area_smaller_belgium: { country: "BEL", metric: "areaKm2" },
  area_smaller_luxembourg: { country: "LUX", metric: "areaKm2" },
  population_more_germany: { country: "DEU", metric: "population" },
  population_more_canada: { country: "CAN", metric: "population" },
  population_less_iceland: { country: "ISL", metric: "population" },
  density_more_netherlands: { country: "NLD", metric: "density" },
  density_more_japan: { country: "JPN", metric: "density" },
  density_less_russia: { country: "RUS", metric: "density" },
  density_less_canada: { country: "CAN", metric: "density" },
};

const SIGNIFICANT_DIGITS = 2;
const RELATIVE_TOLERANCE = 1e-9;
const MILLION = 1_000_000;

/** Arrondi à 2 chiffres significatifs (`30 528` → `31 000`, `4,19` → `4,2`). */
export function roundToSignificantDigits(value: number): number {
  return Number(value.toPrecision(SIGNIFICANT_DIGITS));
}

/**
 * Chiffre du premier groupe entre parenthèses d'un libellé, en valeur absolue
 * (`3,3 M km²` → 3 300 000). Séparateur de milliers et espaces insécables
 * ignorés ; virgule décimale en fr, point décimal en en ; `M` = million.
 */
export function labelFigure(label: string, locale: "fr" | "en"): number | null {
  const inside = /\(([^)]*)\)/.exec(label)?.[1];
  if (inside === undefined) return null;
  const compact = inside.replace(/[\s ]/g, "");
  const match = /^([\d.,]+)(M)?/.exec(compact);
  if (match === null) return null;
  const digits =
    locale === "fr" ? match[1].replace(",", ".") : match[1].replace(/,/g, "");
  const figure = Number(digits);
  if (!Number.isFinite(figure)) return null;
  return match[2] === "M" ? figure * MILLION : figure;
}

function sameFigure(a: number, b: number): boolean {
  return (
    Math.abs(a - b) <= RELATIVE_TOLERANCE * Math.max(Math.abs(a), Math.abs(b))
  );
}

/** Erreurs d'un libellé isolé, face à la valeur de référence non arrondie. */
export function referenceLabelErrors(params: {
  id: string;
  locale: "fr" | "en";
  label: string;
  reference: number;
}): string[] {
  const { id, locale, label, reference } = params;
  const figure = labelFigure(label, locale);
  if (figure === null) {
    return [`${id}: libellé ${locale} sans chiffre lisible entre parenthèses`];
  }
  const expected = roundToSignificantDigits(reference);
  if (sameFigure(figure, expected)) return [];
  return [
    `${id}: libellé ${locale} affiche ${figure}, la référence vaut ${reference} soit ${expected} à ${SIGNIFICANT_DIGITS} chiffres significatifs — corriger le libellé`,
  ];
}

function referenceValue(
  reference: ReferenceLabel,
  facts: Readonly<Record<CountryCode, { areaKm2: number; population: number }>>,
): number {
  const { areaKm2, population } = facts[reference.country];
  if (reference.metric === "areaKm2") return areaKm2;
  if (reference.metric === "population") return population;
  return population / areaKm2;
}

export function validateReferenceLabels(): string[] {
  const errors: string[] = [];
  (
    Object.entries(REFERENCE_LABELS) as [ConstraintId, ReferenceLabel][]
  ).forEach(([id, reference]) => {
    const constraint = CONSTRAINT_BY_ID.get(id);
    if (!constraint) {
      errors.push(`${id}: contrainte inconnue du catalogue runtime`);
      return;
    }
    const value = referenceValue(reference, COUNTRY_FACTS);
    (["fr", "en"] as const).forEach((locale) => {
      errors.push(
        ...referenceLabelErrors({
          id,
          locale,
          label: translate(locale, constraint.labelKey),
          reference: value,
        }),
      );
    });
  });
  return errors;
}
