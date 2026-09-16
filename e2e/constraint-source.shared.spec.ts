import { expect, test } from "@playwright/test";
import { prepareSession, waitForGrid } from "./helpers";

// Toast de source d'une contrainte — tap sur un en-tête de ligne/colonne.

test.beforeEach(async ({ page }) => {
  await prepareSession(page);
  await page.goto("/");
  await waitForGrid(page);
});

test("tapping a column header shows its source without opening the guess modal, and Escape hides it", async ({
  page,
}) => {
  const gridElement = page.getByRole("table", {
    name: "Today's geography grid",
  });
  const headerButton = gridElement
    .getByRole("columnheader")
    .first()
    .getByRole("button");
  const label = (await headerButton.textContent())?.trim() ?? "";
  expect(label.length).toBeGreaterThan(0);

  await headerButton.click();

  const toast = page.getByRole("status").filter({ hasText: label });
  await expect(toast).toBeVisible();

  // Ne doit jamais ouvrir la modale de saisie (le toast n'est pas un raccourci vers une case).
  await expect(page.getByPlaceholder("Search for a country…")).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(toast).toHaveCount(0);
});

test("tapping the same header again closes the toast", async ({ page }) => {
  const gridElement = page.getByRole("table", {
    name: "Today's geography grid",
  });
  const headerButton = gridElement
    .getByRole("rowheader")
    .first()
    .getByRole("button");
  const label = (await headerButton.textContent())?.trim() ?? "";

  await headerButton.click();
  const toast = page.getByRole("status").filter({ hasText: label });
  await expect(toast).toBeVisible();

  await headerButton.click();
  await expect(toast).toHaveCount(0);
});
