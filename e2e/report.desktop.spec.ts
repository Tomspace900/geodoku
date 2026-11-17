import { expect, test } from "@playwright/test";
import {
  fetchTodayGrid,
  playToDefeat,
  prepareSession,
  type TodayGrid,
  waitForGrid,
} from "./helpers";

// Signalement (#127). Chromium seul, et un seul envoi par passage : chaque
// signalement accepté écrit dans develop et compte dans le plafond global
// (50 par jour). Sans `ALERT_EMAIL_TO` sur develop, aucun e-mail ne part.
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

test("reporting a mistake from a solution cell drawer", async ({ page }) => {
  test.setTimeout(60_000);
  await playToDefeat(page, grid);
  await page.getByRole("button", { name: "View answers" }).click();

  await page.getByRole("button", { name: /^Row 1 column 1:/ }).click();
  await page.getByRole("button", { name: "Report a mistake" }).click();

  // Depuis une case, « Answer or constraint » est déjà choisi.
  await expect(
    page.getByRole("button", { name: "Answer or constraint" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("textbox", { name: "Your message" })
    .fill("E2E check: please ignore (#127).");
  await page.getByRole("button", { name: "Send", exact: true }).click();

  await expect(page.getByText("Thanks, noted!")).toBeVisible({
    timeout: 10_000,
  });
});

test("the footer report opens on « Bug or other »", async ({ page }) => {
  await page.getByRole("button", { name: "Report", exact: true }).click();

  await expect(
    page.getByRole("button", { name: "Bug or other" }),
  ).toHaveAttribute("aria-pressed", "true");
  // Sans case ni contrainte, l'onglet réponse renvoie vers la grille.
  await page.getByRole("button", { name: "Answer or constraint" }).click();
  await expect(
    page.getByText("You can report straight from the answer grid"),
  ).toBeVisible();
});
