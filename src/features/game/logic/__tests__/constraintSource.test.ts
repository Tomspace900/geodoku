import { describe, expect, it } from "vitest";
import { constraintSourceView } from "../constraintSource";

describe("constraintSourceView", () => {
  it("expose les sources, le millésime et la mention de convention", () => {
    const view = constraintSourceView("nature_active_volcano", "fr");
    expect(view.sources).toEqual([
      {
        name: "Smithsonian Global Volcanism Program",
        url: "https://volcano.si.edu/",
        vintage: null,
      },
    ]);
    expect(view.isConvention).toBe(false);
    expect(view.clarification).toBe(
      "Au moins une éruption datée de 1500 ou après, sur le territoire pleinement intégré du pays.",
    );
  });

  it("traduit le nom de source et la clarification selon la locale", () => {
    const view = constraintSourceView("nature_active_volcano", "en");
    expect(view.sources[0].name).toBe("Smithsonian Global Volcanism Program");
    expect(view.clarification).toBe(
      "At least one eruption dated 1500 or later, on the country's fully integrated territory.",
    );
  });

  it("marque une contrainte de convention", () => {
    const view = constraintSourceView("flag_has_star", "fr");
    expect(view.isConvention).toBe(true);
  });

  it("renvoie une clarification nulle quand la contrainte n'en a pas", () => {
    const view = constraintSourceView("water_landlocked", "fr");
    expect(view.clarification).toBeNull();
  });

  it("porte plusieurs sources quand la contrainte en cite plusieurs", () => {
    const view = constraintSourceView("borders_solo", "fr");
    expect(view.sources.map((s) => s.name)).toEqual([
      "world-countries",
      "REST Countries",
    ]);
  });
});
