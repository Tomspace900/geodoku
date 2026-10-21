import { describe, expect, it } from "vitest";
import {
  browserLocale,
  LOCALE_COOKIE,
  localeFromCookie,
  localeFromPath,
  localizePath,
  parseAcceptLanguage,
  preferredLocale,
  stripLocale,
  suggestedLocale,
} from "../localePath";

describe("localeFromPath", () => {
  it("lit la langue du premier segment", () => {
    expect(localeFromPath("/en/privacy")).toBe("en");
  });

  it("lit la langue d'un accueil sans barre finale", () => {
    expect(localeFromPath("/fr")).toBe("fr");
  });

  it("ne donne aucune langue à la racine", () => {
    expect(localeFromPath("/")).toBeNull();
  });

  it("ne prend pas un segment qui commence par une langue", () => {
    expect(localeFromPath("/english")).toBeNull();
  });
});

describe("stripLocale", () => {
  it("ramène un accueil localisé à la racine", () => {
    expect(stripLocale("/fr")).toBe("/");
  });

  it("retire le préfixe d'une page", () => {
    expect(stripLocale("/en/archive/2026-10-01")).toBe("/archive/2026-10-01");
  });

  it("laisse un chemin sans langue tel quel", () => {
    expect(stripLocale("/admin")).toBe("/admin");
  });
});

describe("localizePath", () => {
  it("préfixe une page", () => {
    expect(localizePath("/changelog", "en")).toBe("/en/changelog");
  });

  it("donne /fr pour l'accueil français", () => {
    expect(localizePath("/", "fr")).toBe("/fr");
  });

  it("change la langue d'un chemin déjà localisé", () => {
    expect(localizePath("/en/privacy", "fr")).toBe("/fr/privacy");
  });

  it("laisse l'admin sans préfixe", () => {
    expect(localizePath("/admin", "en")).toBe("/admin");
  });
});

describe("parseAcceptLanguage", () => {
  it("trie les langues par préférence", () => {
    expect(parseAcceptLanguage("en;q=0.5, fr-CH, fr;q=0.9")).toEqual([
      "fr-CH",
      "fr",
      "en",
    ]);
  });

  it("écarte les langues refusées et le joker", () => {
    expect(parseAcceptLanguage("fr;q=0, *;q=0.1, en")).toEqual(["en"]);
  });

  it("ne lit rien sans en-tête", () => {
    expect(parseAcceptLanguage(null)).toEqual([]);
  });
});

describe("browserLocale", () => {
  it("reconnaît une variante régionale", () => {
    expect(browserLocale(["de-DE", "en-GB", "fr"])).toBe("en");
  });

  it("ne reconnaît rien hors des langues proposées", () => {
    expect(browserLocale(["es-ES", "de"])).toBeNull();
  });
});

describe("localeFromCookie", () => {
  it("lit le choix parmi d'autres cookies", () => {
    expect(localeFromCookie(`a=1; ${LOCALE_COOKIE}=fr; b=2`)).toBe("fr");
  });

  it("ignore une valeur inconnue", () => {
    expect(localeFromCookie(`${LOCALE_COOKIE}=xx`)).toBeNull();
  });
});

describe("preferredLocale", () => {
  it("fait passer le choix du joueur avant son navigateur", () => {
    expect(preferredLocale({ storedLocale: "fr", languages: ["en-US"] })).toBe(
      "fr",
    );
  });

  it("suit le navigateur sans choix", () => {
    expect(preferredLocale({ storedLocale: null, languages: ["fr-BE"] })).toBe(
      "fr",
    );
  });

  it("retombe sur l'anglais sans langue reconnue", () => {
    expect(preferredLocale({ storedLocale: null, languages: ["es"] })).toBe(
      "en",
    );
  });
});

describe("suggestedLocale", () => {
  it("propose la langue du navigateur sur une page d'une autre langue", () => {
    expect(
      suggestedLocale({
        pathname: "/fr/about",
        storedLocale: null,
        languages: ["en-US"],
      }),
    ).toBe("en");
  });

  it("propose le choix du joueur plutôt que son navigateur", () => {
    expect(
      suggestedLocale({
        pathname: "/en",
        storedLocale: "fr",
        languages: ["en-US"],
      }),
    ).toBe("fr");
  });

  it("ne propose rien sur une page déjà dans la bonne langue", () => {
    expect(
      suggestedLocale({
        pathname: "/en/privacy",
        storedLocale: null,
        languages: ["en-US"],
      }),
    ).toBeNull();
  });

  it("ne propose rien sans langue reconnue", () => {
    expect(
      suggestedLocale({
        pathname: "/fr",
        storedLocale: null,
        languages: ["es-ES"],
      }),
    ).toBeNull();
  });

  it("ne propose rien hors des pages localisées", () => {
    expect(
      suggestedLocale({
        pathname: "/admin",
        storedLocale: null,
        languages: ["en-US"],
      }),
    ).toBeNull();
  });
});
