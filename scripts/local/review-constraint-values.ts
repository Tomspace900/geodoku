/**
 * Relecture en un bloc : pour chaque contrainte (active puis archivée), le
 * « à propos » que voit le joueur (sources, convention, clarification) et la
 * valeur affichée en face de chaque pays dans le drawer de la grille solution.
 *
 *   pnpm review:constraint-values [chemin]
 *
 * Écrit par défaut dans `docs/reports/constraint-values.md` (gitignoré).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  ARCHIVED_CONSTRAINT_IDS,
  answersForConstraint,
  CONSTRAINT_IDS,
  type ConstraintId,
} from "../../content/constraints";
import { COUNTRY_CATALOG } from "../../content/countries/catalog";
import { isCountryCode } from "../../content/countries/countryCodes";
import { COUNTRY_FACTS } from "../../content/countries/facts";
import { constraintValueFor } from "../../src/features/countries/logic/constraintValue";
import { formatConstraintValue } from "../../src/features/countries/logic/constraintValueFormat";
import { constraintSourceView } from "../../src/features/game/logic/constraintSource";
import { translate } from "../../src/i18n";
import { fr } from "../../src/i18n/locales/fr";

const LOCALE = "fr";
const labels = fr.constraint as Record<string, string>;
const NAMES = new Map<string, string>(
  COUNTRY_CATALOG.map((c) => [c.iso3, c.names[LOCALE]]),
);

/** Espaces insécables → espaces, pour une relecture sans caractères invisibles. */
function plain(text: string): string {
  return text.replace(/[  ]/g, " ");
}

function nameOf(iso: string): string {
  return NAMES.get(iso) ?? iso;
}

type Row = { iso: string; name: string; value: string | null };

function rowsFor(id: ConstraintId): Row[] {
  return [...answersForConstraint(id)]
    .map((iso) => {
      const value = isCountryCode(iso)
        ? constraintValueFor(id, COUNTRY_FACTS[iso])
        : null;
      return {
        iso,
        name: nameOf(iso),
        value: value
          ? plain(
              formatConstraintValue(value, LOCALE, (key, vars) =>
                translate(LOCALE, key, vars),
              ),
            )
          : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, LOCALE));
}

function aboutLines(id: ConstraintId): string[] {
  const view = constraintSourceView(id, LOCALE);
  const sources =
    view.sources.length === 0
      ? view.isConvention
        ? "aucune source externe"
        : "—"
      : view.sources
          .map(
            (s) => `[${s.name}](${s.url})${s.vintage ? ` (${s.vintage})` : ""}`,
          )
          .join(", ");
  return [
    `- **Source${view.sources.length > 1 ? "s" : ""}** : ${sources}${view.isConvention ? `${view.sources.length > 0 ? " — " : ", "}classification Geodoku (convention)` : ""}`,
    `- **Clarification** : ${view.clarification ? plain(view.clarification) : "_(aucune)_"}`,
  ];
}

function block(id: ConstraintId): {
  text: string;
  shown: number;
  total: number;
} {
  const archived = (ARCHIVED_CONSTRAINT_IDS as readonly string[]).includes(id);
  const rows = rowsFor(id);
  const withValue = rows.filter((r) => r.value !== null);
  const without = rows.filter((r) => r.value === null);
  const lines = [
    `### ${plain(labels[id] ?? "⚠️ LIBELLÉ MANQUANT")}  \`${id}\``,
    "",
    ...aboutLines(id),
  ];
  if (withValue.length === 0) {
    lines.push(
      archived
        ? `- **Valeur affichée** : aucune — liste archivée, figée à la main (les faits courants peuvent la contredire) — ${rows.length} pays`
        : `- **Valeur affichée** : aucune (la valeur répéterait le libellé, ou la donnée manque) — ${rows.length} pays`,
    );
  } else {
    lines.push(
      `- **Valeur affichée** : ${withValue.length} pays sur ${rows.length}`,
      "",
      ...withValue.map((r) => `  - ${r.name} — ${r.value}`),
    );
    if (without.length > 0) {
      lines.push(
        "",
        `  _Sans valeur (donnée absente pour ces pays) : ${without.map((r) => r.name).join(", ")}_`,
      );
    }
  }
  return {
    text: `${lines.join("\n")}\n`,
    shown: withValue.length,
    total: rows.length,
  };
}

type Block = { id: ConstraintId; text: string; shown: number; total: number };

const active: Block[] = CONSTRAINT_IDS.map((id) => ({ id, ...block(id) }));
const archived: Block[] = ARCHIVED_CONSTRAINT_IDS.map((id) => ({
  id,
  ...block(id),
}));

const summary = (items: Block[]) =>
  items.map(
    ({ id, shown, total }) =>
      `| \`${id}\` | ${plain(labels[id] ?? "?")} | ${shown === 0 ? "—" : `${shown}/${total}`} |`,
  );

const outPath = process.argv[2] ?? "docs/reports/constraint-values.md";
const md = [
  "# Relecture : « à propos » et valeur affichée par pays\n",
  "Pour chaque contrainte : ce que voit le joueur au tap sur l'en-tête (sources, convention, clarification) et la ligne de valeur affichée sous chaque pays dans le drawer de la grille solution (locale FR).\n",
  "## Vue d'ensemble\n",
  "| Contrainte | Libellé | Pays avec valeur |",
  "| --- | --- | --- |",
  ...summary(active),
  ...summary(archived),
  "",
  `## Actives (${CONSTRAINT_IDS.length})\n`,
  ...active.map((b) => b.text),
  `## Archivées (${ARCHIVED_CONSTRAINT_IDS.length})\n`,
  ...archived.map((b) => b.text),
].join("\n");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, md, "utf8");
console.error(`Écrit ${outPath}`);
