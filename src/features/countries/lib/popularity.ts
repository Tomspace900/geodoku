// Imports relatifs (pas d'alias @/) : ce module est aussi bundlé par Convex
// (grids.ts) et par les scripts tsx, qui ne résolvent pas les tsconfig paths.
import countriesJson from "../data/countries.json";
import type { Country } from "../types";

const COUNTRIES = countriesJson as unknown as Country[];

/** Fallback médiane — pays sans pageviews obtenues au build. */
const POPULARITY_FALLBACK = 0.5;

/**
 * Nombre de solutions « les plus connues » qui portent le signal de difficulté.
 * Validé empiriquement (juin 2026, LODO-CV vs taux d'échec observé) : top3 est
 * au coude-à-coude avec top4/top5 (Δr < 0.01, indistinguable), tandis que les
 * agrégations « pool entier » (moyenne, médiane, min) dégradent nettement.
 */
const POPULARITY_TOP_K = 3;

/** ISO3 → percentile de notoriété [0..1] (popularityIndex de countries.json). */
const POPULARITY_BY_CODE: ReadonlyMap<string, number> = new Map(
  COUNTRIES.map((c) => [c.iso3, c.popularityIndex ?? POPULARITY_FALLBACK]),
);

export function countryPopularity(code: string): number {
  return POPULARITY_BY_CODE.get(code) ?? POPULARITY_FALLBACK;
}

/**
 * Notoriété moyenne des K solutions les plus connues d'une case.
 * Seul prédicteur validé du taux d'échec d'une case (r ≈ 0.46) : ce qui compte
 * est « à quel point les quelques meilleures portes de sortie sont connues »,
 * pas la notoriété globale du pool.
 */
export function topKPopularity(
  codes: ReadonlyArray<string>,
  k = POPULARITY_TOP_K,
): number {
  if (codes.length === 0) return POPULARITY_FALLBACK;
  const pops = codes.map(countryPopularity).sort((a, b) => b - a);
  const slice = pops.slice(0, Math.min(k, pops.length));
  return slice.reduce((sum, p) => sum + p, 0) / slice.length;
}

/** Notoriété d'une grille : moyenne des `topKPopularity` de ses cases. */
export function gridPopularity(
  validAnswers: Readonly<Record<string, ReadonlyArray<string>>>,
): number | null {
  const cells = Object.values(validAnswers);
  if (cells.length === 0) return null;
  const sum = cells.reduce((s, codes) => s + topKPopularity(codes), 0);
  return sum / cells.length;
}

/** Score d'affichage 0–100 (100 = solutions très connues = case facile). */
export function popularityScore100(pop: number): number {
  return Math.max(0, Math.min(100, Math.round(pop * 100)));
}

/** Facilité estimée d'une grille (0–100), ou null si pas de solutions. */
export function gridEaseScore100(
  validAnswers: Readonly<Record<string, ReadonlyArray<string>>>,
): number | null {
  const pop = gridPopularity(validAnswers);
  return pop === null ? null : popularityScore100(pop);
}
