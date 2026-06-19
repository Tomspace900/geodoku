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
      name: "Select cell row 1 column 1",
      exact: true,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "FR", exact: true }).click();

  // After switching, the same cell exposes its French aria-label.
  await expect(
    page.getByRole("button", {
      name: "Sélectionner case ligne 1 colonne 1",
      exact: true,
    }),
  ).toBeVisible();
});

// ── Page Privacy ─────────────────────────────────────────────────────────────

test("privacy page renders its content", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
  await expect(page.getByText("Back to the game")).toBeVisible();
});

// ── Page Changelog ───────────────────────────────────────────────────────────

test("changelog page renders its content", async ({ page }) => {
  await page.goto("/changelog");
  await expect(page.getByRole("heading", { name: "Changelog" })).toBeVisible();
  await expect(page.getByText("Back to the game")).toBeVisible();
});

// ── Route admin — barrière de token ──────────────────────────────────────────

test("admin route shows the token gate when unauthenticated", async ({
  page,
}) => {
  await page.goto("/admin");

  // No token in sessionStorage → the password gate is shown, not the panels.
  await expect(page.getByPlaceholder("Token d'administration")).toBeVisible();
});
