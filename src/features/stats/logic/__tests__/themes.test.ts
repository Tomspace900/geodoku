import { describe, expect, it } from "vitest";
import {
  ARCHIVED_CONSTRAINTS,
  CONSTRAINTS,
} from "@/features/game/logic/constraints";
import { themeOf } from "../themes";

describe("themeOf", () => {
  it("donne une thématique à chaque contrainte, archivées comprises", () => {
    const missing = [...CONSTRAINTS, ...ARCHIVED_CONSTRAINTS]
      .map((c) => c.id)
      .filter((id) => themeOf(id) === null);
    expect(missing).toEqual([]);
  });

  it("garde chaque continent à part", () => {
    expect(themeOf("continent_oceania")).toBe("continent_oceania");
  });

  it("range les côtes avec les mers", () => {
    expect(themeOf("physical_mediterranean_coast")).toBe("seas");
  });

  it("range la densité avec la population", () => {
    expect(themeOf("density_high")).toBe("population");
  });

  it("ignore un identifiant inconnu", () => {
    expect(themeOf("nope")).toBeNull();
  });
});
