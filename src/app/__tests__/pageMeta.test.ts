import { describe, expect, it } from "vitest";
import { pageMeta, prerenderedPaths } from "../pageMeta";

describe("pageMeta", () => {
  it("donne à l'accueil français son propre canonical", () => {
    expect(pageMeta("/fr").canonical).toBe("https://www.geodoku.app/fr");
  });

  it("donne à une page anglaise son propre canonical", () => {
    expect(pageMeta("/en/privacy").canonical).toBe(
      "https://www.geodoku.app/en/privacy",
    );
  });

  it("titre une page éditoriale dans sa langue", () => {
    expect(pageMeta("/fr/privacy").title).toBe("Confidentialité · Geodoku");
  });

  it("relie chaque langue et désigne l'adresse sans langue par défaut", () => {
    expect(pageMeta("/en/changelog").alternates).toEqual([
      { hreflang: "fr", href: "https://www.geodoku.app/fr/changelog" },
      { hreflang: "en", href: "https://www.geodoku.app/en/changelog" },
      { hreflang: "x-default", href: "https://www.geodoku.app/changelog" },
    ]);
  });

  it("donne la racine comme x-default de l'accueil", () => {
    expect(pageMeta("/fr").alternates.at(-1)).toEqual({
      hreflang: "x-default",
      href: "https://www.geodoku.app/",
    });
  });

  it("donne au jeu le canonical de l'accueil, pas la racine qui redirige", () => {
    const graph = pageMeta("/fr").structuredData?.["@graph"] as
      | { url: string }[]
      | undefined;
    expect(graph?.[1]?.url).toBe("https://www.geodoku.app/fr");
  });

  it("ne donne pas de données structurées hors de l'accueil", () => {
    expect(pageMeta("/fr/privacy").structuredData).toBeNull();
  });

  it("reprend l'accueil pour une page non pré-rendue", () => {
    expect(pageMeta("/en/archive").canonical).toBe(
      "https://www.geodoku.app/en",
    );
  });
});

describe("prerenderedPaths", () => {
  it("couvre chaque page dans chaque langue", () => {
    expect(prerenderedPaths()).toEqual([
      "/fr",
      "/en",
      "/fr/about",
      "/en/about",
      "/fr/privacy",
      "/en/privacy",
      "/fr/changelog",
      "/en/changelog",
    ]);
  });
});
