import { expect, type Page } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { COUNTRY_CATALOG } from "../content/countries/catalog";
import { api } from "../convex/_generated/api";
import {
  CELL_KEYS,
  pickCountry as pickCountryCode,
  solveGrid as solveGridCore,
} from "../src/features/game/testing/simulation";

const NAME_BY_CODE: ReadonlyMap<string, string> = new Map(
  COUNTRY_CATALOG.map((country) => [country.iso3, country.names.en]),
);

function getCountryName(code: string): string {
  return NAME_BY_CODE.get(code) ?? code;
}

// Après un guess réussi, le Drawer (vaul) verrouille `pointer-events` sur le
// <body> le temps de son animation de fermeture et ne le relâche qu'un poil
// après le démontage de l'input. Cliquer la case suivante dans cette fenêtre
// fait avaler le clic (la modale ne se rouvre pas → cycle de 40 s perdu). On
// laisse l'animation se poser avant de rendre la main. Empirique, tunable.
const MODAL_SETTLE_MS = 500;

export type TodayGrid = {
  date: string;
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
};

/** Fetch today's grid via Convex HTTP client (requires VITE_CONVEX_URL in env). */
export async function fetchTodayGrid(): Promise<TodayGrid | null> {
  return convexClient().query(
    api.grids.getTodayGrid,
  ) as Promise<TodayGrid | null>;
}

function convexClient(): ConvexHttpClient {
  const convexUrl = process.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    throw new Error(
      "VITE_CONVEX_URL is required for E2E tests. Add it to .env.local or set it in your environment.",
    );
  }
  return new ConvexHttpClient(convexUrl);
}

export type ReplayableGrid = { date: string; rows: string[]; cols: string[] };

/** Archive du mode entraînement telle que le serveur la publie (J-1 → J-7). */
export async function fetchReplayableGrids(): Promise<ReplayableGrid[]> {
  return convexClient().query(api.grids.getReplayableGrids) as Promise<
    ReplayableGrid[]
  >;
}

export async function fetchReplayGrid(date: string): Promise<TodayGrid | null> {
  return convexClient().query(api.grids.getReplayGrid, {
    date,
  }) as Promise<TodayGrid | null>;
}

/** Appel direct du garde serveur, sans passer par l'UI. */
export function queryReplayGridRaw(date: string): Promise<unknown> {
  return convexClient().query(api.grids.getReplayGrid, { date });
}

/**
 * Partie du jour terminée, sérialisée pour injection dans localStorage : c'est
 * ce que lit le garde d'accès à l'archive. `endRecorded: true` évite toute
 * écriture Convex depuis cette partie fabriquée (les stats resteraient sinon
 * polluées par les runs E2E).
 */
export function makeFinishedDailyGameJSON(): string {
  return JSON.stringify({
    version: 3,
    date: new Date().toISOString().slice(0, 10),
    cells: Object.fromEntries(CELL_KEYS.map((k) => [k, { status: "empty" }])),
    remainingLives: 0,
    persistenceRevision: 1,
    endRecorded: true,
    rated: true,
  });
}

export { CELL_KEYS };

/** Cible la modale de résultat sans confondre le Drawer en fin de fermeture. */
export function getResultDialog(page: Page) {
  return page.getByRole("dialog").filter({
    has: page.getByRole("button", { name: "Share my score" }),
  });
}

export function solveGrid(
  validAnswers: Record<string, string[]>,
): Record<string, { code: string; name: string }> | null {
  const raw = solveGridCore(validAnswers);
  if (!raw) return null;
  const byCell: Record<string, { code: string; name: string }> = {};
  for (const [cellKey, { code }] of Object.entries(raw)) {
    byCell[cellKey] = { code, name: getCountryName(code) };
  }
  return byCell;
}

/** Pick the first unused valid country for a cell key (e.g. "0,1"). */
export function pickCountry(
  validAnswers: Record<string, string[]>,
  cellKey: string,
  usedCodes: Set<string>,
): { iso3: string; name: string } | null {
  const iso3 = pickCountryCode(validAnswers, cellKey, usedCodes);
  if (!iso3) return null;
  return { iso3, name: getCountryName(iso3) };
}

/**
 * Pick a country that is valid in some cell, but NOT valid for the target cell.
 * Used to trigger a "wrong answer" scenario.
 */
export function pickWrongCountry(
  validAnswers: Record<string, string[]>,
  targetCellKey: string,
): { iso3: string; name: string } | null {
  const targetValid = new Set(validAnswers[targetCellKey] ?? []);
  for (const [key, codes] of Object.entries(validAnswers)) {
    if (key === targetCellKey) continue;
    const wrong = codes.find((c) => !targetValid.has(c));
    if (wrong) return { iso3: wrong, name: getCountryName(wrong) };
  }
  return null;
}

/**
 * Prépare l'état client avant le chargement de la page (à appeler avant
 * `page.goto`) :
 * - force la locale EN pour des aria-labels prévisibles ;
 * - désactive le tutoriel « How to play », qui s'ouvre automatiquement au
 *   premier passage. Sa modale (Radix Dialog) rend tout l'arrière-plan inerte
 *   (`aria-hidden`) → les boutons de cellule sortent de l'arrière-plan
 *   d'accessibilité et `waitForGrid` échoue. On simule donc un joueur déjà revenu.
 */
export async function prepareSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("geodoku:locale", "en");
    localStorage.setItem("geodoku:how-to-play", "false");
  });
}

/** Wait until the game grid cells are visible (grid loaded from Convex). */
export async function waitForGrid(page: Page) {
  await page
    .getByRole("button", { name: /^Select cell row/i })
    .first()
    .waitFor({ state: "visible", timeout: 15_000 });
}

/**
 * Click an empty cell and select a country in the GuessModal.
 * The modal closes automatically after a successful (or game-over) submission.
 */
export async function fillCell(
  page: Page,
  row: 1 | 2 | 3,
  col: 1 | 2 | 3,
  countryName: string,
) {
  const cellButton = page.getByRole("button", {
    name: new RegExp(`^Select cell row ${row} column ${col}:`),
  });
  const input = page.getByPlaceholder("Search for a country…");

  await expect(async () => {
    if (!(await input.isVisible())) {
      await cellButton.click();
      await input.waitFor({ state: "visible", timeout: 2_000 });
    }
    await submitCountryInOpenModal(page, countryName);
    await input.waitFor({ state: "detached", timeout: 10_000 });
  }).toPass({ timeout: 40_000 });

  await page.waitForTimeout(MODAL_SETTLE_MS);
}

/**
 * In an already-open GuessModal, type a country name and submit the top match
 * via the keyboard (Enter).
 */
export async function submitCountryInOpenModal(
  page: Page,
  countryName: string,
) {
  const input = page.getByPlaceholder("Search for a country…");
  await input.waitFor({ state: "visible" });
  await input.fill(countryName);
  await expect(
    page.getByRole("option", { name: countryName }).first(),
  ).toHaveAttribute("aria-selected", "true", { timeout: 5_000 });
  await input.press("Enter");
}

/**
 * Drive the game to a loss: submit the same wrong country 5 times on cell (1,1)
 * until lives hit zero and the result screen appears.
 */
export async function playToDefeat(page: Page, grid: TodayGrid) {
  const wrong = pickWrongCountry(grid.validAnswers, "0,0");
  if (!wrong) throw new Error("Could not find a wrong country for this grid");
  await page
    .getByRole("button", { name: /^Select cell row 1 column 1:/ })
    .click();
  const input = page.getByPlaceholder("Search for a country…");
  for (let i = 0; i < 5; i++) {
    await submitCountryInOpenModal(page, wrong.name);
    if (i < 4) await input.waitFor({ state: "visible" });
  }
  await getResultDialog(page).waitFor({ state: "visible", timeout: 5_000 });
}

/**
 * Partie d'un jour passé, au format v3. Le payload minimal ne porte plus ni
 * statut ni horodatage : le statut se redérive des cases et des vies, et c'est
 * la garde de date qui écarte la partie, quel que soit son état.
 */
export function makeStaleGameJSON(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return JSON.stringify({
    version: 3,
    date: d.toISOString().slice(0, 10),
    cells: Object.fromEntries(
      ["0,0", "0,1", "0,2", "1,0", "1,1", "1,2", "2,0", "2,1", "2,2"].map(
        (k) => [k, { status: "empty" }],
      ),
    ),
    remainingLives: 5,
  });
}
