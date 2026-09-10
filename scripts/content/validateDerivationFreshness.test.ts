import { describe, expect, it } from "vitest";
import {
  answersForConstraint,
  CONSTRAINT_IDS,
} from "../../content/constraints";
import { DERIVATIONS } from "../../content/constraints/derivations";
import { COUNTRY_CODES } from "../../content/countries/countryCodes";
import { COUNTRY_FACTS } from "../../content/countries/facts";
import { validateDerivationFreshness } from "./validateDerivationFreshness";

function check(
  facts: Readonly<
    Record<string, (typeof COUNTRY_FACTS)[keyof typeof COUNTRY_FACTS]>
  >,
): string[] {
  return validateDerivationFreshness(
    DERIVATIONS,
    facts,
    COUNTRY_CODES,
    answersForConstraint,
  );
}

describe("obsolescence des listes de réponses", () => {
  it("garde les 79 answers.ts alignés sur leur dérivation", () => {
    expect(check(COUNTRY_FACTS)).toEqual([]);
    expect(CONSTRAINT_IDS).toHaveLength(Object.keys(DERIVATIONS).length);
  });

  // Sens 1 : un fait révisé sans `pnpm build:answers`.
  it("signale un fait modifié sans regen des listes", () => {
    const patched = {
      ...COUNTRY_FACTS,
      ISL: { ...COUNTRY_FACTS.ISL, waterAccess: "landlocked" as const },
    };

    expect(check(patched)).toEqual([
      "water_island: answers.ts obsolète (+[] -[ISL]) — lancer pnpm build:answers",
      "water_landlocked: answers.ts obsolète (+[ISL] -[]) — lancer pnpm build:answers",
    ]);
  });

  // Sens 2 : un seuil déplacé dans `derivations.ts` sans regen.
  it("signale un seuil de dérivation déplacé", () => {
    const derivations = {
      ...DERIVATIONS,
      borders_min_7: (f: (typeof COUNTRY_FACTS)["FRA"]) =>
        f.borders.length >= 8,
    };

    const errors = validateDerivationFreshness(
      derivations,
      COUNTRY_FACTS,
      COUNTRY_CODES,
      answersForConstraint,
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(
      /^borders_min_7: answers\.ts obsolète \(\+\[\] -\[\w{3}(,\w{3})*\]\) — lancer pnpm build:answers$/,
    );
  });
});
