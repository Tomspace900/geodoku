import { expect, test } from "@playwright/test";
import {
  CELL_KEYS,
  type TodayGrid,
  fetchTodayGrid,
  fillCell,
  findBlockingPlan,
  playToDefeat,
  prepareSession,
  solveGrid,
  waitForGrid,
} from "./helpers";

// Heavy, browser-agnostic completion flows. Routed (by filename) to the
// chromium-desktop project only — the result screen is already covered
// cross-browser by the defeat test in game.shared.spec.ts, and the full 9-cell
// fill is expensive on the throttled mobile profiles. Clipboard APIs are also
// Chromium-only under Playwright.
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
  await page.goto("/");
  await waitForGrid(page);
});

async function fillEntireGrid(page: import("@playwright/test").Page) {
  const solution = solveGrid(grid.validAnswers);
  if (!solution) {
    test.skip(
      true,
      "Grid has no perfect matching (unexpected — generator bug?)",
    );
    return;
  }
  for (const key of CELL_KEYS) {
    const [r, c] = key.split(",").map(Number) as [0 | 1 | 2, 0 | 1 | 2];
    await fillCell(
      page,
      (r + 1) as 1 | 2 | 3,
      (c + 1) as 1 | 2 | 3,
      solution[key].name,
    );
  }
}

// ── Victoire — remplir les 9 cases ───────────────────────────────────────────

test("filling all 9 cells triggers the victory screen", async ({ page }) => {
  test.setTimeout(120_000);
  await fillEntireGrid(page);

  const resultDialog = page.locator("dialog[open]");
  await expect(resultDialog).toBeVisible({ timeout: 5_000 });
  await expect(resultDialog).toContainText(/Magnificent|Grid score/i);
});

// ── Partage — copie dans le presse-papiers ───────────────────────────────────

test("share button copies the result to the clipboard", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  // A loss reaches the same ResultScreen (and share button) far more cheaply
  // than a full 9-cell win, and the share contract is identical. The win path
  // itself is covered by the victory test above.
  await playToDefeat(page, grid);

  const shareButton = page.getByRole("button", { name: "Share my result" });
  await shareButton.waitFor({ state: "visible", timeout: 5_000 });
  await shareButton.click();

  // On success the button relabels to "Copied! ✓" — re-query by the new name.
  await expect(page.getByRole("button", { name: /Copied/i })).toBeVisible({
    timeout: 3_000,
  });

  const clipboardText = await page.evaluate(() =>
    navigator.clipboard.readText(),
  );
  expect(clipboardText).toMatch(/Geodoku/);
  expect(clipboardText).toMatch(/[🟪🟦🟨🟥⬜⬛]/u);
});

// ── Case bloquée (⬛) — toutes les réponses valides épuisées ailleurs ─────────

test("a cell becomes blocked once its answers are used up elsewhere", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const plan = findBlockingPlan(grid.validAnswers);
  if (!plan) {
    test.skip(true, "No deterministically blockable cell in today's grid");
    return;
  }

  for (const f of plan.fills) {
    const [r, c] = f.cell.split(",").map(Number) as [0 | 1 | 2, 0 | 1 | 2];
    await fillCell(page, (r + 1) as 1 | 2 | 3, (c + 1) as 1 | 2 | 3, f.name);
  }

  // The target cell now has no available valid country → blocked (X icon).
  await expect(page.locator('[aria-label="Blocked cell"]').first()).toBeVisible(
    { timeout: 5_000 },
  );
  // Blocking happens through valid placements only — no life lost.
  await expect(page.locator("header svg.fill-rarity-ultra")).toHaveCount(5);
});

// ── Voir la solution — après défaite ─────────────────────────────────────────

test("viewing answers after a loss reveals the solution grid", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await playToDefeat(page, grid);

  // Dismiss the result modal via the "skip feedback" link.
  await page.getByRole("button", { name: "Skip and view answers" }).click();

  // The solution view replaces the modal: it lists the answers and offers a
  // "View my result" button to go back. (The "solution grid" title isn't
  // rendered as on-screen text, so assert on these stable signals instead.)
  await expect(
    page.getByRole("button", { name: "View my result" }),
  ).toBeVisible({ timeout: 5_000 });
  await expect(
    page.getByText("Share of today's players who picked that country."),
  ).toBeVisible();
});

// ── Note de difficulté — feedback ────────────────────────────────────────────

test("rating the difficulty acknowledges the feedback", async ({ page }) => {
  test.setTimeout(60_000);
  await playToDefeat(page, grid);

  await page.getByRole("button", { name: "Just right" }).click();

  // After rating, the feedback buttons give way to a "View answers" button.
  await expect(page.getByRole("button", { name: "View answers" })).toBeVisible({
    timeout: 5_000,
  });
});
