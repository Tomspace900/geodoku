/**
 * Validates all constraints against countries.json and prints a calibration report.
 * A constraint is flagged if its match count is outside the sweet-spot ranges:
 *   - borders_pivot : [5, 20]
 *   - all others    : [8, 60]
 * Run: pnpm validate:constraints
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CONSTRAINTS } from "../src/features/game/logic/constraints.ts";
import type { Country } from "../src/features/countries/types.ts";

const SWEET_SPOT_PIVOT: [number, number] = [5, 20];
const SWEET_SPOT_DEFAULT: [number, number] = [8, 60];

const countries = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "src/features/countries/data/countries.json"),
    "utf-8",
  ),
) as Country[];

type Row = {
  id: string;
  label: string;
  category: string;
  count: number;
  flag: string;
};

const rows: Row[] = CONSTRAINTS.map((constraint) => {
  const count = countries.filter(constraint.predicate).length;
  const [lo, hi] =
    constraint.category === "borders_pivot"
      ? SWEET_SPOT_PIVOT
      : SWEET_SPOT_DEFAULT;
  const flag = count < lo ? "⚠️  TROP PEU" : count > hi ? "⚠️  TROP LARGE" : "✓";
  return { id: constraint.id, label: constraint.label, category: constraint.category, count, flag };
});

// Print grouped by category
const categories = [...new Set(rows.map((r) => r.category))];

let warnings = 0;
for (const cat of categories) {
  const group = rows.filter((r) => r.category === cat);
  console.log(`\n── ${cat} ─────────────────────────────────────`);
  for (const r of group) {
    const countStr = String(r.count).padStart(3);
    if (r.flag !== "✓") warnings++;
    console.log(`  ${r.flag.padEnd(14)} ${countStr}  ${r.label}`);
  }
}

console.log(`\n── RÉSUMÉ ────────────────────────────────────────`);
console.log(`  Total contraintes : ${CONSTRAINTS.length}`);
console.log(`  Hors sweet-spot   : ${warnings}`);
if (warnings === 0) {
  console.log("  Toutes les contraintes sont bien calibrées.");
}
