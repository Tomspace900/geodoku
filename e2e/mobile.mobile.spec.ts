import { expect, test } from "@playwright/test";
import {
  fetchTodayGrid,
  pickCountry,
  prepareSession,
  type TodayGrid,
  waitForGrid,
} from "./helpers";

// Mobile-only tests — routed by filename (*.mobile.spec.ts) to the mobile
// projects (Pixel 7, iPhone 15, iPad Pro) via testMatch in playwright.config.

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

// Le bouton d'en-tête est en `absolute` pour couvrir toute la cellule : il ne
// dimensionne donc plus sa rangée, et c'est son jumeau invisible qui s'en
// charge (`ConstraintHeaderButton`). Sans lui, la rangée des en-têtes de
// colonne s'effondre ou se fige, et un libellé long déborde sur les cases —
// invisible pour les autres tests, dont aucun ne regarde la mise en page. Le
// libellé le plus long du catalogue est injecté : les grilles du jour sont trop
// courtes pour révéler le défaut.
test("a long constraint label stays inside its header cell", async ({
  page,
}) => {
  const spill = await page.evaluate(() => {
    const th = document.querySelector('th[scope="col"]') as HTMLElement;
    const label = th.querySelector("span") as HTMLElement;
    const button = th.querySelector("button") as HTMLElement;
    const longest = "Plus densément peuplé que les Pays-Bas (430 hab./km²)";
    label.textContent = longest;
    button.textContent = longest;
    const range = document.createRange();
    range.selectNodeContents(button);
    const text = range.getBoundingClientRect();
    const cell = th.getBoundingClientRect();
    return { top: cell.top - text.top, bottom: text.bottom - cell.bottom };
  });
  expect(spill.top).toBeLessThanOrEqual(1);
  expect(spill.bottom).toBeLessThanOrEqual(1);
});

// ── 2. Tap sur une case → le drawer s'ouvre par le bas ───────────────────────

test("tapping a cell opens the GuessModal drawer from the bottom", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: /^Select cell row 1 column 1:/ })
    .tap();

  // The search input should appear (drawer opened)
  const input = page.getByPlaceholder("Search for a country…");
  await expect(input).toBeVisible({ timeout: 3_000 });

  // The drawer element should be positioned at the bottom of the screen
  const drawerContent = page.locator("[data-swipe-direction]");
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
  if (!pick) throw new Error("Invariant violated: cell 0,0 has no answer");

  await page
    .getByRole("button", { name: /^Select cell row 1 column 1:/ })
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
    .getByRole("button", { name: /^Select cell row 1 column 1:/ })
    .tap();

  const input = page.getByPlaceholder("Search for a country…");
  await input.waitFor({ state: "visible" });

  const drawer = page.locator("[data-swipe-direction]").first();
  await drawer.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  // Un doigt qui glisse : Base UI suit le geste tactile par les événements
  // `touch*` (les `pointer*` tactiles restent au défilement), d'où des Touch
  // fabriqués dans la page, posés sur la poignée du tiroir.
  await drawer.evaluate(async (element) => {
    const box = element.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const startY = box.top + 20;
    const target = element.firstElementChild ?? element;
    const touchAt = (y: number) =>
      new Touch({ identifier: 1, target, clientX: x, clientY: y });
    const fire = (type: string, y: number, ended = false) => {
      const touch = touchAt(y);
      target.dispatchEvent(
        new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches: ended ? [] : [touch],
          targetTouches: ended ? [] : [touch],
          changedTouches: [touch],
        }),
      );
    };
    const frame = () =>
      new Promise((resolve) => requestAnimationFrame(resolve));
    fire("touchstart", startY);
    for (const offset of [20, 80, 160, 260, 380]) {
      await frame();
      fire("touchmove", startY + offset);
    }
    await frame();
    fire("touchend", startY + 380, true);
  });

  await expect(input).toBeHidden({ timeout: 3_000 });
  // Grid should still be visible after dismiss
  const cells = page.getByRole("button", { name: /^Select cell row/i });
  await expect(cells.first()).toBeVisible();
});
