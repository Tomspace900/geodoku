import { expect, test } from "@playwright/test";
import {
  CELL_KEYS,
  fetchReplayableGrids,
  fetchReplayGrid,
  prepareSession,
  solveGrid,
  type TodayGrid,
  waitForGrid,
} from "./helpers";

const HISTORY_STORAGE_KEY = "geodoku:history-v1";

let past: TodayGrid;

test.beforeAll(async () => {
  const replayable = await fetchReplayableGrids();
  if (replayable.length === 0) {
    throw new Error("No past grid on the configured E2E backend.");
  }
  const grid = await fetchReplayGrid(replayable[0].date);
  if (!grid) throw new Error(`No grid content for ${replayable[0].date}.`);
  past = grid;
});

test.beforeEach(async ({ page }) => {
  await prepareSession(page);
});

test("l'icône à droite des cœurs ouvre « Mes stats »", async ({ page }) => {
  await page.goto("/en");
  await waitForGrid(page);
  await page.getByRole("link", { name: "My stats" }).click();
  await expect(page).toHaveURL(/\/en\/stats$/);
  await expect(page.getByRole("heading", { name: "My stats" })).toBeVisible();
});

test("sans partie, la page invite à jouer et à créer un compte", async ({
  page,
}) => {
  await page.goto("/en/stats");
  await expect(
    page.getByText("Your stats start with your first grid."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create an account", exact: true }),
  ).toBeVisible();
});

test("une partie finie du journal compte, avec son score recalculé", async ({
  page,
}) => {
  const solution = solveGrid(past.validAnswers);
  if (!solution) throw new Error(`No full solution for ${past.date}.`);
  const history = JSON.stringify({
    version: 1,
    entries: [
      {
        date: past.date,
        cells: CELL_KEYS.map((key) => solution[key].code),
        failed: CELL_KEYS.map(() => 0),
      },
    ],
  });
  await page.addInitScript(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    [HISTORY_STORAGE_KEY, history] as const,
  );
  await page.goto("/en/stats");
  const played = page.getByText("Games played").locator("..");
  await expect(played).toContainText("1");
  await expect(page.getByText("Complete grids").locator("..")).toContainText(
    "100%",
  );
});

test("la connexion s'ouvre en fenêtre, avec l'e-mail et Google", async ({
  page,
}) => {
  await page.goto("/en/stats");
  await page.getByRole("button", { name: "Create an account ›" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Continue with my email" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
});
