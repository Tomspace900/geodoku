/**
 * HARNAIS DE PARITÉ — one-shot, supprimé à l'étape 7 (docs/content-refactor-p1.md).
 *
 * Prouve l'iso-fonctionnel AVANT tout portage runtime :
 *   1. vs develop : la liste générée == { iso3 | predicate(country) } calculé
 *      avec les prédicats ENCORE présents dans constraints.ts. Zéro écart exigé.
 *   2. vs v2 (commit 7054426) : écarts attendus listés, tout le reste investigué.
 *
 *   pnpm exec tsx scripts/content/parity-check.ts
 */
import { execFileSync } from "node:child_process";
import {
  answersForConstraint,
  CONSTRAINT_IDS,
} from "../../content/constraints";
import countriesJson from "../../src/features/countries/data/countries.json" with {
  type: "json",
};
import type { Country } from "../../src/features/countries/types";
import { CONSTRAINT_BY_ID } from "../../src/features/game/logic/constraints";

const V2_COMMIT = "7054426";
const ALL_COUNTRIES = countriesJson as unknown as Country[];

/** Écarts vs v2 attendus (postérieurs au commit v2). */
const EXPECTED_V2_DIFFS: Record<
  string,
  { added: string[]; removed: string[] }
> = {
  // Fix RDC ebbea1f : COD basculé dans l'hémisphère sud après la v2.
  latitude_south_hemisphere: { added: ["COD"], removed: [] },
};

function developAnswers(id: string): Set<string> {
  const constraint = CONSTRAINT_BY_ID.get(
    id as Parameters<typeof CONSTRAINT_BY_ID.get>[0],
  );
  if (!constraint) throw new Error(`Contrainte runtime introuvable: ${id}`);
  const predicate = (constraint as { predicate?: (c: Country) => boolean })
    .predicate;
  if (!predicate) {
    throw new Error(
      `constraints.ts n'expose plus predicate — lancer parity-check AVANT l'étape 4.`,
    );
  }
  return new Set(ALL_COUNTRIES.filter((c) => predicate(c)).map((c) => c.iso3));
}

function v2Answers(id: string): Set<string> {
  const out = execFileSync("git", [
    "show",
    `${V2_COMMIT}:content/constraints/${id}/answers.ts`,
  ]).toString();
  const codes = out.match(/"([A-Z]{3})"/g)?.map((m) => m.slice(1, 4)) ?? [];
  return new Set(codes);
}

function diff(
  a: Set<string>,
  b: Set<string>,
): { added: string[]; removed: string[] } {
  return {
    added: [...a].filter((x) => !b.has(x)).sort(),
    removed: [...b].filter((x) => !a.has(x)).sort(),
  };
}

function main(): void {
  let developMismatches = 0;
  const v2Report: string[] = [];

  for (const id of CONSTRAINT_IDS) {
    const generated = new Set(answersForConstraint(id));

    // 1. vs develop — verrou iso-fonctionnel.
    const dDiff = diff(generated, developAnswers(id));
    if (dDiff.added.length || dDiff.removed.length) {
      developMismatches++;
      console.error(
        `✗ ${id} vs develop — +[${dDiff.added.join(",")}] -[${dDiff.removed.join(",")}]`,
      );
    }

    // 2. vs v2 — écarts attendus tolérés, le reste signalé.
    const vDiff = diff(generated, v2Answers(id));
    const expected = EXPECTED_V2_DIFFS[id] ?? { added: [], removed: [] };
    const unexpectedAdded = vDiff.added.filter(
      (x) => !expected.added.includes(x),
    );
    const unexpectedRemoved = vDiff.removed.filter(
      (x) => !expected.removed.includes(x),
    );
    if (vDiff.added.length || vDiff.removed.length) {
      const tag =
        unexpectedAdded.length || unexpectedRemoved.length
          ? "⚠ INATTENDU"
          : "· attendu";
      v2Report.push(
        `${tag}  ${id} — +[${vDiff.added.join(",")}] -[${vDiff.removed.join(",")}]`,
      );
    }
  }

  console.log("\n─── vs v2 (écarts) ───");
  console.log(v2Report.length ? v2Report.join("\n") : "(aucun écart vs v2)");

  console.log(
    `\n─── vs develop ───\n${
      developMismatches === 0
        ? "0 écart — parité iso-fonctionnelle vérifiée sur les 60 contraintes actives."
        : `${developMismatches} contrainte(s) en écart — BUG de dérivation à corriger.`
    }`,
  );

  if (developMismatches > 0) process.exit(1);
}

main();
