import { expect, test } from "@playwright/test";
import { prepareSession, waitForGrid } from "./helpers";

// Routing, locale and editorial pages. Browser-agnostic, so routed (by
// filename) to chromium-desktop only.

test.beforeEach(async ({ page }) => {
  await prepareSession(page);
});

// ── Bascule de langue FR / EN ────────────────────────────────────────────────

test("language switch flips the UI between EN and FR", async ({ page }) => {
  await page.goto("/");
  // La racine n'a pas de langue : le choix mémorisé (anglais) l'emporte.
  await expect(page).toHaveURL(/\/en$/);
  await waitForGrid(page);

  // prepareSession seeds EN — cell aria-labels are in English.
  await expect(
    page.getByRole("button", {
      name: /^Select cell row 1 column 1:/,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "FR", exact: true }).click();

  // After switching, the same cell exposes its French aria-label, under /fr.
  await expect(
    page.getByRole("button", {
      name: /^Sélectionner case ligne 1 colonne 1 :/,
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/fr$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});

test("the root follows the browser, and a direct link suggests its language", async ({
  page,
}) => {
  // Sans choix mémorisé ; le navigateur de test annonce en-US.
  await page.addInitScript(() => {
    // biome-ignore lint/suspicious/noDocumentCookie: clears the preference cookie seeded by prepareSession
    document.cookie = "geodoku_locale=; Path=/; Max-Age=0";
  });
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(
    page.getByRole("button", { name: "Play in English" }),
  ).toHaveCount(0);

  // Un lien direct vers une page française l'affiche, et suggère l'anglais.
  await page.goto("/fr/about");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page.getByRole("button", { name: "Play in English" }).click();
  await expect(page).toHaveURL(/\/en\/about$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("button", { name: "Play in English" }),
  ).toHaveCount(0);
});

test("dialogs keep programmatic focus visually silent until Tab", async ({
  page,
}) => {
  await page.goto("/");
  await waitForGrid(page);

  const trigger = page.getByRole("button", { name: "How to play" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "How to play" });
  await expect(dialog).toBeFocused();
  await expect(dialog).toHaveAttribute("data-silent-focus", "true");
  expect(
    await dialog.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--tw-ring-shadow").trim(),
    ),
  ).toBe("0 0 #0000");

  await page.keyboard.press("Tab");
  await expect(dialog).not.toHaveAttribute("data-silent-focus");
  await expect(dialog.getByRole("checkbox")).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("data-silent-focus", "true");
  expect(
    await trigger.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--tw-ring-shadow").trim(),
    ),
  ).toBe("0 0 #0000");

  await page.keyboard.press("Tab");
  await expect(trigger).not.toHaveAttribute("data-silent-focus");
});

// ── Page Privacy ─────────────────────────────────────────────────────────────

test("privacy page renders its content", async ({ page }) => {
  await page.goto("/en/privacy/");
  await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
  await expect(page.getByText("Back to the game")).toBeVisible();
  await expect(page).toHaveURL(/\/en\/privacy$/);
});

// ── Page À propos ────────────────────────────────────────────────────────────

test("about page renders its rules and FAQ, reachable from the footer", async ({
  page,
}) => {
  await page.goto("/");
  await waitForGrid(page);
  await page.getByRole("link", { name: "About", exact: true }).click();

  await expect(page).toHaveURL(/\/en\/about$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "About" }),
  ).toBeVisible();
  await expect(page.getByText("Unique countries")).toBeVisible();
  await expect(
    page.getByText("How much does Geodoku cost?", { exact: true }),
  ).toBeVisible();
});

// ── Page Changelog ───────────────────────────────────────────────────────────

test("changelog page renders its content", async ({ page }) => {
  await page.goto("/en/changelog");
  await expect(page.getByRole("heading", { name: "What's new" })).toBeVisible();
  await expect(page.getByText("Back to the game")).toBeVisible();
});

test("editorial links navigate without reloading the document", async ({
  page,
}) => {
  await page.goto("/");
  await waitForGrid(page);
  const sentinel = crypto.randomUUID();
  await page.evaluate((value) => {
    Object.assign(window, { __geodokuNavigationSentinel: value });
  }, sentinel);

  await page.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
  await expect(page.locator("[data-route-announcer]")).toHaveText("Privacy");
  expect(
    await page.evaluate(
      () =>
        (window as Window & { __geodokuNavigationSentinel?: string })
          .__geodokuNavigationSentinel,
    ),
  ).toBe(sentinel);

  await page.getByRole("link", { name: "What's new", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What's new" })).toBeVisible();
  await expect(page.locator("[data-route-announcer]")).toHaveText("What's new");
  expect(
    await page.evaluate(
      () =>
        (window as Window & { __geodokuNavigationSentinel?: string })
          .__geodokuNavigationSentinel,
    ),
  ).toBe(sentinel);

  await page.goBack();
  await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
  await page.getByRole("link", { name: "Back to the game" }).click();
  await waitForGrid(page);
});

// ── Route admin — barrière de token ──────────────────────────────────────────

test("admin route shows the token gate when unauthenticated", async ({
  page,
}) => {
  await page.goto("/admin");

  // No token in sessionStorage → the password gate is shown, not the panels.
  await expect(page.getByPlaceholder("Token d'administration")).toBeVisible();
});

test("invalid admin token returns to the token gate", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("geodoku:admin-token", "invalid-e2e-token");
  });
  await page.goto("/admin");

  await expect(page.getByPlaceholder("Token d'administration")).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.getByRole("heading", { name: "Something broke" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => sessionStorage.getItem("geodoku:admin-token")),
  ).toBeNull();
});
