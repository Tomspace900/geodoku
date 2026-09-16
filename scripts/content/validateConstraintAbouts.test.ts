import { describe, expect, it } from "vitest";
import {
  aboutFileCoverageErrors,
  clarificationErrors,
  containsWholeWord,
  sourceUrlErrors,
  unreferencedSourceErrors,
  validateConstraintAbouts,
} from "./validateConstraintAbouts";

describe("containsWholeWord", () => {
  it("trouve un mot entier, insensible aux accents et à la casse", () => {
    expect(containsWholeWord("Bordé par la Méditerranée", "mediterranee")).toBe(
      true,
    );
  });

  it("ne matche pas une sous-chaîne (Niger dans nigérian)", () => {
    expect(containsWholeWord("un fleuve nigérian", "niger")).toBe(false);
  });
});

describe("clarificationErrors", () => {
  const BASE = {
    id: "test_constraint",
    locale: "fr" as const,
    translatedLabel: "Frontalier de la Russie",
    countryNames: ["Russie", "Chine", "Niger"],
  };

  it("est vert sur une clarification conforme", () => {
    expect(
      clarificationErrors({
        ...BASE,
        text: "Seuls les voisins terrestres jouables sont comptés.",
      }),
    ).toEqual([]);
  });

  it("refuse une clarification vide", () => {
    expect(clarificationErrors({ ...BASE, text: "" })).toEqual([
      "test_constraint: clarification fr vide",
    ]);
  });

  it("refuse une clarification de plus de 160 caractères", () => {
    const text = "a".repeat(161);
    expect(clarificationErrors({ ...BASE, text })).toEqual([
      "test_constraint: clarification fr dépasse 160 caractères (161)",
    ]);
  });

  it("refuse un nom de pays absent du libellé", () => {
    expect(
      clarificationErrors({ ...BASE, text: "Comparé à la Chine voisine." }),
    ).toEqual([
      "test_constraint: clarification fr nomme « Chine », absent du libellé — reformuler ou motiver dans ACCEPTED_COUNTRY_MENTIONS",
    ]);
  });

  it("laisse passer un nom de pays déjà présent dans le libellé", () => {
    expect(
      clarificationErrors({ ...BASE, text: "Concerne la Russie uniquement." }),
    ).toEqual([]);
  });

  it("laisse passer un nom de pays couvert par une exception motivée", () => {
    expect(
      clarificationErrors({
        ...BASE,
        text: "Nommé d'après le fleuve Niger, pas le pays.",
        acceptedMentions: ["Niger"],
      }),
    ).toEqual([]);
  });
});

describe("aboutFileCoverageErrors", () => {
  it("est vert quand les dossiers correspondent exactement aux ids attendus", () => {
    expect(
      aboutFileCoverageErrors({
        existingAboutIds: ["a", "b"],
        expectedIds: ["b", "a"],
        reserveIdsWithAbout: [],
      }),
    ).toEqual([]);
  });

  it("refuse un dossier manquant ou orphelin", () => {
    expect(
      aboutFileCoverageErrors({
        existingAboutIds: ["a"],
        expectedIds: ["a", "b"],
        reserveIdsWithAbout: [],
      }),
    ).toHaveLength(1);
  });

  it("refuse un about.ts présent dans une contrainte en réserve", () => {
    expect(
      aboutFileCoverageErrors({
        existingAboutIds: ["a"],
        expectedIds: ["a"],
        reserveIdsWithAbout: ["reserve_id"],
      }),
    ).toEqual(["reserve_id: en réserve mais about.ts présent"]);
  });
});

describe("unreferencedSourceErrors", () => {
  it("refuse une source déclarée mais jamais citée", () => {
    expect(
      unreferencedSourceErrors(["used", "orphan"], new Set(["used"])),
    ).toEqual(["sources: « orphan » n'est référencé par aucune contrainte"]);
  });
});

describe("sourceUrlErrors", () => {
  it("refuse une URL non https", () => {
    expect(
      sourceUrlErrors(new Map([["bad", { url: "http://example.com" }]])),
    ).toEqual(["sources: « bad » a une URL non https (http://example.com)"]);
  });
});

describe("validateConstraintAbouts", () => {
  it("est vert sur le contenu committé", () => {
    expect(validateConstraintAbouts()).toEqual([]);
  });
});
