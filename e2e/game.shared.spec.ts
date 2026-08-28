import { expect, test } from "@playwright/test";
import {
  fetchTodayGrid,
  fillCell,
  getResultDialog,
  pickCountry,
  pickWrongCountry,
  playToDefeat,
  prepareSession,
  submitCountryInOpenModal,
  type TodayGrid,
  waitForGrid,
} from "./helpers";

// Core gameplay — runs on every project (desktop + mobile engines).
// Fetched once for all tests (the configured backend must expose today's grid).
let grid: TodayGrid;

test.beforeAll(async () => {
  const result = await fetchTodayGrid();
  if (!result)
    throw new Error("No grid for today on the configured E2E backend.");
  grid = result;
});

test.beforeEach(async ({ page }) => {
  await prepareSession(page);
  await page.goto("/");
  await waitForGrid(page);
});

// ── 1. Chargement ────────────────────────────────────────────────────────────

test("grid loads with 9 empty cells and 5 lives", async ({ page }) => {
  const gridElement = page.getByRole("table", {
    name: "Today's geography grid",
  });
  await expect(gridElement.getByRole("columnheader")).toHaveCount(3);
  await expect(gridElement.getByRole("rowheader")).toHaveCount(3);
  await expect(gridElement.getByRole("cell")).toHaveCount(9);

  const cells = page.getByRole("button", { name: /^Select cell row/i });
  await expect(cells).toHaveCount(9);
  await expect(cells.first()).toHaveAccessibleName(
    /^Select cell row 1 column 1: .+ × .+$/,
  );

  // The header renders 5 Heart icons, all "filled" on a fresh game.
  // Filled hearts carry the `fill-rarity-ultra` class (Header.tsx).
  const filledHearts = page.locator("header svg.fill-error");
  await expect(filledHearts).toHaveCount(5);
  await expect(
    page.getByRole("status").filter({ hasText: "5 lives remaining" }),
  ).toContainText("5 lives remaining");
});

// ── 2. Golden path — remplir une case ────────────────────────────────────────

test("selecting a valid country fills the cell", async ({ page }) => {
  const pick = pickCountry(grid.validAnswers, "0,0", new Set());
  if (!pick) throw new Error("Invariant violated: cell 0,0 has no answer");

  await fillCell(page, 1, 1, pick!.name);

  // The filled cell renders the country name as visible text.
  // (Avoid getByRole("generic", …): naming is prohibited on the generic role,
  // so the accessible-name match is unreliable across browsers.)
  await expect(page.getByText(pick!.name, { exact: true })).toBeVisible();
  await expect(page.locator("button[data-cell-key]:focus")).toHaveCount(0);
});

// ── 3. Unicité des pays ──────────────────────────────────────────────────

test("a country placed in one cell is marked used in another", async ({
  page,
}) => {
  const pick = pickCountry(grid.validAnswers, "0,0", new Set());
  if (!pick) throw new Error("Invariant violated: cell 0,0 has no answer");

  await fillCell(page, 1, 1, pick.name);

  // Une grille publiée possède un matching parfait : après un seul
  // placement, au moins une autre case reste remplissable. Le pays utilisé
  // doit y être signalé dans la recherche, qu'il valide ou non cette case.
  const nextCell = page
    .getByRole("button", { name: /^Select cell row/i })
    .first();
  await nextCell.click();

  const input = page.getByPlaceholder("Search for a country…");
  await input.waitFor({ state: "visible" });
  await input.fill(pick.name);

  const usedOption = page
    .getByRole("option")
    .filter({ hasText: pick.name })
    .filter({ hasText: "Already used" });
  await expect(usedOption).toHaveCount(1);
});

// ── 4. Mauvaise réponse → vie perdue ────────────────────────────────────────

test("wrong country triggers error and loses a life", async ({ page }) => {
  const wrong = pickWrongCountry(grid.validAnswers, "0,0");
  if (!wrong) throw new Error("Invariant violated: no wrong country exists");

  await page
    .getByRole("button", { name: /^Select cell row 1 column 1:/ })
    .click();
  await page
    .getByPlaceholder("Search for a country…")
    .waitFor({ state: "visible" });

  await submitCountryInOpenModal(page, wrong!.name);

  // La contrainte incorrecte utilise le token sémantique d'erreur et la perte
  // de vie est annoncée, en plus du retour visuel des cœurs.
  const failedConstraint = page.locator(".bg-error\\/10").first();
  await expect(failedConstraint).toBeVisible({ timeout: 3_000 });
  await expect(page.locator("header").getByRole("status")).toContainText(
    "4 lives remaining",
  );
});

// ── 5. Défaite — 5 mauvaises réponses ────────────────────────────────────────

test("five wrong answers trigger the defeat screen", async ({ page }) => {
  test.setTimeout(60_000);
  if (!pickWrongCountry(grid.validAnswers, "0,0")) {
    throw new Error("Invariant violated: no wrong country exists");
  }

  await playToDefeat(page, grid);

  const resultDialog = getResultDialog(page);
  // Le titre de fin est tiré au sort ; on identifie la défaite par la grille de
  // partage, qui comporte des cases non remplies (⬜).
  await expect(resultDialog).toContainText("⬜");
});
