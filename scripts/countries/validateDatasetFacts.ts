/**
 * Garde de fraîcheur des faits **dérivés de datasets** (`content/countries/facts.ts`).
 *
 * `checkDerivationFreshness` surveille l'étage du dessous — les `answers.ts`
 * face à `COUNTRY_FACTS`. Ici on surveille l'étage du dessus : les dix champs
 * que `quantitativeFactsForCode` fusionne depuis `scripts/countries/data/` sont
 * re-calculés et confrontés au snapshot committé. Cette fusion est déterministe
 * et hors-ligne, donc rejouable en CI — ce qui permet d'attraper une édition à
 * la main de `facts.ts` (pourtant marqué `@generated`) comme une révision de
 * dataset sans regen.
 *
 * **Hors de portée** : tout ce qui vient du réseau (population, capitals,
 * memberships, popularité…) ou d'une curation non rejouable ici (drapeaux,
 * classifications gameplay). Ces champs-là n'ont d'autre juge que
 * `pnpm build:countries`.
 */
import type { CountryFacts } from "../../content/countries/type";
import {
  type QuantitativeDatasets,
  quantitativeFactsForCode,
} from "./buildCountriesLib";
import type { CapitalLabelsSnapshot } from "./data/types";

/** Les champs de `CountryFacts` que la fusion des datasets produit intégralement. */
const DATASET_DERIVED_KEYS = [
  "utcOffsetCount",
  "lastVolcanicEruptionYear",
  "mountainAreaShare",
  "forestCoverShare",
  "urbanCentresOver1M",
  "productionRanks",
  "coalElectricityShare",
  "formerSovereigns",
  "sovereigntyYear",
  "sovereigntyKind",
] as const;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Égalité de surface, suffisante pour les dix champs : scalaires (`Object.is`),
 * `formerSovereigns` (ordre du dataset, donc comparé en séquence) et
 * `productionRanks` (record plat, comparé sur l'union des clés).
 */
function sameFactValue(expected: unknown, actual: unknown): boolean {
  if (Array.isArray(expected) || Array.isArray(actual)) {
    return (
      Array.isArray(expected) &&
      Array.isArray(actual) &&
      expected.length === actual.length &&
      expected.every((item, index) => item === actual[index])
    );
  }
  if (isPlainRecord(expected) && isPlainRecord(actual)) {
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    return [...keys].every((key) => expected[key] === actual[key]);
  }
  return Object.is(expected, actual);
}

function format(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

/**
 * Confronte les champs dérivés de `factsByCode` à ce que `datasets` produit
 * aujourd'hui. Retourne une ligne par pays divergent, listant chaque champ en
 * cause — actionnable tel quel dans un log de CI.
 */
export function validateDatasetFacts(
  factsByCode: Readonly<Record<string, CountryFacts>>,
  datasets: QuantitativeDatasets,
  codes: readonly string[],
): string[] {
  const errors: string[] = [];

  codes.forEach((code) => {
    const facts = factsByCode[code];
    // Un pays absent de facts.ts est déjà signalé par validateCountryFacts.
    if (!facts) return;

    const derived = quantitativeFactsForCode(code, datasets);
    const divergences = DATASET_DERIVED_KEYS.filter(
      (key) => !sameFactValue(derived[key], facts[key]),
    ).map(
      (key) =>
        `${key} attendu ${format(derived[key])}, trouvé ${format(facts[key])}`,
    );

    if (divergences.length > 0) {
      errors.push(
        `${code}: faits dérivés obsolètes (${divergences.join(" ; ")}) — lancer pnpm build:countries`,
      );
    }
  });

  return errors;
}

/**
 * Confronte les libellés des capitales de `factsByCode` au dataset
 * `capitalLabels` (override d'abord, récolte ensuite). Signale aussi les
 * entrées orphelines du dataset : la liste des capitales est celle de REST
 * Countries, le dataset ne fait que la traduire — une entrée sans capitale
 * source correspondante signale une capitale ajoutée ou retirée.
 */
export function validateCapitalLabels(
  factsByCode: Readonly<Record<string, CountryFacts>>,
  dataset: CapitalLabelsSnapshot,
  codes: readonly string[],
): string[] {
  const errors: string[] = [];

  codes.forEach((code) => {
    const facts = factsByCode[code];
    if (!facts) return;
    const sourceNames = new Set(facts.capitals.map((capital) => capital.name));

    facts.capitals.forEach((capital) => {
      const expected =
        dataset.overrides[code]?.[capital.name] ??
        dataset.labels[code]?.[capital.name];
      if (!expected) {
        errors.push(
          `${code}: capitale « ${capital.name} » sans libellé dans le dataset — lancer pnpm harvest:capitals`,
        );
        return;
      }
      if (
        capital.names.fr !== expected.fr ||
        capital.names.en !== expected.en
      ) {
        errors.push(
          `${code}: libellés de « ${capital.name} » obsolètes (attendu ${format({ fr: expected.fr, en: expected.en })}, trouvé ${format(capital.names)}) — lancer pnpm build:countries`,
        );
      }
    });

    [dataset.labels[code], dataset.overrides[code]].forEach((entries) => {
      Object.keys(entries ?? {})
        .filter((name) => !sourceNames.has(name))
        .forEach((name) => {
          errors.push(
            `${code}: le dataset des capitales porte « ${name} », absente des capitales sources`,
          );
        });
    });
  });

  return errors;
}
