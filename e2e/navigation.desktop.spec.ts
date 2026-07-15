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
  await waitForGrid(page);

  // prepareSession seeds EN — cell aria-labels are in English.
  await expect(
    page.getByRole("button", {
      name: /^Select cell row 1 column 1:/,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "FR", exact: true }).click();

  // After switching, the same cell exposes its French aria-label.
  await expect(
    page.getByRole("button", {
      name: /^Sélectionner case ligne 1 colonne 1 :/,
    }),
  ).toBeVisible();
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
  await page.goto("/privacy/");
  await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
  await expect(page.getByText("Back to the game")).toBeVisible();
  await expect(page).toHaveURL(/\/privacy$/);
});

// ── Page Changelog ───────────────────────────────────────────────────────────

test("changelog page renders its content", async ({ page }) => {
  await page.goto("/changelog");
  await expect(page.getByRole("heading", { name: "Changelog" })).toBeVisible();
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

  await page.getByRole("link", { name: "Changelog", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Changelog" })).toBeVisible();
  await expect(page.locator("[data-route-announcer]")).toHaveText("Changelog");
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
