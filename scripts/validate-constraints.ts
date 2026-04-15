/**
 * Validates all constraints against countries.json:
 * - Sweet-spot counts per category
 * - Difficulty tier distribution
 * - Category diversity (how many constraints per category)
 * - Pairwise Jaccard overlap (top redundant pairs)
 *
 * Run: pnpm validate:constraints
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Country } from "../src/features/countries/types.ts";
import {
  CONSTRAINTS,
  type Constraint,
  type ConstraintCategory,
  type ConstraintDifficulty,
} from "../src/features/game/logic/constraints.ts";
import { translate } from "../src/i18n/index.ts";

const SWEET_SPOT_PIVOT: [number, number] = [5, 20];
const SWEET_SPOT_DEFAULT: [number, number] = [8, 60];
const SWEET_SPOT_FLAG: [number, number] = [8, 100];
const SWEET_SPOT_NAME: [number, number] = [8, 40];
const SWEET_SPOT_SUBREGION: [number, number] = [8, 20];
const SWEET_SPOT_EVENT: [number, number] = [8, 20];
const SWEET_SPOT_POLITICAL: [number, number] = [8, 35];

function sweetSpotForCategory(category: ConstraintCategory): [number, number] {
  switch (category) {
    case "borders_pivot":
      return SWEET_SPOT_PIVOT;
    case "flag":
      return SWEET_SPOT_FLAG;
    case "name":
      return SWEET_SPOT_NAME;
    case "subregion":
      return SWEET_SPOT_SUBREGION;
    case "event":
      return SWEET_SPOT_EVENT;
    case "political":
      return SWEET_SPOT_POLITICAL;
    default:
      return SWEET_SPOT_DEFAULT;
  }
}

/** Plages spécifiques (effets larges volontaires pour la génération). */
function sweetSpotForConstraint(c: Constraint): [number, number] {
  if (c.id === "borders_solo" || c.id === "language_multilingual") {
    return [8, 120];
  }
  return sweetSpotForCategory(c.category);
}

const countries = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "src/features/countries/data/countries.json"),
    "utf-8",
  ),
) as Country[];

type Row = {
  id: string;
  label: string;
  category: ConstraintCategory;
  difficulty: ConstraintDifficulty;
  count: number;
  flag: string;
};

function countForConstraint(c: Constraint): number {
  return countries.filter((country) => c.predicate(country)).length;
}

const rows: Row[] = CONSTRAINTS.map((constraint) => {
  const count = countForConstraint(constraint);
  const [low, high] = sweetSpotForConstraint(constraint);
  const flag =
    count < low ? "⚠️  TROP PEU" : count > high ? "⚠️  TROP LARGE" : "✓";
  return {
    id: constraint.id,
    label: translate("fr", constraint.labelKey),
    category: constraint.category,
    difficulty: constraint.difficulty,
    count,
    flag,
  };
});

// ─── Print by category ────────────────────────────────────────────────────────

const categories = [...new Set(rows.map((r) => r.category))];

let warnings = 0;
for (const cat of categories.sort()) {
  const group = rows.filter((r) => r.category === cat);
  const avg =
    group.reduce((s, r) => s + r.count, 0) / Math.max(1, group.length);
  console.log(
    `\n── ${cat} (${group.length} contraintes, ~${avg.toFixed(0)} pays en moyenne) ──`,
  );
  for (const r of group) {
    const countStr = String(r.count).padStart(3);
    if (r.flag !== "✓") warnings++;
    const diff = r.difficulty.padEnd(6);
    console.log(`  ${r.flag.padEnd(14)} ${countStr}  [${diff}] ${r.label}`);
  }
}

// ─── Difficulty distribution ─────────────────────────────────────────────────

const byDiff: Record<ConstraintDifficulty, number> = {
  easy: 0,
  medium: 0,
  hard: 0,
};
for (const r of rows) {
  byDiff[r.difficulty] += 1;
}
console.log("\n── DIFFICULTÉ (nombre de contraintes par tier) ───────────────");
console.log(
  `  easy: ${byDiff.easy}   medium: ${byDiff.medium}   hard: ${byDiff.hard}`,
);

// ─── Pairwise Jaccard (top overlaps) ─────────────────────────────────────────

type PairRow = { a: string; b: string; j: number; inter: number };

const pairs: PairRow[] = [];
for (let i = 0; i < CONSTRAINTS.length; i++) {
  for (let j = i + 1; j < CONSTRAINTS.length; j++) {
    const ca = CONSTRAINTS[i];
    const cb = CONSTRAINTS[j];
    const setA = new Set(
      countries.filter((c) => ca.predicate(c)).map((c) => c.code),
    );
    const setB = new Set(
      countries.filter((c) => cb.predicate(c)).map((c) => c.code),
    );
    let inter = 0;
    for (const code of setA) {
      if (setB.has(code)) inter += 1;
    }
    const union = setA.size + setB.size - inter;
    const jaccard = union === 0 ? 0 : inter / union;
    pairs.push({ a: ca.id, b: cb.id, j: jaccard, inter });
  }
}
pairs.sort((x, y) => y.j - x.j);

console.log("\n── TOP 12 PAIRES (Jaccard le plus élevé) ─────────────────────");
const highOverlap = pairs.filter((p) => p.j >= 0.5);
for (const p of pairs.slice(0, 12)) {
  const mark = p.j >= 0.5 ? " ⚠️ overlap" : "";
  console.log(
    `  J=${p.j.toFixed(2).padStart(5)}  inter=${String(p.inter).padStart(3)}  ${p.a}  ×  ${p.b}${mark}`,
  );
}
if (highOverlap.length > 0) {
  console.log(
    `\n  → ${highOverlap.length} paire(s) avec Jaccard ≥ 0.5 (redondance cognitive forte).`,
  );
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(
  "\n── RÉSUMÉ ────────────────────────────────────────────────────────",
);
console.log(`  Total contraintes : ${CONSTRAINTS.length}`);
console.log(`  Hors sweet-spot   : ${warnings}`);
if (warnings === 0) {
  console.log("  Toutes les contraintes sont dans les plages cibles.");
}
