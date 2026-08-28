import { describe, expect, it } from "vitest";
import type { ConstraintId } from "@/features/game/logic/constraints";
import {
  type ConstraintAnswerSets,
  constraintCandidateMetric,
  intersectSelectedConstraints,
} from "../constraintExplorer";

function answerSets(
  entries: Array<[ConstraintId, readonly string[]]>,
): ConstraintAnswerSets {
  return new Map(
    entries.map(([constraintId, answers]) => [constraintId, new Set(answers)]),
  );
}

describe("constraint explorer", () => {
  it("intersects every selected answer list", () => {
    const sets = answerSets([
      ["continent_europe", ["FRA", "ESP", "DEU"]],
      ["language_french", ["FRA", "BEL", "CAN"]],
    ]);

    expect([
      ...intersectSelectedConstraints(
        ["continent_europe", "language_french"],
        sets,
      ),
    ]).toEqual(["FRA"]);
  });

  it("returns no countries before a constraint is selected", () => {
    expect(intersectSelectedConstraints([], new Map()).size).toBe(0);
  });

  it("detects containment with the generator overlap coefficient", () => {
    expect(
      constraintCandidateMetric(
        new Set(["FRA", "ESP"]),
        new Set(["FRA", "ESP", "DEU", "ITA"]),
      ),
    ).toEqual({ resultingCount: 2, overlapCoefficient: 1 });
  });
});
