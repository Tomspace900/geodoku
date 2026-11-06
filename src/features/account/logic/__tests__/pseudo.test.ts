import { describe, expect, it } from "vitest";
import { ANIMALS, PLACES } from "../nameParts";
import {
  checkPseudo,
  composePseudo,
  drawPseudo,
  isRefusedPseudo,
  PSEUDO_MAX_LENGTH,
  pseudoLength,
} from "../pseudo";

describe("drawPseudo", () => {
  it("place le lieu après l'animal en français", () => {
    expect(composePseudo(ANIMALS[0], PLACES[0], "fr")).toBe("Okapi du Sahara");
  });

  it("place le lieu devant l'animal en anglais", () => {
    expect(composePseudo(ANIMALS[0], PLACES[0], "en")).toBe("Sahara Okapi");
  });

  it("ne tire jamais un nom trop long", () => {
    // Le dernier animal et le dernier lieu à chaque tirage : le pire cas.
    const lengths = ["fr", "en"].flatMap((locale) =>
      Array.from({ length: 50 }, (_, i) =>
        pseudoLength(drawPseudo(locale as "fr" | "en", () => (i + 0.5) / 50)),
      ),
    );
    expect(Math.max(...lengths)).toBeLessThanOrEqual(PSEUDO_MAX_LENGTH);
  });

  it("ne tire que des noms acceptés par le filtre", () => {
    const refused = ANIMALS.flatMap((animal) =>
      PLACES.flatMap((place) =>
        (["fr", "en"] as const)
          .map((locale) => composePseudo(animal, place, locale))
          .filter((pseudo) => pseudoLength(pseudo) <= PSEUDO_MAX_LENGTH)
          .filter((pseudo) => !checkPseudo(pseudo).ok),
      ),
    );
    expect(refused).toEqual([]);
  });
});

describe("checkPseudo", () => {
  it("accepte lettres accentuées, chiffres, tirets et apostrophes", () => {
    expect(checkPseudo("Zoé d'Arc-2")).toEqual({
      ok: true,
      pseudo: "Zoé d'Arc-2",
    });
  });

  it("réduit les espaces", () => {
    expect(checkPseudo("  Camille   B ")).toEqual({
      ok: true,
      pseudo: "Camille B",
    });
  });

  it("refuse moins de 3 caractères", () => {
    expect(checkPseudo("Jo")).toEqual({ ok: false, reason: "too_short" });
  });

  it("refuse plus de 20 caractères", () => {
    expect(checkPseudo("a".repeat(21))).toEqual({
      ok: false,
      reason: "too_long",
    });
  });

  it("refuse un emoji", () => {
    expect(checkPseudo("Camille 🦊")).toEqual({ ok: false, reason: "invalid" });
  });

  it("compte un caractère accentué pour un seul", () => {
    expect(pseudoLength("Éé")).toBe(2);
  });
});

describe("isRefusedPseudo", () => {
  it("refuse un nom réservé à l'équipe", () => {
    expect(isRefusedPseudo("Geodoku Officiel")).toBe(true);
  });

  it("refuse un mot court seulement entier", () => {
    expect(isRefusedPseudo("Gros con")).toBe(true);
  });

  it("laisse passer un mot court caché dans un autre", () => {
    expect(isRefusedPseudo("Condor du Cap")).toBe(false);
  });

  it("refuse une racine collée à d'autres lettres", () => {
    expect(isRefusedPseudo("XxSalopexX")).toBe(true);
  });

  it("lit les chiffres déguisés en lettres", () => {
    expect(isRefusedPseudo("C0nnard")).toBe(true);
  });

  it("ne confond pas un prénom avec une insulte", () => {
    expect(isRefusedPseudo("Dominique")).toBe(false);
  });

  it("ne confond pas un pays avec une insulte", () => {
    expect(isRefusedPseudo("Lynx du Montenegro")).toBe(false);
  });
});
