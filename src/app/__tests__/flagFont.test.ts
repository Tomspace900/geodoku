import { describe, expect, it } from "vitest";
import tailwindConfig from "../../../tailwind.config";
import { FLAG_FONT_FAMILY } from "../flagFont";

// Sans la police de drapeaux en tête de pile, Windows retombe sur Segoe UI
// Emoji, qui n'a aucun drapeau (#51).
describe("piles de polices Tailwind", () => {
  const fontFamily = tailwindConfig.theme?.extend?.fontFamily as Record<
    string,
    string[]
  >;

  it.each(["sans", "serif"])(
    "%s commence par la police des drapeaux",
    (key) => {
      expect(fontFamily[key]?.[0]).toBe(FLAG_FONT_FAMILY);
    },
  );
});
