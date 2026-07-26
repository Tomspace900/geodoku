import { describe, expect, it } from "vitest";
import { formatGridDateLabel } from "../gridDateLabel";

describe("formatGridDateLabel", () => {
  it("formate en français, en capitales et sans virgule", () => {
    expect(formatGridDateLabel("2026-07-24", "fr")).toBe("VENDREDI 24 JUILLET");
  });

  it("formate en anglais", () => {
    expect(formatGridDateLabel("2026-07-24", "en")).toBe("FRIDAY JULY 24");
  });

  // Midi imposé à la construction : sans lui, un fuseau à l'ouest de UTC
  // afficherait la veille pour une date de grille.
  it("ne bascule pas d'un jour selon le fuseau du navigateur", () => {
    expect(formatGridDateLabel("2026-01-01", "fr")).toContain("1");
    expect(formatGridDateLabel("2026-01-01", "fr")).toContain("JANVIER");
  });

  it("renvoie une chaîne vide tant que la date n'est pas connue", () => {
    expect(formatGridDateLabel("", "fr")).toBe("");
  });
});
