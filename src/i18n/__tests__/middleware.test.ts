import { describe, expect, it } from "vitest";
import { PRERENDERED_PAGES } from "@/app/pageMeta";
import middleware, { config } from "../../../middleware";
import { LOCALE_COOKIE } from "../localePath";

function redirectFor(
  path: string,
  headers: Record<string, string> = {},
): string | null {
  // Pas de `new Request` : il retire l'en-tête `Cookie`, comme un navigateur.
  const response = middleware({
    url: `https://www.geodoku.app${path}`,
    headers: new Headers(headers),
  });
  return response.headers.get("Location");
}

describe("middleware de langue", () => {
  it("envoie un navigateur francophone vers /fr", () => {
    expect(redirectFor("/", { "accept-language": "fr-FR,fr;q=0.9" })).toBe(
      "https://www.geodoku.app/fr",
    );
  });

  it("fait passer le choix du joueur avant son navigateur", () => {
    expect(
      redirectFor("/", {
        "accept-language": "en-US",
        cookie: `${LOCALE_COOKIE}=fr`,
      }),
    ).toBe("https://www.geodoku.app/fr");
  });

  it("envoie un visiteur sans langue reconnue vers l'anglais", () => {
    expect(redirectFor("/")).toBe("https://www.geodoku.app/en");
  });

  it("garde la page et la requête", () => {
    expect(
      redirectFor("/archive/2026-10-01?x=1", { "accept-language": "fr" }),
    ).toBe("https://www.geodoku.app/fr/archive/2026-10-01?x=1");
  });

  it("redirige temporairement, sans cache", () => {
    const response = middleware({
      url: "https://www.geodoku.app/about",
      headers: new Headers(),
    });
    expect([response.status, response.headers.get("Cache-Control")]).toEqual([
      302,
      "private, no-store",
    ]);
  });

  it("couvre chaque page publique sans langue", () => {
    expect(config.matcher).toEqual(
      expect.arrayContaining([...PRERENDERED_PAGES]),
    );
  });
});
