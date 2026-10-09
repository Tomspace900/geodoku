/**
 * Garde de fraîcheur des faits **dérivés de datasets** (`content/countries/facts.ts`).
 *
 * `checkDerivationFreshness` surveille l'étage du dessous — les `answers.ts`
 * face à `COUNTRY_FACTS`. Ici on surveille l'étage du dessus : les champs
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
  type CurrencyCorrection,
  currencyAndDemonymFacts,
  type DemonymCorrection,
  type QuantitativeDatasets,
  quantitativeFactsForCode,
  type WcCurrencyDemonymRow,
} from "./buildCountriesLib";
import type {
  CapitalLabelsSnapshot,
  HighestPointsSnapshot,
  SovereigntySnapshot,
} from "./data/types";

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
  "sovereigntyDate",
  "sovereigntySheetHidden",
  "highestPoint",
] as const;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Égalité de structure : scalaires (`Object.is`), `formerSovereigns` (ordre du
 * dataset, donc comparé en séquence), `productionRanks` (record plat, comparé
 * sur l'union des clés) et `highestPoint` (objet dont `names` est lui-même un
 * record ou `null`) — d'où la récursion.
 */
function sameFactValue(expected: unknown, actual: unknown): boolean {
  if (Array.isArray(expected) || Array.isArray(actual)) {
    return (
      Array.isArray(expected) &&
      Array.isArray(actual) &&
      expected.length === actual.length &&
      expected.every((item, index) => sameFactValue(item, actual[index]))
    );
  }
  if (isPlainRecord(expected) && isPlainRecord(actual)) {
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    return [...keys].every((key) => sameFactValue(expected[key], actual[key]));
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

/**
 * Confronte `currencies` et `demonyms` de `factsByCode` à world-countries (un
 * paquet npm versionné, donc rejouable hors-ligne) corrigé par les tables
 * `currencyCorrectionsByIso3` / `demonymCorrectionsByIso3`. Une correction
 * orpheline (pays absent du catalogue) est signalée aussi.
 */
export function validateCurrencyDemonymFacts(
  factsByCode: Readonly<Record<string, CountryFacts>>,
  wcRows: Readonly<Record<string, WcCurrencyDemonymRow>>,
  currencyCorrections: Readonly<Record<string, CurrencyCorrection>>,
  demonymCorrections: Readonly<Record<string, DemonymCorrection>>,
  codes: readonly string[],
): string[] {
  const errors: string[] = [];

  codes.forEach((code) => {
    const facts = factsByCode[code];
    if (!facts) return;
    try {
      const expected = currencyAndDemonymFacts(
        code,
        wcRows[code],
        currencyCorrections[code],
        demonymCorrections[code],
      );
      (["currencies", "demonyms"] as const).forEach((key) => {
        if (JSON.stringify(expected[key]) !== JSON.stringify(facts[key])) {
          errors.push(
            `${code}: ${key} obsolète (attendu ${format(expected[key])}, trouvé ${format(facts[key])}) — lancer pnpm build:countries`,
          );
        }
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  });

  [...Object.keys(currencyCorrections), ...Object.keys(demonymCorrections)]
    .filter((code) => !codes.includes(code))
    .forEach((code) => {
      errors.push(
        `${code}: correction de monnaie/gentilé sans pays du catalogue`,
      );
    });

  return errors;
}

/**
 * Cohérence du dataset des points culminants avec le catalogue et avec le
 * dataset de souveraineté : mêmes ISO3, même commit du miroir Factbook (« au
 * même commit »), pas d'override orphelin ni redondant, et un point sans nom
 * uniquement quand rien n'en propose.
 */
export function validateHighestPoints(
  dataset: HighestPointsSnapshot,
  sovereignty: SovereigntySnapshot,
  codes: readonly string[],
): string[] {
  const errors: string[] = [];
  if (dataset.factbookCommit !== sovereignty.sourceCommit) {
    errors.push(
      `highestPoints: commit Factbook ${dataset.factbookCommit} ≠ sovereignty ${sovereignty.sourceCommit} — les deux datasets lisent le même miroir`,
    );
  }
  codes
    .filter((code) => !dataset.points[code])
    .forEach((code) => {
      errors.push(
        `${code}: sans point culminant — lancer pnpm harvest:highest-points`,
      );
    });
  Object.keys(dataset.points)
    .filter((code) => !codes.includes(code))
    .forEach((code) => {
      errors.push(`${code}: point culminant sans pays du catalogue`);
    });
  Object.entries(dataset.overrides).forEach(([code, override]) => {
    if (!dataset.points[code]) {
      errors.push(`${code}: override de point culminant orphelin`);
    }
    if (!override.reason.trim()) {
      errors.push(`${code}: override de point culminant sans motif`);
    }
  });
  return errors;
}

/**
 * Écarts acceptés entre `elevationM >= 5000` et `peak_over_5000m`, par ISO3,
 * **chacun avec son motif**. Vide : le sondage du 2026-09-25 n'en trouve aucun.
 * Y verser un écart sans motif viderait la garde de son sens.
 */
export const ACCEPTED_PEAK_GAPS: Readonly<Record<string, string>> = {};

/** Seuil du critère « sommet de plus de 5 000 m » (`peak_over_5000m`). */
export const PEAK_THRESHOLD_M = 5000;

/**
 * Cohérence de `highestPoint.elevationM >= 5000` avec `physicalFeatures`
 * ∋ `peak_over_5000m` : la liste de `physical_peak_over_5000m` ne change pas en
 * P4, donc un écart arrête le lot. Les écarts acceptés sont des entrées
 * motivées (`accepted`) ; une entrée devenue sans objet est signalée aussi.
 */
export function validatePeakCoherence(
  factsByCode: Readonly<Record<string, CountryFacts>>,
  accepted: Readonly<Record<string, string>>,
  codes: readonly string[],
): string[] {
  const errors: string[] = [];
  codes.forEach((code) => {
    const facts = factsByCode[code];
    if (!facts) return;
    const overThreshold = facts.highestPoint.elevationM >= PEAK_THRESHOLD_M;
    const flagged = facts.physicalFeatures.includes("peak_over_5000m");
    const diverges = overThreshold !== flagged;
    if (diverges && !accepted[code]) {
      errors.push(
        `${code}: point culminant ${facts.highestPoint.elevationM} m ${overThreshold ? "≥" : "<"} 5 000 m mais peak_over_5000m ${flagged ? "présent" : "absent"} — écart à trancher (la liste physical_peak_over_5000m ne change pas en P4)`,
      );
    }
    if (!diverges && accepted[code]) {
      errors.push(
        `${code}: écart 5 000 m accepté mais sans objet — le retirer`,
      );
    }
  });
  Object.keys(accepted)
    .filter((code) => !codes.includes(code))
    .forEach((code) => {
      errors.push(`${code}: écart 5 000 m accepté sans pays du catalogue`);
    });
  return errors;
}
