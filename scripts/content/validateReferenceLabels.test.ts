import { describe, expect, it } from "vitest";
import {
  labelFigure,
  REFERENCE_LABELS,
  referenceLabelErrors,
  roundToSignificantDigits,
  validateReferenceLabels,
} from "./validateReferenceLabels";

describe("roundToSignificantDigits", () => {
  it("arrondit à 2 chiffres significatifs, grandes et petites valeurs", () => {
    expect(roundToSignificantDigits(30_528)).toBe(31_000);
    expect(roundToSignificantDigits(4.19)).toBe(4.2);
  });
});

describe("labelFigure", () => {
  it("lit un libellé fr : virgule décimale, espaces insécables, million", () => {
    expect(labelFigure("Plus grand que l'Inde (3,3 M km²)", "fr")).toBe(
      3_300_000,
    );
  });

  it("lit un libellé fr avec séparateur de milliers", () => {
    expect(labelFigure("Plus petit que le Luxembourg (2 600 km²)", "fr")).toBe(
      2600,
    );
  });

  it("lit un libellé en : point décimal, virgule de milliers", () => {
    expect(labelFigure("Less dense than Russia (8.5/km²)", "en")).toBe(8.5);
    expect(labelFigure("Larger than France (550,000 km²)", "en")).toBe(550_000);
  });

  it("renvoie null sans parenthèses", () => {
    expect(labelFigure("Pays d'Asie", "fr")).toBeNull();
  });
});

describe("referenceLabelErrors", () => {
  const BASE = { id: "density_more_japan", locale: "fr" as const };

  it("est vert quand le chiffre est la référence arrondie", () => {
    expect(
      referenceLabelErrors({
        ...BASE,
        label: "Plus densément peuplé que le Japon (320 hab./km²)",
        reference: 324.53,
      }),
    ).toEqual([]);
  });

  it("refuse un chiffre que la référence ne justifie plus", () => {
    expect(
      referenceLabelErrors({
        ...BASE,
        label: "Plus densément peuplé que le Japon (330 hab./km²)",
        reference: 324.53,
      }),
    ).toHaveLength(1);
  });

  it("refuse un libellé sans chiffre", () => {
    expect(
      referenceLabelErrors({
        ...BASE,
        label: "Plus densément peuplé que le Japon",
        reference: 324.53,
      }),
    ).toHaveLength(1);
  });
});

describe("REFERENCE_LABELS", () => {
  it("couvre les douze libellés dérivés d'un pays de référence", () => {
    expect(Object.keys(REFERENCE_LABELS)).toHaveLength(12);
  });
});

describe("validateReferenceLabels", () => {
  it("est vert sur le contenu réel", () => {
    expect(validateReferenceLabels()).toEqual([]);
  });
});
