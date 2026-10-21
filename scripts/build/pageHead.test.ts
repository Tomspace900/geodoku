import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { pageMeta } from "../../src/app/pageMeta.ts";
import { applyPageHead } from "./pageHead.ts";

const template = readFileSync(
  join(import.meta.dirname, "../../index.html"),
  "utf8",
);

describe("applyPageHead", () => {
  it("passe une page anglaise en lang=en", () => {
    expect(applyPageHead(template, pageMeta("/en"))).toContain(
      '<html lang="en">',
    );
  });

  it("pose le canonical propre à la page", () => {
    expect(applyPageHead(template, pageMeta("/en/privacy"))).toContain(
      '<link rel="canonical" href="https://www.geodoku.app/en/privacy" />',
    );
  });

  it("ajoute les versions linguistiques", () => {
    expect(applyPageHead(template, pageMeta("/changelog"))).toContain(
      '<link rel="alternate" hreflang="x-default" href="https://www.geodoku.app/changelog" />',
    );
  });

  it("distingue og:locale de og:locale:alternate", () => {
    const html = applyPageHead(template, pageMeta("/en"));
    expect(
      html.includes('<meta property="og:locale" content="en_US" />') &&
        html.includes(
          '<meta property="og:locale:alternate" content="fr_FR" />',
        ),
    ).toBe(true);
  });

  it("échoue si une balise attendue manque au gabarit", () => {
    expect(() =>
      applyPageHead(
        template.replace(/<title>[^<]*<\/title>/, ""),
        pageMeta("/"),
      ),
    ).toThrow(/correspondance/);
  });
});
