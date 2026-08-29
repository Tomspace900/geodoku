/**
 * `pnpm build:answers` — dérivation PURE, hors-ligne.
 *
 * Applique chaque dérivation de `content/constraints/derivations.ts` aux 197
 * pays du snapshot et (ré)écrit `content/constraints/<id>/answers.ts` pour les
 * contraintes actives. Les 11 listes archivées sont figées à la main et ne
 * sont jamais touchées ici.
 *
 * Sortie déterministe : listes ISO3 triées, formatage Biome. Relire le diff.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DERIVATIONS,
  type DerivationContext,
} from "../../content/constraints/derivations";
import { COUNTRY_CODES } from "../../content/countries/countryCodes";
import { COUNTRY_FACTS } from "../../content/countries/facts";

const ROOT = resolve(import.meta.dirname, "..", "..");
const CONSTRAINTS_ROOT = resolve(ROOT, "content", "constraints");

const CONTEXT: DerivationContext = {
  factsOf: (code) => COUNTRY_FACTS[code],
};

function deriveAnswers(id: keyof typeof DERIVATIONS): string[] {
  const predicate = DERIVATIONS[id];
  // COUNTRY_CODES est déjà trié : filter préserve l'ordre.
  return COUNTRY_CODES.filter((code) =>
    predicate(COUNTRY_FACTS[code], CONTEXT),
  );
}

function renderModule(id: string, answers: readonly string[]): string {
  const lines = answers.map((code) => `  "${code}",`);
  return [
    "// @generated par pnpm build:answers — ne pas éditer à la main.",
    'import { defineAnswerSet } from "../defineAnswerSet";',
    "",
    `export default defineAnswerSet("${id}", [`,
    ...lines,
    "]);",
    "",
  ].join("\n");
}

function main(): void {
  const ids = Object.keys(DERIVATIONS) as Array<keyof typeof DERIVATIONS>;
  let total = 0;
  for (const id of ids) {
    const answers = deriveAnswers(id);
    total += answers.length;
    const dir = resolve(CONSTRAINTS_ROOT, id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "answers.ts"), renderModule(id, answers));
  }
  console.log(
    `build:answers — ${ids.length} contraintes actives, ${total} entrées ISO3 au total.`,
  );
}

main();
