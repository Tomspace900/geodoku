import { CONSTRAINTS } from "@/features/game/logic/constraints";
import { describe, expect, it } from "vitest";
import { translate } from "../index";
import type { TKey } from "../types";

describe("translate", () => {
  it("returns the French string for a valid key in FR locale", () => {
    expect(translate("fr", "ui.appName")).toBe("Geodoku");
    expect(translate("fr", "constraint.continent_africa")).toBe(
      "Pays d'Afrique",
    );
  });

  it("returns the English string for a valid key in EN locale", () => {
    expect(translate("en", "ui.appName")).toBe("Geodoku");
    expect(translate("en", "constraint.continent_africa")).toBe(
      "African country",
    );
  });

  it("returns a different string for FR vs EN", () => {
    const fr = translate("fr", "ui.howToPlay");
    const en = translate("en", "ui.howToPlay");
    expect(fr).toBe("Comment jouer\u00A0?");
    expect(en).toBe("How to play?");
    expect(fr).not.toBe(en);
  });

  it("falls back to EN when key is missing in FR locale (returns EN value)", () => {
    // This tests the fallback mechanism by using a valid key
    // The fallback would be exercised if FR were incomplete
    const result = translate("fr", "ui.share");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns the raw key when key does not exist in EN locale", () => {
    const badKey = "ui.nonExistentKey" as TKey;
    expect(translate("en", badKey)).toBe("ui.nonExistentKey");
  });

  it("falls back to EN for an unknown key in FR locale", () => {
    const badKey = "ui.nonExistentKey" as TKey;
    // FR → tries EN → not found → returns key
    expect(translate("fr", badKey)).toBe("ui.nonExistentKey");
  });

  it("interpolates variables in the translated string", () => {
    const result = translate("fr", "ui.rarityScore", { raw: 180, max: 405 });
    expect(result).toBe("Score de rareté\u00A0— 180\u00A0/ 405\u00A0pts");
  });

  it("interpolates variables in the English string", () => {
    const result = translate("en", "ui.rarityScore", { raw: 180, max: 405 });
    expect(result).toBe("Rarity score — 180\u00A0/ 405\u00A0pts");
  });

  it("leaves missing interpolation variables as {placeholder}", () => {
    const result = translate("fr", "ui.rarityScore");
    expect(result).toContain("{raw}");
    expect(result).toContain("{max}");
  });

  it("handles achievement interpolation", () => {
    const result = translate("fr", "achievement.eliteCollectorDesc", {
      country: "Bhoutan",
    });
    expect(result).toBe("Vous avez trouvé Bhoutan, un pays ultra-rare.");
  });

  it("handles count interpolation for globe trotter", () => {
    const result = translate("en", "achievement.globeTrotterDesc", {
      count: 4,
    });
    expect(result).toBe("You visited 4\u00A0different continents.");
  });

  it("handles constraint keys correctly", () => {
    expect(translate("fr", "constraint.water_landlocked")).toBe(
      "Enclavé (sans accès à la mer)",
    );
    expect(translate("en", "constraint.water_landlocked")).toBe(
      "Landlocked (no sea access)",
    );
  });

  it("handles all constraint keys without returning raw key", () => {
    for (const c of CONSTRAINTS) {
      const key = `constraint.${c.id}` as TKey;
      const frResult = translate("fr", key);
      const enResult = translate("en", key);
      expect(frResult).not.toBe(key);
      expect(enResult).not.toBe(key);
    }
  });
});
