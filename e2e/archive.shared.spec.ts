import { expect, test } from "@playwright/test";
import {
  fetchReplayableGrids,
  fetchReplayGrid,
  fillCell,
  makeFinishedDailyGameJSON,
  pickWrongCountry,
  prepareSession,
  queryReplayGridRaw,
  type ReplayableGrid,
  solveGrid,
  submitCountryInOpenModal,
  type TodayGrid,
  waitForGrid,
} from "./helpers";

const DAILY_STORAGE_KEY = "geodoku:game-v3";
const TRAINING_STORAGE_KEY = "geodoku:training-v1";

let replayable: ReplayableGrid[];
let target: TodayGrid;

function tomorrowIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

test.beforeAll(async () => {
  replayable = await fetchReplayableGrids();
  if (replayable.length === 0) {
    throw new Error("No replayable grid on the configured E2E backend.");
  }
  const grid = await fetchReplayGrid(replayable[0].date);
  if (!grid) throw new Error(`No grid content for ${replayable[0].date}.`);
  target = grid;
});

test.beforeEach(async ({ page }) => {
  await prepareSession(page);
});

/** Ouvre le garde : l'archive n'est accessible qu'une fois la partie du jour finie. */
async function seedFinishedDaily(page: import("@playwright/test").Page) {
  const daily = makeFinishedDailyGameJSON();
  await page.addInitScript(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    [DAILY_STORAGE_KEY, daily] as const,
  );
}

// ── 1. Garde d'accès ──────────────────────────────────────────────────────────

test("redirects the archive to today's grid while the daily game is unfinished", async ({
  page,
}) => {
  await page.goto("/archive");
  await expect(page).toHaveURL(/\/$/);
  await waitForGrid(page);
});

test("redirects a training grid to today's grid while the daily game is unfinished", async ({
  page,
}) => {
  await page.goto(`/archive/${replayable[0].date}`);
  await expect(page).toHaveURL(/\/$/);
});

// ── 2. Liste de l'archive ─────────────────────────────────────────────────────

test("lists the replayable grids once the daily game is over", async ({
  page,
}) => {
  await seedFinishedDaily(page);
  await page.goto("/archive");

  await expect(page.locator('a[href^="/archive/"]')).toHaveCount(
    replayable.length,
  );
  await expect(
    page.locator(`a[href="/archive/${replayable[0].date}"]`),
  ).toBeVisible();
});

// ── 3. Partie d'entraînement ──────────────────────────────────────────────────

test("plays a past grid without lives and resumes it after a reload", async ({
  page,
}) => {
  await seedFinishedDaily(page);
  const solution = solveGrid(target.validAnswers);
  if (!solution) throw new Error("Invariant violated: grid is not solvable");

  await page.goto(`/archive/${target.date}`);
  await waitForGrid(page);

  // Pas de vies en entraînement : un compteur d'essais, pas des cœurs.
  await expect(page.getByText("0 attempts")).toBeAttached();

  await fillCell(page, 1, 1, solution["0,0"].name);
  await expect(page.getByText(solution["0,0"].name).first()).toBeVisible();

  // La partie reprend après un reload…
  await page.reload();
  await waitForGrid(page);
  await expect(page.getByText(solution["0,0"].name).first()).toBeVisible();

  // …et l'entraînement n'écrit rien dans la partie du jour.
  const dailyAfter = await page.evaluate(
    (key) => localStorage.getItem(key),
    DAILY_STORAGE_KEY,
  );
  expect(dailyAfter).toBe(makeFinishedDailyGameJSON());

  const training = await page.evaluate(
    (key) => localStorage.getItem(key),
    TRAINING_STORAGE_KEY,
  );
  expect(training).toContain(solution["0,0"].code);
});

test("counts a wrong guess as an attempt without ending the game", async ({
  page,
}) => {
  await seedFinishedDaily(page);
  const wrong = pickWrongCountry(target.validAnswers, "0,0");
  if (!wrong) throw new Error("Could not find a wrong country for this grid");

  await page.goto(`/archive/${target.date}`);
  await waitForGrid(page);

  // Six erreurs : une de plus que les 5 vies du mode quotidien. La grille doit
  // rester jouable — c'est la règle centrale du mode entraînement.
  await page
    .getByRole("button", { name: /^Select cell row 1 column 1:/ })
    .click();
  const input = page.getByPlaceholder("Search for a country…");
  for (let i = 0; i < 6; i++) {
    await input.waitFor({ state: "visible" });
    await submitCountryInOpenModal(page, wrong.name);
    await page.waitForTimeout(200);
  }

  await page.keyboard.press("Escape");
  await waitForGrid(page);
  await expect(page.getByText("6 attempts")).toBeAttached();

  const training = await page.evaluate(
    (key) => localStorage.getItem(key),
    TRAINING_STORAGE_KEY,
  );
  expect(training).toContain('"failedAttempts":6');
});

// ── 4. Dates futures ──────────────────────────────────────────────────────────

test("shows the time-traveller screen for a future date", async ({ page }) => {
  await seedFinishedDaily(page);
  await page.goto(`/archive/${tomorrowIso()}`);

  await expect(page.getByRole("alert")).toContainText("Nice try");
  await expect(
    page.getByRole("button", { name: /^Select cell row/i }),
  ).toHaveCount(0);
});

// Le garde front évite l'aller-retour ; celui-ci est la garantie réelle, puisque
// l'endpoint est public. Sans lui, la grille de demain fuiterait avec ses réponses.
test("the backend refuses a future date, today, and a date out of the window", async () => {
  const outOfWindow = new Date();
  outOfWindow.setUTCDate(outOfWindow.getUTCDate() - 8);

  await expect(queryReplayGridRaw(tomorrowIso())).rejects.toThrow();
  await expect(
    queryReplayGridRaw(new Date().toISOString().slice(0, 10)),
  ).rejects.toThrow();
  await expect(
    queryReplayGridRaw(outOfWindow.toISOString().slice(0, 10)),
  ).rejects.toThrow();
});
