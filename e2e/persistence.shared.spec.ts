import { expect, test } from "@playwright/test";
import {
  type TodayGrid,
  fetchTodayGrid,
  fillCell,
  makeStaleGameJSON,
  pickCountry,
  prepareSession,
  waitForGrid,
} from "./helpers";

const STORAGE_KEY = "geodoku.currentGame";

let grid: TodayGrid;

test.beforeAll(async () => {
  const result = await fetchTodayGrid();
  if (!result)
    throw new Error(
      "No grid for today — run `pnpm wipe:db && pnpm seed:grids` first.",
    );
  grid = result;
});

test.beforeEach(async ({ page }) => {
  await prepareSession(page);
});

// ── 1. Reprise normale ────────────────────────────────────────────────────────

test("resumes an in-progress game after page reload", async ({ page }) => {
  await page.goto("/");
  await waitForGrid(page);

  // Fill 2 cells
  const usedCodes = new Set<string>();
  const picks = (["0,0", "0,1"] as const).map((key) => {
    const p = pickCountry(grid.validAnswers, key, usedCodes);
    if (p) usedCodes.add(p.iso3);
    return p;
  });

  if (picks.some((p) => !p))
    test.skip(true, "Not enough valid answers to fill 2 cells");

  await fillCell(page, 1, 1, picks[0]!.name);
  await fillCell(page, 1, 2, picks[1]!.name);

  // Reload and verify the cells are still filled
  await page.reload();
  await waitForGrid(page);

  // Filled cells render the country name as visible text (the generic role
  // doesn't reliably expose an accessible name, so match the text instead).
  await expect(page.getByText(picks[0]!.name, { exact: true })).toBeVisible();
  await expect(page.getByText(picks[1]!.name, { exact: true })).toBeVisible();

  // Lives should be unchanged (no wrong answers)
  const emptyCells = page.getByRole("button", { name: /Select cell row/i });
  await expect(emptyCells).toHaveCount(7);
});

// ── 2. localStorage corrompu → partie fraîche ────────────────────────────────

test("corrupted localStorage JSON starts a fresh game without crashing", async ({
  page,
}) => {
  // Inject malformed JSON before page load
  await page.addInitScript(
    ({ key }) => {
      localStorage.setItem(key, "this is { not valid ] json at all");
    },
    { key: STORAGE_KEY },
  );

  await page.goto("/");
  await waitForGrid(page);

  // App should show 9 empty cells (no crash, no stale data)
  const cells = page.getByRole("button", { name: /Select cell row/i });
  await expect(cells).toHaveCount(9);
});

// ── 3. Session périmée (3 jours) → partie fraîche ────────────────────────────

test("stale game from 3 days ago is discarded and a fresh game starts", async ({
  page,
}) => {
  const staleJson = makeStaleGameJSON(3, "playing");

  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, value: staleJson },
  );

  await page.goto("/");
  await waitForGrid(page);

  // All 9 cells should be empty (stale game ignored)
  const cells = page.getByRole("button", { name: /Select cell row/i });
  await expect(cells).toHaveCount(9);

  // localStorage should have been cleared or replaced with today's game
  const stored = await page.evaluate((key: string) => {
    return localStorage.getItem(key);
  }, STORAGE_KEY);
  if (stored !== null) {
    const parsed = JSON.parse(stored) as { date: string };
    const today = new Date().toISOString().slice(0, 10);
    expect(parsed.date).toBe(today);
  }
});

// ── 4. Partie gagnée hier → partie fraîche aujourd'hui ───────────────────────

test("won game from yesterday does not show old result screen", async ({
  page,
}) => {
  const wonYesterday = makeStaleGameJSON(1, "won");

  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, value: wonYesterday },
  );

  await page.goto("/");
  await waitForGrid(page);

  // Should NOT show the result dialog from yesterday's game
  const resultDialog = page.locator("dialog[open]");
  await expect(resultDialog).toBeHidden();

  // 9 fresh empty cells visible
  const cells = page.getByRole("button", { name: /Select cell row/i });
  await expect(cells).toHaveCount(9);
});
