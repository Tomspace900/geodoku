import { expect, test } from "@playwright/test";

// Drapeaux emoji sous Windows (#51). Les navigateurs des e2e tournent sous
// Linux, avec Noto Color Emoji : ils dessinent les drapeaux et le bug n'y
// apparaît jamais. On simule donc un navigateur sans drapeaux en empêchant le
// canvas de dessiner les indicateurs régionaux, ce que fait Segoe UI Emoji.
const FLAG_FONT_FAMILY = "Twemoji Country Flags";

test("without native flag emojis, the flag font is served by our own domain", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const regionalIndicator = /[\u{1F1E6}-\u{1F1FF}]/u;
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...rest) {
      if (regionalIndicator.test(text)) return;
      fillText.call(this, text, ...rest);
    };
  });
  // A page without any flag: the font must load anyway, at startup, so the
  // first flag the player places never shows up as two letters first.
  await page.goto("/en/about");

  await expect
    .poll(() =>
      page.evaluate(
        (family) =>
          [...document.fonts]
            .filter((face) => face.family.replaceAll('"', "") === family)
            .map((face) => face.status),
        FLAG_FONT_FAMILY,
      ),
    )
    .toEqual(["loaded"]);

  const fontOrigins = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => name.includes("TwemojiCountryFlags"))
      .map((name) => new URL(name).origin),
  );
  expect(fontOrigins.length).toBeGreaterThan(0);
  const pageOrigin = new URL(page.url()).origin;
  fontOrigins.forEach((origin) => {
    expect(origin).toBe(pageOrigin);
  });
});
