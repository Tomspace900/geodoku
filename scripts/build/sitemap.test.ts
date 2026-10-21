import { describe, expect, it } from "vitest";
import { pageMeta, prerenderedPaths } from "../../src/app/pageMeta.ts";
import { renderSitemap } from "./sitemap.ts";

describe("renderSitemap", () => {
  it("liste chaque page pré-rendue par son canonical", () => {
    const urls = prerenderedPaths().map((path) => pageMeta(path).canonical);
    const xml = renderSitemap(urls);
    expect(urls.every((url) => xml.includes(`<loc>${url}</loc>`))).toBe(true);
  });

  it("échappe les caractères réservés du XML", () => {
    expect(renderSitemap(["https://example.com/?a=1&b=2"])).toContain(
      "<loc>https://example.com/?a=1&amp;b=2</loc>",
    );
  });
});
