import { describe, expect, it } from "vitest";
import { SOVEREIGNTY } from "./data/sovereignty";
import type { SovereigntySnapshot } from "./data/types";
import { validateSovereigntySources } from "./validateSovereigntySources";

function snapshotOf(
  countries: SovereigntySnapshot["countries"],
): SovereigntySnapshot {
  return { sourceCommit: "test", countries };
}

describe("cohérence du dataset de souveraineté", () => {
  it("accepte le dataset committé", () => {
    expect(validateSovereigntySources(SOVEREIGNTY)).toEqual([]);
  });

  // Le cas réel manqué par deux revues successives, désormais outillé.
  it("signale une puissance nommée mais absente de formerSovereigns", () => {
    const errors = validateSovereigntySources(
      snapshotOf({
        SDN: {
          kind: "independence",
          year: 1956,
          formerSovereigns: [],
          sourceDescription: "1 January 1956 (from Egypt and the UK)",
        },
      }),
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("SDN");
    expect(errors[0]).toContain("united_kingdom");
  });

  it("accepte la même notice une fois la curation complétée", () => {
    expect(
      validateSovereigntySources(
        snapshotOf({
          SDN: {
            kind: "independence",
            year: 1956,
            formerSovereigns: ["united_kingdom"],
            sourceDescription: "1 January 1956 (from Egypt and the UK)",
          },
        }),
      ),
    ).toEqual([]);
  });

  it("laisse passer une omission inscrite et justifiée", () => {
    // L'Allemagne nomme quatre puissances : ce sont des zones d'occupation.
    expect(
      validateSovereigntySources(
        snapshotOf({
          DEU: {
            kind: "independence",
            year: 1871,
            formerSovereigns: [],
            sourceDescription:
              "divided into four zones of occupation (UK, US, USSR, and France) in 1945",
          },
        }),
      ),
    ).toEqual([]);
  });

  it("ne réclame rien pour un slug que le texte ne nomme pas", () => {
    // La curation a le droit d'ajouter ce que la source dit autrement.
    expect(
      validateSovereigntySources(
        snapshotOf({
          PAK: {
            kind: "independence",
            year: 1947,
            formerSovereigns: ["united_kingdom"],
            sourceDescription: "14 August 1947 (from British India)",
          },
          TLS: {
            kind: "restoration",
            year: 2002,
            formerSovereigns: ["portugal"],
            sourceDescription: "20 May 2002 (from Indonesia)",
          },
        }),
      ),
    ).toEqual([]);
  });
});
