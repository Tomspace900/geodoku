import { expect, test } from "@playwright/test";
import {
  CELL_KEYS,
  fetchTodayGrid,
  fillCell,
  getResultDialog,
  playToDefeat,
  prepareSession,
  solveGrid,
  type TodayGrid,
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
    throw new Error("No grid for today on the configured E2E backend.");
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
    throw new Error("Invariant violated: published grid is not solvable");
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

  const resultDialog = getResultDialog(page);
  await expect(resultDialog).toBeVisible({ timeout: 5_000 });
  // Le titre de fin est désormais tiré au sort ; on identifie la victoire par la
  // grille de partage — 9 cases remplies, donc aucune case vide (⬜) ni bloquée (⬛).
  await expect(resultDialog).not.toContainText(/[⬜⬛]/);

  // Le score de fin s'affiche (héros ScoreDisplay « <total> pts »). La
  // distribution est abonnée dès le chargement de la grille, donc le total est
  // chiffré au moment du résultat (pas « … »).
  await expect(resultDialog).toContainText(/\d+\s*pts/, { timeout: 5_000 });
});

// ── Score de fin — révélation animée (compteur) ──────────────────────────────

test("the end score counts up to the final total", async ({ page }) => {
  test.setTimeout(120_000);
  await fillEntireGrid(page);

  const resultDialog = getResultDialog(page);
  await expect(resultDialog).toBeVisible({ timeout: 5_000 });

  // Le total final est porté (stable) par l'aria-label du SVG dès que la rareté
  // est résolue ; le nombre visible, lui, grimpe depuis 0 (cf. useScoreAnimation).
  const scoreImg = resultDialog.getByRole("img", { name: /\d+\s*pts/ });
  await expect(scoreImg).toBeVisible({ timeout: 5_000 });
  const finalTotal = Number(
    (await scoreImg.getAttribute("aria-label"))?.match(/\d+/)?.[0],
  );
  expect(finalTotal).toBeGreaterThan(0);

  // Le compteur visible (seul élément en chiffres tabulaires) est encore en
  // cours de montée — sous le total — puis converge exactement dessus.
  const counter = resultDialog.locator("span.tabular-nums");
  expect(Number(await counter.textContent())).toBeLessThan(finalTotal);
  await expect(counter).toHaveText(String(finalTotal), { timeout: 10_000 });
});

// ── Partage — presse-papiers sur desktop, même si navigator.share existe ──────

test("share button copies to clipboard on desktop even when navigator.share exists", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  // Desktop Chrome/Safari exposent navigator.share, mais sur un appareil non
  // tactile on garde volontairement le presse-papiers (la feuille système est
  // déroutante sur desktop). On injecte un faux navigator.share et on vérifie
  // qu'il n'est JAMAIS appelé : le gating `canUseNativeShare` doit le court-
  // circuiter sur Desktop Chrome (pointeur fin, maxTouchPoints 0). Sans le stub,
  // le test passerait « par accident » — Playwright n'expose pas navigator.share.
  await page.addInitScript(() => {
    (window as unknown as { __shareCalled: boolean }).__shareCalled = false;
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: () => {
        (window as unknown as { __shareCalled: boolean }).__shareCalled = true;
        return Promise.resolve();
      },
    });
  });
  await page.reload();
  await waitForGrid(page);

  // A loss reaches the same ResultScreen (and share button) far more cheaply
  // than a full 9-cell win, and the share contract is identical. The win path
  // itself is covered by the victory test above.
  await playToDefeat(page, grid);

  const shareButton = page.getByRole("button", { name: "Share my score" });
  await shareButton.waitFor({ state: "visible", timeout: 5_000 });
  await shareButton.click();

  // On success the button relabels to "Copied! ✓" — re-query by the new name.
  // (Native share would have shown "Shared! ✓" and left the clipboard empty.)
  await expect(page.getByRole("button", { name: /Copied/i })).toBeVisible({
    timeout: 3_000,
  });

  const shareCalled = await page.evaluate(
    () =>
      (window as unknown as { __shareCalled?: boolean }).__shareCalled === true,
  );
  expect(shareCalled).toBe(false);

  const clipboardText = await page.evaluate(() =>
    navigator.clipboard.readText(),
  );
  expect(clipboardText).toMatch(/Geodoku/);
  expect(clipboardText).toMatch(/[🟪🟦🟨🟥⬜⬛]/u);
  // La ligne de score est au format international « <total> pts ».
  expect(clipboardText).toMatch(/\d+\s*pts/);
});

// ── Score — explication (popup Info + légende de rareté) ─────────────────────

test("the score info dialog explains the score with the rarity legend", async ({
  page,
}) => {
  test.setTimeout(60_000);
  // Une défaite atteint le même écran de résultat (et le ScoreDisplay) bien plus
  // vite qu'une victoire à 9 cases ; l'icône Info y est identique.
  await playToDefeat(page, grid);

  // L'icône Info à côté du score ouvre l'explication (ScoreInfoDialog). Son
  // aria-label est le titre de la popup — on cible le bouton par son rôle.
  await page.getByRole("button", { name: "How the score works" }).click();

  // La popup (portalisée au-dessus de la modale de résultat) affiche la légende
  // de rareté « en points » (RarityLegend, variante points), absente du reste de
  // l'écran de résultat — on cible un seuil de points propre à cette légende.
  await expect(page.getByText(/35-49\s*pts/)).toBeVisible({
    timeout: 5_000,
  });
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
  // "View my score" button to go back. (The "solution grid" title isn't
  // rendered as on-screen text, so assert on these stable signals instead.)
  const viewResultButton = page.getByRole("button", { name: "View my score" });
  await expect(viewResultButton).toBeVisible({ timeout: 5_000 });
  await expect(viewResultButton).toBeFocused();
  await expect(viewResultButton).toHaveAttribute("data-silent-focus", "true");

  await viewResultButton.click();
  const resultDialog = getResultDialog(page);
  await expect(resultDialog).toBeVisible();
  await expect(resultDialog).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(resultDialog).toBeHidden();
  await expect(viewResultButton).toBeFocused();
  await expect(viewResultButton).toHaveAttribute("data-silent-focus", "true");
  await page.keyboard.press("Tab");
  await expect(viewResultButton).not.toHaveAttribute("data-silent-focus");
  await expect(
    page.getByText("Rarities keep shifting as more people play today."),
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
