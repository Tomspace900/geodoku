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
 * Exception : si un pays se situe **entre** la référence et le chiffre arrondi
 * (les Bahamas à 398 k entre l'Islande à 396,5 k et « 400 000 »), le joueur le
 * voit sous le chiffre affiché et le trouve refusé. Le libellé prend alors un
 * chiffre significatif de plus, jusqu'à ce que l'écart soit vide.
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
const MAX_SIGNIFICANT_DIGITS = 6;
const RELATIVE_TOLERANCE = 1e-9;
const MILLION = 1_000_000;

/** Arrondi à `digits` chiffres significatifs (2 par défaut : `30 528` → `31 000`, `4,19` → `4,2`). */
export function roundToSignificantDigits(
  value: number,
  digits: number = SIGNIFICANT_DIGITS,
): number {
  return Number(value.toPrecision(digits));
}

/**
 * Chiffre que le libellé doit afficher : la référence arrondie au plus petit
 * nombre de chiffres significatifs (≥ 2) qui ne laisse aucune autre valeur
 * strictement entre la référence et le chiffre arrondi.
 */
export function expectedLabelFigure(
  reference: number,
  others: readonly number[],
): number {
  for (
    let digits = SIGNIFICANT_DIGITS;
    digits <= MAX_SIGNIFICANT_DIGITS;
    digits += 1
  ) {
    const rounded = roundToSignificantDigits(reference, digits);
    const low = Math.min(reference, rounded);
    const high = Math.max(reference, rounded);
    if (!others.some((value) => value > low && value < high)) return rounded;
  }
  return reference;
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
  /** Valeurs des autres pays pour la même mesure ; vide : 2 chiffres significatifs. */
  others?: readonly number[];
}): string[] {
  const { id, locale, label, reference, others = [] } = params;
  const figure = labelFigure(label, locale);
  if (figure === null) {
    return [`${id}: libellé ${locale} sans chiffre lisible entre parenthèses`];
  }
  const expected = expectedLabelFigure(reference, others);
  if (sameFigure(figure, expected)) return [];
  return [
    `${id}: libellé ${locale} affiche ${figure}, la référence vaut ${reference} soit ${expected} (${SIGNIFICANT_DIGITS} chiffres significatifs, davantage si un pays tombe entre la référence et le chiffre affiché) — corriger le libellé`,
  ];
}

type MetricFacts = { areaKm2: number; population: number };

function metricValue(metric: ReferenceMetric, facts: MetricFacts): number {
  if (metric === "areaKm2") return facts.areaKm2;
  if (metric === "population") return facts.population;
  return facts.population / facts.areaKm2;
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
    const value = metricValue(
      reference.metric,
      COUNTRY_FACTS[reference.country],
    );
    const others = (
      Object.entries(COUNTRY_FACTS) as [CountryCode, MetricFacts][]
    )
      .filter(([code]) => code !== reference.country)
      .map(([, facts]) => metricValue(reference.metric, facts));
    (["fr", "en"] as const).forEach((locale) => {
      errors.push(
        ...referenceLabelErrors({
          id,
          locale,
          label: translate(locale, constraint.labelKey),
          reference: value,
          others,
        }),
      );
    });
  });
  return errors;
}
