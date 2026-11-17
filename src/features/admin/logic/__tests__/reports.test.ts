import { describe, expect, it } from "vitest";
import { reportGridLine, reportTargetLabel } from "../reports";

const GRID = {
  rows: ["continent_asia", "x", "y"],
  cols: ["water_landlocked", "z", "w"],
};

describe("reportTargetLabel", () => {
  it("nomme la case par ses deux contraintes", () => {
    expect(
      reportTargetLabel(
        { kind: "cell", date: "2026-11-14", mode: "daily", cellKey: "0,0" },
        GRID,
      ),
    ).toBe("Case Pays d'Asie × Enclavé (sans accès à la mer)");
  });

  it("garde les coordonnées sans la grille", () => {
    expect(
      reportTargetLabel(
        { kind: "cell", date: "2026-11-14", mode: "daily", cellKey: "1,2" },
        undefined,
      ),
    ).toBe("Case ligne 2, colonne 3");
  });

  it("nomme la page d'un signalement général", () => {
    expect(
      reportTargetLabel({ kind: "general", page: "/stats" }, undefined),
    ).toBe("Page /stats");
  });
});

describe("reportGridLine", () => {
  it("signale l'entraînement", () => {
    expect(
      reportGridLine({
        kind: "constraint",
        date: "2026-11-14",
        mode: "training",
        constraintId: "continent_asia",
      }),
    ).toBe("Grille du 14 novembre · entraînement");
  });
});
