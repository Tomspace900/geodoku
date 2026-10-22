// @vitest-environment node
// Le tiret cadratin fait « texte généré » : on n'en veut dans aucun texte joueur
// (#148). Les intervalles gardent le demi-cadratin (« 2022–2024 »), et le « — »
// d'une case vide de la grille solution, glyphe et non prose, n'est pas couvert.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../../..");
const EM_DASH = "—";

const constraintsDir = join(ROOT, "content/constraints");
const aboutFiles = readdirSync(constraintsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join("content/constraints", entry.name, "about.ts"))
  .filter((path) => existsSync(join(ROOT, path)));

const PLAYER_TEXT_FILES = [
  ...readdirSync(join(ROOT, "src/i18n/locales")).map((name) =>
    join("src/i18n/locales", name),
  ),
  "content/sources.ts",
  "index.html",
  "public/site.webmanifest",
  ...aboutFiles,
];

describe("textes joueur sans tiret cadratin", () => {
  it.each(PLAYER_TEXT_FILES)("%s", (path) => {
    const offending = readFileSync(join(ROOT, path), "utf8")
      .split("\n")
      .flatMap((line, index) =>
        line.includes(EM_DASH) ? [`${index + 1}: ${line.trim()}`] : [],
      );
    expect(offending).toEqual([]);
  });
});
