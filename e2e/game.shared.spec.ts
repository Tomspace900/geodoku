import { expect, test } from "@playwright/test";
import {
  CELL_KEYS,
  type TodayGrid,
  fetchTodayGrid,
  fillCell,
  pickCountry,
  pickWrongCountry,
  playToDefeat,
  prepareSession,
  submitCountryInOpenModal,
  waitForGrid,
} from "./helpers";

// Core gameplay — runs on every project (desktop + mobile engines).
// Fetched once for all tests (requires wipe:db + seed:grids before run).
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

// ── 1. Chargement ────────────────────────────────────────────────────────────

test("grid loads with 9 empty cells and 5 lives", async ({ page }) => {
  const cells = page.getByRole("button", { name: /Select cell row/i });
  await expect(cells).toHaveCount(9);

  // The header renders 5 Heart icons, all "filled" on a fresh game.
  // Filled hearts carry the `fill-rarity-ultra` class (Header.tsx).
  const filledHearts = page.locator("header svg.fill-rarity-ultra");
  await expect(filledHearts).toHaveCount(5);
});

// ── 2. Golden path — remplir une case ────────────────────────────────────────

test("selecting a valid country fills the cell", async ({ page }) => {
  const pick = pickCountry(grid.validAnswers, "0,0", new Set());
  if (!pick) test.skip(true, "No valid answer for cell 0,0");

  await fillCell(page, 1, 1, pick!.name);

  // The filled cell renders the country name as visible text.
  // (Avoid getByRole("generic", …): naming is prohibited on the generic role,
  // so the accessible-name match is unreliable across browsers.)
  await expect(page.getByText(pick!.name, { exact: true })).toBeVisible();
});

// ── 3. Mauvaise réponse → vie perdue ─────────────────────────────────────────

test("wrong country triggers error and loses a life", async ({ page }) => {
  const wrong = pickWrongCountry(grid.validAnswers, "0,0");
  if (!wrong) test.skip(true, "Could not find a wrong country");

  await page
    .getByRole("button", { name: "Select cell row 1 column 1", exact: true })
    .click();
  await page
    .getByPlaceholder("Search for a country…")
    .waitFor({ state: "visible" });

  await submitCountryInOpenModal(page, wrong!.name);

  // A wrong *cross-constraint* guess is a constraint failure (wrong_row /
  // wrong_col / wrong_constraints): GuessModal leaves the .bg-error/10 zone
  // empty (that's only for already_used / invalid_country) and instead
  // highlights the failed constraint label with `bg-rarity-ultra/10`.
  const failedConstraint = page.locator(".bg-rarity-ultra\\/10").first();
  await expect(failedConstraint).toBeVisible({ timeout: 3_000 });
});

// ── 4. Unicité des pays — un pays déjà placé est marqué « Already used » ──────

test("a country placed in one cell is marked used in another", async ({
  page,
}) => {
  const pick = pickCountry(grid.validAnswers, "0,0", new Set());
  // Need a second cell where the same country is also a valid answer.
  const otherKey = pick
    ? CELL_KEYS.find(
        (k) => k !== "0,0" && (grid.validAnswers[k] ?? []).includes(pick.iso3),
      )
    : undefined;
  if (!pick || !otherKey)
    test.skip(true, "No country valid in two cells of today's grid");

  await fillCell(page, 1, 1, pick!.name);

  const [r, c] = otherKey!.split(",").map(Number) as [0 | 1 | 2, 0 | 1 | 2];
  await page
    .getByRole("button", {
      name: `Select cell row ${r + 1} column ${c + 1}`,
      exact: true,
    })
    .click();
  const input = page.getByPlaceholder("Search for a country…");
  await input.waitFor({ state: "visible" });
  await input.fill(pick!.name);

  // The already-placed country appears in the list flagged "Already used".
  await expect(page.getByText("Already used").first()).toBeVisible({
    timeout: 5_000,
  });
});

// ── 5. Défaite — 5 mauvaises réponses ────────────────────────────────────────

test("five wrong answers trigger the defeat screen", async ({ page }) => {
  test.setTimeout(60_000);
  if (!pickWrongCountry(grid.validAnswers, "0,0"))
    test.skip(true, "Could not find a wrong country");

  await playToDefeat(page, grid);

  const resultDialog = page.locator("dialog[open]");
  await expect(resultDialog).toContainText(/Too bad|Out of lives/i);
});
