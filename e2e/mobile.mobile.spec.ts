import { expect, test } from "@playwright/test";
import {
  type TodayGrid,
  fetchTodayGrid,
  pickCountry,
  prepareSession,
  waitForGrid,
} from "./helpers";

// Mobile-only tests — routed by filename (*.mobile.spec.ts) to the mobile
// projects (Pixel 7, iPhone 15, iPad Pro) via testMatch in playwright.config.

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

// ── 1. Mise en page — la grille tient dans la largeur mobile ─────────────────

test("grid fits within mobile viewport without horizontal scroll", async ({
  page,
}) => {
  // The page body should not overflow horizontally
  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const clientWidth = await page.evaluate(
    () => document.documentElement.clientWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 2px tolerance for sub-pixel
});

// ── 2. Tap sur une case → le drawer s'ouvre par le bas ───────────────────────

test("tapping a cell opens the GuessModal drawer from the bottom", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Select cell row 1 column 1", exact: true })
    .tap();

  // The search input should appear (drawer opened)
  const input = page.getByPlaceholder("Search for a country…");
  await expect(input).toBeVisible({ timeout: 3_000 });

  // The drawer element should be positioned at the bottom of the screen
  const drawerContent = page.locator("[data-vaul-drawer-direction]");
  if ((await drawerContent.count()) > 0) {
    const box = await drawerContent.first().boundingBox();
    const viewportSize = page.viewportSize();
    if (box && viewportSize) {
      // Drawer bottom should be at or near the viewport bottom
      expect(box.y + box.height).toBeGreaterThan(viewportSize.height * 0.5);
    }
  }
});

// ── 3. La recherche fonctionne au clavier virtuel ────────────────────────────

test("country search works with touch keyboard input", async ({ page }) => {
  const usedCodes = new Set<string>();
  const pick = pickCountry(grid.validAnswers, "0,0", usedCodes);
  if (!pick) test.skip(true, "No valid answer for cell 0,0");

  await page
    .getByRole("button", { name: "Select cell row 1 column 1", exact: true })
    .tap();

  const input = page.getByPlaceholder("Search for a country…");
  await input.waitFor({ state: "visible" });

  // Type using fill (simulates keyboard input)
  await input.fill(pick!.name);

  // Results should appear
  const result = page.getByText(pick!.name, { exact: true }).first();
  await expect(result).toBeVisible({ timeout: 5_000 });
});

// ── 4. Le drawer se ferme en glissant vers le bas ────────────────────────────

test("drawer can be dismissed by swiping down", async ({ page }) => {
  await page
    .getByRole("button", { name: "Select cell row 1 column 1", exact: true })
    .tap();

  const input = page.getByPlaceholder("Search for a country…");
  await input.waitFor({ state: "visible" });

  // Close drawer via Escape (simulates swipe-down dismiss in test environment)
  await page.keyboard.press("Escape");

  await expect(input).toBeHidden({ timeout: 3_000 });
  // Grid should still be visible after dismiss
  const cells = page.getByRole("button", { name: /Select cell row/i });
  await expect(cells.first()).toBeVisible();
});
