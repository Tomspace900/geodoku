/**
 * Garde de cohérence du contenu éditorial (`content/`), câblée au job `quality`.
 *
 * Vérifie ce qu'aucun type ne peut exprimer :
 *   - synchronisation catalogue ↔ codes ↔ popularité ↔ faits ;
 *   - couverture / tri / unicité des listes de réponses ;
 *   - **obsolescence** : re-dérive les 60 listes actives depuis `COUNTRY_FACTS`
 *     et échoue si un `answers.ts` committé ne correspond plus (facts modifiés
 *     sans regen, ou liste éditée à la main) ;
 *   - **provenance** : présence et frontmatter cohérent des `SOURCE.md`
 *     (un par contrainte) et des trois documents de socle.
 *
 *   pnpm check:content
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  ARCHIVED_CONSTRAINT_IDS,
  answersForConstraint,
  CONSTRAINT_ANSWER_SETS,
  CONSTRAINT_IDS,
} from "../../content/constraints";
import {
  DERIVATIONS,
  type DerivationContext,
} from "../../content/constraints/derivations";
import { COUNTRY_CATALOG } from "../../content/countries/catalog";
import { COUNTRY_CODES } from "../../content/countries/countryCodes";
import { COUNTRY_FACTS } from "../../content/countries/facts";
import { COUNTRY_POPULARITY } from "../../content/countries/popularity";
import {
  ARCHIVED_CONSTRAINTS,
  CONSTRAINTS,
} from "../../src/features/game/logic/constraints";
import {
  validateCountryCatalog,
  validateCountryFacts,
} from "../countries/validateCountryCatalog";

const EXPECTED_COUNTRY_COUNT = 197;
const EXPECTED_ACTIVE_COUNT = 60;
const EXPECTED_ARCHIVED_COUNT = 11;

function sameValues(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function isSorted(values: readonly string[]): boolean {
  return values.every(
    (value, index) => index === 0 || values[index - 1] < value,
  );
}

function checkCountries(errors: string[]): void {
  errors.push(...validateCountryCatalog(COUNTRY_CATALOG));
  errors.push(...validateCountryFacts(COUNTRY_FACTS, COUNTRY_CODES));

  const countryCodes = COUNTRY_CATALOG.map(({ iso3 }) => iso3);
  if (COUNTRY_CATALOG.length !== EXPECTED_COUNTRY_COUNT) {
    errors.push(
      `catalogue: ${COUNTRY_CATALOG.length} pays au lieu de ${EXPECTED_COUNTRY_COUNT}`,
    );
  }
  if (!isSorted(countryCodes)) errors.push("catalogue: codes ISO3 non triés");
  if (!sameValues(countryCodes, COUNTRY_CODES)) {
    errors.push("catalogue: COUNTRY_CODES désynchronisé");
  }

  const popularityCodes = Object.keys(COUNTRY_POPULARITY.entries).sort();
  if (!sameValues(popularityCodes, [...countryCodes].sort())) {
    errors.push("popularité: couverture pays incomplète ou excédentaire");
  }
  Object.entries(COUNTRY_POPULARITY.entries).forEach(([iso3, entry]) => {
    if (!entry || entry.percentile < 0 || entry.percentile > 1) {
      errors.push(`${iso3}: percentile de popularité invalide`);
    }
  });
}

function checkConstraintCatalogs(errors: string[]): void {
  if (CONSTRAINT_IDS.length !== EXPECTED_ACTIVE_COUNT) {
    errors.push(
      `contraintes: ${CONSTRAINT_IDS.length} actives au lieu de ${EXPECTED_ACTIVE_COUNT}`,
    );
  }
  if (ARCHIVED_CONSTRAINT_IDS.length !== EXPECTED_ARCHIVED_COUNT) {
    errors.push(
      `contraintes: ${ARCHIVED_CONSTRAINT_IDS.length} archivées au lieu de ${EXPECTED_ARCHIVED_COUNT}`,
    );
  }
  if (
    !sameValues(
      CONSTRAINT_IDS,
      CONSTRAINTS.map(({ id }) => id),
    )
  ) {
    errors.push("contraintes: catalogue actif runtime désynchronisé");
  }
  if (
    !sameValues(
      ARCHIVED_CONSTRAINT_IDS,
      ARCHIVED_CONSTRAINTS.map(({ id }) => id),
    )
  ) {
    errors.push("contraintes: catalogue archivé runtime désynchronisé");
  }
}

// La correspondance identifiant ↔ dossier est vérifiée par le type
// `AnswerSetRegistry` : ici on ne contrôle que le contenu des listes.
function checkAnswerSets(errors: string[]): void {
  const expectedIds = [...CONSTRAINT_IDS, ...ARCHIVED_CONSTRAINT_IDS];
  const knownCodes: ReadonlySet<string> = new Set(COUNTRY_CODES);
  const coveredCodes = new Set<string>();
  CONSTRAINT_ANSWER_SETS.forEach(({ id, answers }) => {
    if (answers.length === 0) errors.push(`${id}: liste vide`);
    // Le tri strict couvre aussi l'unicité : deux entrées égales ne sont pas croissantes.
    if (!isSorted(answers)) {
      errors.push(`${id}: réponses non triées ou dupliquées`);
    }
    answers.forEach((iso3) => {
      if (!knownCodes.has(iso3)) errors.push(`${id}: pays inconnu ${iso3}`);
      coveredCodes.add(iso3);
    });
  });

  const uncovered = COUNTRY_CODES.filter((iso3) => !coveredCodes.has(iso3));
  if (uncovered.length > 0) {
    errors.push(
      `contraintes: pays sans aucune réponse (${uncovered.join(", ")})`,
    );
  }

  const constraintRoot = resolve("content", "constraints");
  const answerDirs = readdirSync(constraintRoot)
    .filter((name) => {
      const full = resolve(constraintRoot, name);
      return (
        statSync(full).isDirectory() && existsSync(resolve(full, "answers.ts"))
      );
    })
    .sort();
  if (!sameValues(answerDirs, [...expectedIds].sort())) {
    errors.push("contraintes: dossiers answers.ts absents ou orphelins");
  }
}

/**
 * Contrôle d'obsolescence : les `answers.ts` des 60 contraintes **actives**
 * doivent être exactement ce que `DERIVATIONS` produit sur `COUNTRY_FACTS`. Les
 * 11 archivées sont figées à la main, hors de ce contrôle.
 */
function checkDerivationFreshness(errors: string[]): void {
  const ctx: DerivationContext = { factsOf: (code) => COUNTRY_FACTS[code] };
  for (const id of CONSTRAINT_IDS) {
    const derived = COUNTRY_CODES.filter((code) =>
      DERIVATIONS[id](COUNTRY_FACTS[code], ctx),
    );
    const committed = answersForConstraint(id);
    if (!sameValues(committed, derived)) {
      const added = derived.filter((c) => !committed.includes(c));
      const removed = committed.filter((c) => !derived.includes(c));
      errors.push(
        `${id}: answers.ts obsolète (+[${added.join(",")}] -[${removed.join(",")}]) — lancer pnpm build:answers`,
      );
    }
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Provenance : chaque contrainte (active ou archivée) doit porter un `SOURCE.md`
 * au frontmatter cohérent, et les trois documents de socle doivent exister. On
 * ne police **pas** l'expiration de `review_after` (dates indicatives).
 */
function checkConstraintSources(errors: string[]): void {
  ["README.md", "countries/SOURCE.md", "constraints/SOURCES.md"].forEach(
    (rel) => {
      if (!existsSync(resolve("content", rel))) {
        errors.push(`socle: content/${rel} manquant`);
      }
    },
  );

  const archived: ReadonlySet<string> = new Set(ARCHIVED_CONSTRAINT_IDS);
  [...CONSTRAINT_IDS, ...ARCHIVED_CONSTRAINT_IDS].forEach((id) => {
    const path = resolve("content", "constraints", id, "SOURCE.md");
    if (!existsSync(path)) {
      errors.push(`${id}: SOURCE.md manquant`);
      return;
    }
    const raw = readFileSync(path, "utf8");
    const frontmatter = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatter) {
      errors.push(`${id}: SOURCE.md sans frontmatter`);
      return;
    }
    const fields = new Map<string, string>();
    frontmatter[1].split("\n").forEach((line) => {
      const pair = line.match(/^(\w+):\s*(.+?)\s*$/);
      if (pair) fields.set(pair[1], pair[2]);
    });

    if (fields.get("constraint_id") !== id) {
      errors.push(`${id}: SOURCE.md constraint_id ≠ nom du dossier`);
    }
    const expectedStatus = archived.has(id) ? "archived" : "active";
    if (fields.get("status") !== expectedStatus) {
      errors.push(`${id}: SOURCE.md status attendu « ${expectedStatus} »`);
    }
    (["checked_at", "review_after"] as const).forEach((key) => {
      const value = fields.get(key);
      if (!value || !ISO_DATE.test(value)) {
        errors.push(`${id}: SOURCE.md ${key} absent ou hors format YYYY-MM-DD`);
      }
    });
  });
}

function main(): void {
  const errors: string[] = [];
  checkCountries(errors);
  checkConstraintCatalogs(errors);
  checkAnswerSets(errors);
  checkDerivationFreshness(errors);
  checkConstraintSources(errors);

  if (errors.length > 0) {
    throw new Error(`Contenu invalide:\n- ${errors.join("\n- ")}`);
  }

  console.log(
    `Contenu valide : ${CONSTRAINT_IDS.length} contraintes actives, ${ARCHIVED_CONSTRAINT_IDS.length} archivées, ${COUNTRY_CATALOG.length} pays.`,
  );
}

main();
