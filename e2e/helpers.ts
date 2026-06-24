import { createRequire } from "node:module";
import { type Page, expect } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const require = createRequire(import.meta.url);

type CountryRecord = { iso3: string; names: { en: string; fr: string } };
const countries =
  require("../src/features/countries/data/countries.json") as CountryRecord[];

function getCountryName(code: string): string {
  return countries.find((c) => c.iso3 === code)?.names.en ?? code;
}

export type TodayGrid = {
  date: string;
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
};

/** Fetch today's grid via Convex HTTP client (requires VITE_CONVEX_URL in env). */
export async function fetchTodayGrid(): Promise<TodayGrid | null> {
  const convexUrl = process.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    throw new Error(
      "VITE_CONVEX_URL is required for E2E tests. Add it to .env.local or set it in your environment.",
    );
  }
  const client = new ConvexHttpClient(convexUrl);
  return client.query(api.grids.getTodayGrid) as Promise<TodayGrid | null>;
}

/** Les 9 clés de cellule dans l'ordre ligne-major. */
export const CELL_KEYS = [
  "0,0",
  "0,1",
  "0,2",
  "1,0",
  "1,1",
  "1,2",
  "2,0",
  "2,1",
  "2,2",
] as const;

/**
 * Résout la grille en assignant un pays distinct à chacune des 9 cases via
 * matching biparti (algorithme de Kuhn). Le générateur garantit l'existence
 * d'un matching parfait, mais un remplissage glouton « premier valide » peut
 * impasser sur une grille pourtant résoluble (un pays pris ici prive une autre
 * case de sa seule sortie). On matche donc proprement pour rendre les tests de
 * victoire/partage déterministes au lieu de les faire `test.skip` à mi-grille.
 * Retourne `{ "row,col": { code, name } }` ou `null` si aucun matching parfait.
 */
export function solveGrid(
  validAnswers: Record<string, string[]>,
): Record<string, { code: string; name: string }> | null {
  // matchCountry : code pays -> clé de cellule à laquelle il est assigné
  const matchCountry: Record<string, string> = {};

  function assign(cellKey: string, seen: Set<string>): boolean {
    for (const code of validAnswers[cellKey] ?? []) {
      if (seen.has(code)) continue;
      seen.add(code);
      const heldBy = matchCountry[code];
      if (heldBy === undefined || assign(heldBy, seen)) {
        matchCountry[code] = cellKey;
        return true;
      }
    }
    return false;
  }

  for (const cellKey of CELL_KEYS) {
    if (!assign(cellKey, new Set())) return null;
  }

  // Inverse le matching : cellule -> pays.
  const byCell: Record<string, { code: string; name: string }> = {};
  for (const [code, cellKey] of Object.entries(matchCountry)) {
    byCell[cellKey] = { code, name: getCountryName(code) };
  }
  if (Object.keys(byCell).length !== CELL_KEYS.length) return null;
  return byCell;
}

/** Pick the first unused valid country for a cell key (e.g. "0,1"). */
export function pickCountry(
  validAnswers: Record<string, string[]>,
  cellKey: string,
  usedCodes: Set<string>,
): { iso3: string; name: string } | null {
  const iso3 = (validAnswers[cellKey] ?? []).find((c) => !usedCodes.has(c));
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
 *   (`aria-hidden`) → les boutons de cellule sortent de l'arbre d'accessibilité
 *   et `waitForGrid` échoue. On simule donc un joueur déjà revenu.
 */
export async function prepareSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("geodoku.locale", "en");
    localStorage.setItem("geodoku.showHowToPlay", "false");
  });
}

/** Wait until the game grid cells are visible (grid loaded from Convex). */
export async function waitForGrid(page: Page) {
  await page
    .getByRole("button", { name: /Select cell row/i })
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
    name: `Select cell row ${row} column ${col}`,
    exact: true,
  });
  const input = page.getByPlaceholder("Search for a country…");

  // Open → search → submit as one retryable unit. Against the shared Convex dev
  // grid the suite runs `fullyParallel` (4 workers submitting identical guesses)
  // and the reactive re-render churn can either swallow the cell click (modal
  // never opens) or briefly unmount a freshly-opened modal before we can type.
  // Retrying the whole interaction until the guess lands (the input detaches as
  // the modal closes on success) makes the multi-cell fills robust. No
  // double-submit risk: a successful guess detaches the input and turns the cell
  // into a filled div, so the next poll neither re-clicks nor re-submits.
  await expect(async () => {
    if (!(await input.isVisible())) {
      await cellButton.click();
      await input.waitFor({ state: "visible", timeout: 2_000 });
    }
    await submitCountryInOpenModal(page, countryName);
    // Success closes the modal, but only after the awaited Convex `submit`
    // round-trip resolves (then unmount ~300ms later). Allow for dev-cloud
    // latency so a slow-but-successful guess isn't prematurely retried.
    await input.waitFor({ state: "detached", timeout: 10_000 });
  }).toPass({ timeout: 40_000 });
}

/**
 * In an already-open GuessModal, type a country name and submit the top match
 * via the keyboard (Enter). We avoid clicking the result row: cmdk re-renders
 * its list on every keystroke and a click can race the re-render ("element is
 * not stable / detached from the DOM"). cmdk auto-highlights the best match —
 * and an exact full-name query ranks the intended country first (match-sorter
 * EQUAL ≻ STARTS_WITH) — so Enter is deterministic and stable. The modal stays
 * open on a wrong guess (used by the wrong-answer and defeat flows).
 */
export async function submitCountryInOpenModal(
  page: Page,
  countryName: string,
) {
  const input = page.getByPlaceholder("Search for a country…");
  await input.waitFor({ state: "visible" });
  await input.fill(countryName);
  await page
    .getByRole("option")
    .first()
    .waitFor({ state: "visible", timeout: 5_000 });
  await input.press("Enter");
}

/**
 * Drive the game to a loss: submit the same wrong country 5 times on cell (1,1)
 * until lives hit zero and the result screen appears. Returns once the result
 * <dialog> is visible. Throws if no wrong country can be found for the grid.
 */
export async function playToDefeat(page: Page, grid: TodayGrid) {
  const wrong = pickWrongCountry(grid.validAnswers, "0,0");
  if (!wrong) throw new Error("Could not find a wrong country for this grid");
  await page
    .getByRole("button", { name: "Select cell row 1 column 1", exact: true })
    .click();
  const input = page.getByPlaceholder("Search for a country…");
  for (let i = 0; i < 5; i++) {
    await submitCountryInOpenModal(page, wrong.name);
    if (i < 4) await input.waitFor({ state: "visible" });
  }
  await page
    .locator("dialog[open]")
    .waitFor({ state: "visible", timeout: 5_000 });
}

/**
 * Build a plan that makes one cell "blocked": pick the cell with the fewest
 * valid answers, then park each of its valid countries in a DISTINCT other cell
 * where that country is also valid (bipartite matching country → other cell).
 * Once every one of the target cell's countries is used up elsewhere, blocked
 * detection marks it blocked. Returns `{ blockedCell, fills }` (fills in the
 * other cells), or `null` if no cell can be deterministically blocked.
 */
export function findBlockingPlan(validAnswers: Record<string, string[]>): {
  blockedCell: string;
  fills: Array<{ cell: string; code: string; name: string }>;
} | null {
  const cellsBySize = [...CELL_KEYS].sort(
    (a, b) => (validAnswers[a]?.length ?? 0) - (validAnswers[b]?.length ?? 0),
  );

  for (const target of cellsBySize) {
    const need = validAnswers[target] ?? [];
    // Need one distinct parking cell per country; at most 8 cells available.
    if (need.length === 0 || need.length > CELL_KEYS.length - 1) continue;

    // Match each of target's countries to a distinct other cell (Kuhn).
    const cellByCountry: Record<string, string> = {};
    const assign = (country: string, seen: Set<string>): boolean => {
      for (const cell of CELL_KEYS) {
        if (cell === target || seen.has(cell)) continue;
        if (!(validAnswers[cell] ?? []).includes(country)) continue;
        seen.add(cell);
        const occupant = Object.keys(cellByCountry).find(
          (c) => cellByCountry[c] === cell,
        );
        if (occupant === undefined || assign(occupant, seen)) {
          cellByCountry[country] = cell;
          return true;
        }
      }
      return false;
    };

    if (need.every((c) => assign(c, new Set()))) {
      return {
        blockedCell: target,
        fills: Object.entries(cellByCountry).map(([code, cell]) => ({
          cell,
          code,
          name: getCountryName(code),
        })),
      };
    }
  }
  return null;
}

/**
 * Build a serialized PersistedGame for localStorage injection.
 * Used to test stale / corrupted session edge cases.
 */
export function makeStaleGameJSON(
  daysAgo: number,
  status: "playing" | "won" = "playing",
): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  const date = d.toISOString().slice(0, 10); // YYYY-MM-DD
  const startedAt = Date.now() - daysAgo * 86_400_000;
  return JSON.stringify({
    version: 1,
    date,
    cells: Object.fromEntries(
      ["0,0", "0,1", "0,2", "1,0", "1,1", "1,2", "2,0", "2,1", "2,2"].map(
        (k) => [k, { status: "empty" }],
      ),
    ),
    remainingLives: 5,
    usedCountries: [],
    status,
    startedAt,
    finishedAt: status === "won" ? startedAt + 60_000 : null,
  });
}
