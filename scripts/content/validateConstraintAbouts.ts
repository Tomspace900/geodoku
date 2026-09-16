/**
 * Garde du registre "à propos" des contraintes (les `about.ts` par contrainte,
 * `content/constraints/abouts.ts`, `content/sources.ts`) — câblée à `check-content.ts`.
 *
 * Le type `AboutRegistry` garantit déjà, à la compilation, qu'il existe un
 * `about.ts` pour chaque contrainte active ou archivée et pour aucune autre :
 * cette garde couvre ce que le type ne peut pas exprimer, sur le patron de
 * `checkAnswerSets` pour `answers.ts` :
 *   - présence d'un `about.ts` par dossier actif/archivé, absence en réserve,
 *     aucun dossier orphelin (contrôle **fichier**, indépendant du registre) ;
 *   - une clarification non nulle a des `fr`/`en` non vides, ≤ 160 caractères,
 *     et ne nomme aucun pays du catalogue — sauf un nom déjà présent dans le
 *     libellé traduit de la contrainte, ou une exception motivée dans
 *     `ACCEPTED_COUNTRY_MENTIONS` (même patron que `ACCEPTED_OMISSIONS` pour la
 *     souveraineté).
 *
 * Les fonctions `*Errors` sont pures (données injectées, testables en isolation
 * dans les deux sens) ; `validateConstraintAbouts` les câble sur le contenu réel,
 * sur le patron de `validateContentSeam` / `contentSeamViolations`.
 *
 * `referencedSourcesFromAbouts` est réutilisée par `check-content.ts`, qui
 * l'unit avec `referencedSourcesFromFactProvenance` (lot 2) avant d'appeler
 * `unreferencedSourceErrors` une seule fois sur l'ensemble de
 * `content/sources.ts` — une source ne servant qu'aux faits pays
 * (`ghsl_urban_centre_database`) ne doit pas être signalée orpheline ici.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  ARCHIVED_CONSTRAINT_IDS,
  CONSTRAINT_IDS,
  type ConstraintId,
  RESERVE_CONSTRAINT_IDS,
} from "../../content/constraints";
import { aboutForConstraint } from "../../content/constraints/abouts";
import { COUNTRY_CATALOG } from "../../content/countries/catalog";
import type { SourceId } from "../../content/sources";
import type { LocalizedString } from "../../content/type";
import { CONSTRAINT_BY_ID } from "../../src/features/game/logic/constraints";
import { translate } from "../../src/i18n";

const CLARIFICATION_MAX_LENGTH = 160;

/**
 * Faux positifs motivés du détecteur de noms de pays dans une clarification —
 * même rôle qu'`ACCEPTED_OMISSIONS` pour `validateSovereigntySources`. Vide
 * aujourd'hui : chaque clarification a été rédigée pour l'éviter.
 */
export const ACCEPTED_COUNTRY_MENTIONS: Readonly<
  Partial<Record<ConstraintId, readonly string[]>>
> = {};

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalize(value: string): string {
  return stripAccents(value).toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Comparaison normalisée (NFD, minuscules, bornes de mot) — exportée pour les tests. */
export function containsWholeWord(haystack: string, needle: string): boolean {
  if (needle.trim().length === 0) return false;
  const pattern = new RegExp(`\\b${escapeRegExp(normalize(needle))}\\b`);
  return pattern.test(normalize(haystack));
}

/**
 * Erreurs d'une clarification isolée : longueur, non-vide, et présence d'un
 * nom de pays non couvert par le libellé traduit ni par les exceptions.
 */
export function clarificationErrors(params: {
  id: string;
  locale: "fr" | "en";
  text: string;
  translatedLabel: string;
  countryNames: readonly string[];
  acceptedMentions?: readonly string[];
}): string[] {
  const { id, locale, text, translatedLabel, countryNames } = params;
  const accepted = new Set(params.acceptedMentions ?? []);
  const errors: string[] = [];

  if (!text || text.trim().length === 0) {
    errors.push(`${id}: clarification ${locale} vide`);
    return errors;
  }
  if (text.length > CLARIFICATION_MAX_LENGTH) {
    errors.push(
      `${id}: clarification ${locale} dépasse ${CLARIFICATION_MAX_LENGTH} caractères (${text.length})`,
    );
  }

  countryNames
    .filter((countryName) => containsWholeWord(text, countryName))
    .forEach((countryName) => {
      if (containsWholeWord(translatedLabel, countryName)) return;
      if (accepted.has(countryName)) return;
      errors.push(
        `${id}: clarification ${locale} nomme « ${countryName} », absent du libellé — reformuler ou motiver dans ACCEPTED_COUNTRY_MENTIONS`,
      );
    });

  return errors;
}

/** Un `about.ts` par id attendu, aucun en réserve, aucun orphelin. */
export function aboutFileCoverageErrors(params: {
  existingAboutIds: readonly string[];
  expectedIds: readonly string[];
  reserveIdsWithAbout: readonly string[];
}): string[] {
  const errors: string[] = [];
  const existingSorted = [...params.existingAboutIds].sort();
  const expectedSorted = [...params.expectedIds].sort();
  const mismatch =
    existingSorted.length !== expectedSorted.length ||
    existingSorted.some((id, index) => id !== expectedSorted[index]);
  if (mismatch) {
    errors.push(
      "contraintes: dossiers about.ts absents, orphelins, ou présents en réserve",
    );
  }
  params.reserveIdsWithAbout.forEach((id) => {
    errors.push(`${id}: en réserve mais about.ts présent`);
  });
  return errors;
}

/** Chaque `SourceId` déclaré est cité par au moins une contrainte. */
export function unreferencedSourceErrors(
  allSourceIds: readonly string[],
  referencedSourceIds: ReadonlySet<string>,
): string[] {
  return allSourceIds
    .filter((sourceId) => !referencedSourceIds.has(sourceId))
    .map(
      (sourceId) =>
        `sources: « ${sourceId} » n'est référencé par aucune contrainte`,
    );
}

/** Toute URL de source doit être en `https://`. */
export function sourceUrlErrors(
  sources: ReadonlyMap<string, { url: string }>,
): string[] {
  return [...sources.entries()]
    .filter(([, source]) => !source.url.startsWith("https://"))
    .map(
      ([id, source]) =>
        `sources: « ${id} » a une URL non https (${source.url})`,
    );
}

function checkAboutFiles(errors: string[]): void {
  const constraintRoot = resolve("content", "constraints");
  const existingAboutIds = readdirSync(constraintRoot).filter((name) => {
    const full = resolve(constraintRoot, name);
    return (
      statSync(full).isDirectory() && existsSync(resolve(full, "about.ts"))
    );
  });
  const reserveIdsWithAbout = RESERVE_CONSTRAINT_IDS.filter((id) =>
    existsSync(resolve(constraintRoot, id, "about.ts")),
  );
  errors.push(
    ...aboutFileCoverageErrors({
      existingAboutIds,
      expectedIds: [...CONSTRAINT_IDS, ...ARCHIVED_CONSTRAINT_IDS],
      reserveIdsWithAbout,
    }),
  );
}

function allIds(): readonly ConstraintId[] {
  return [...CONSTRAINT_IDS, ...ARCHIVED_CONSTRAINT_IDS];
}

/** Chaque `SourceId` cité par au moins un `about.ts` — voir `check-content.ts`. */
export function referencedSourcesFromAbouts(): ReadonlySet<SourceId> {
  const referenced = new Set<SourceId>();
  allIds().forEach((id) => {
    aboutForConstraint(id).sources.forEach((sourceId) => {
      referenced.add(sourceId);
    });
  });
  return referenced;
}

function localizedCountryNames(locale: "fr" | "en"): readonly string[] {
  return COUNTRY_CATALOG.map(({ names }) => names[locale]);
}

function checkClarifications(errors: string[]): void {
  const namesByLocale: Record<"fr" | "en", readonly string[]> = {
    fr: localizedCountryNames("fr"),
    en: localizedCountryNames("en"),
  };

  allIds().forEach((id) => {
    const about = aboutForConstraint(id);
    const clarification: LocalizedString | null = about.clarification;
    if (clarification === null) return;

    const constraint = CONSTRAINT_BY_ID.get(id);
    (["fr", "en"] as const).forEach((locale) => {
      const translatedLabel = constraint
        ? translate(locale, constraint.labelKey)
        : "";
      errors.push(
        ...clarificationErrors({
          id,
          locale,
          text: clarification[locale],
          translatedLabel,
          countryNames: namesByLocale[locale],
          acceptedMentions: ACCEPTED_COUNTRY_MENTIONS[id],
        }),
      );
    });
  });
}

export function validateConstraintAbouts(): string[] {
  const errors: string[] = [];
  checkAboutFiles(errors);
  checkClarifications(errors);
  return errors;
}
