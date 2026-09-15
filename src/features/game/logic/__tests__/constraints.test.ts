import { describe, expect, it } from "vitest";
import {
  ARCHIVED_CONSTRAINTS,
  CONSTRAINT_BY_ID,
  CONSTRAINTS,
  type ConstraintId,
  constraintAnswers,
  matchesConstraint,
} from "../constraints";

describe("matchesConstraint", () => {
  it("teste l'appartenance à la liste éditoriale d'une contrainte active", () => {
    expect({
      landlocked: matchesConstraint("water_landlocked", "AUT"),
      coastal: matchesConstraint("water_landlocked", "FRA"),
    }).toEqual({ landlocked: true, coastal: false });
  });

  // Le rejeu d'anciennes grilles est le seul consommateur des contraintes
  // archivées : elles sortent de la génération mais restent jouables.
  it("résout aussi les contraintes archivées", () => {
    expect({
      member: matchesConstraint("population_gt_100M", "IND"),
      nonMember: matchesConstraint("population_gt_100M", "LUX"),
    }).toEqual({ member: true, nonMember: false });
  });

  it("lève sur un identifiant absent du catalogue plutôt que de tout refuser", () => {
    expect(() =>
      matchesConstraint("continent_atlantis" as ConstraintId, "FRA"),
    ).toThrow("Unknown constraint id");
  });
});

describe("constraintAnswers", () => {
  it("expose une liste non vide pour chaque contrainte du catalogue", () => {
    const empty = [...CONSTRAINTS, ...ARCHIVED_CONSTRAINTS]
      .map(({ id }) => id)
      .filter((id) => constraintAnswers(id).size === 0);
    expect(empty).toEqual([]);
  });
});

describe("CONSTRAINT_BY_ID", () => {
  it("couvre l'actif et l'archivé, sans mélanger les deux catalogues", () => {
    const archivedIds = ARCHIVED_CONSTRAINTS.map(({ id }) => id);
    expect({
      size: CONSTRAINT_BY_ID.size,
      total: CONSTRAINTS.length + ARCHIVED_CONSTRAINTS.length,
      archivedResolved: archivedIds.every((id) => CONSTRAINT_BY_ID.has(id)),
      archivedGeneratable: CONSTRAINTS.some(({ id }) =>
        archivedIds.includes(id),
      ),
    }).toEqual({
      size: CONSTRAINTS.length + ARCHIVED_CONSTRAINTS.length,
      total: CONSTRAINTS.length + ARCHIVED_CONSTRAINTS.length,
      archivedResolved: true,
      archivedGeneratable: false,
    });
  });
});

describe("latitude_south_hemisphere", () => {
  // Les pays à cheval sur l'équateur sont tranchés sur la MAJORITÉ DE LA
  // SUPERFICIE TERRESTRE (cf. countryPatches). La latitude de world-countries est
  // arrondie au degré : ces 13 cas sont les seuls que l'arrondi peut faire
  // basculer, et une régénération qui perdrait un patch se verrait ici (COD est
  // le fix RDC ebbea1f). La dérivation lit `content/constraints/latitude_south_hemisphere`.
  const EQUATOR_CROSSERS: ReadonlyArray<[string, boolean]> = [
    ["BRA", true],
    ["IDN", true],
    ["ECU", true],
    ["COG", true],
    ["GAB", true],
    ["COD", true],
    ["KEN", false],
    ["STP", false],
    ["UGA", false],
    ["KIR", false],
    ["MDV", false],
    ["COL", false],
    ["SOM", false],
  ];

  it("classe chaque pays à cheval sur l'équateur du côté de sa majorité de superficie", () => {
    const actual = EQUATOR_CROSSERS.map(
      ([iso3]) =>
        [iso3, matchesConstraint("latitude_south_hemisphere", iso3)] as const,
    );
    expect(actual).toEqual(EQUATOR_CROSSERS);
  });
});
