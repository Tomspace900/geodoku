import { describe, expect, test } from "vitest";
import {
  inferSimulationTarget,
  parseSimulationArgs,
} from "../simulate-players-cli";

describe("parseSimulationArgs", () => {
  test("reste en dry-run tant que --execute n'est pas explicite", () => {
    expect(parseSimulationArgs([]).dryRun).toBe(true);
    expect(parseSimulationArgs(["--execute"]).dryRun).toBe(false);
  });

  test("rejette deux modes d'exécution contradictoires", () => {
    expect(() => parseSimulationArgs(["--dry-run", "--execute"])).toThrow(
      "Choisir soit --dry-run, soit --execute",
    );
  });

  test("accepte les syntaxes documentées avec espace et signe égal", () => {
    expect(
      parseSimulationArgs([
        "--count",
        "3",
        "--lives=0",
        "--filled",
        "4",
        "--end=lives",
        "--seed",
        "42",
        "--dry-run",
      ]),
    ).toEqual({
      count: 3,
      lives: 0,
      filled: 4,
      end: "lives",
      seed: 42,
      dryRun: true,
      force: false,
      help: false,
    });
  });

  test("rejette une option inconnue", () => {
    expect(() => parseSimulationArgs(["--cont", "3"])).toThrow(
      "Option inconnue : --cont",
    );
  });

  test("rejette un entier partiellement valide", () => {
    expect(() => parseSimulationArgs(["--count=3joueurs"])).toThrow(
      "--count doit être un entier",
    );
  });

  test("rejette une valeur hors des bornes métier", () => {
    expect(() => parseSimulationArgs(["--lives", "6"])).toThrow(
      "--lives doit être un entier entre 0 et 5",
    );
  });
});

describe("inferSimulationTarget", () => {
  test("construit une victoire explicite cohérente", () => {
    const args = parseSimulationArgs([
      "--end",
      "win",
      "--filled",
      "9",
      "--lives",
      "4",
    ]);

    expect(inferSimulationTarget(args)).toEqual({
      endReason: "win",
      filledCells: 9,
      livesLeft: 4,
    });
  });

  test("rejette une victoire avec une grille incomplète", () => {
    const args = parseSimulationArgs(["--end=win", "--filled=8"]);

    expect(() => inferSimulationTarget(args)).toThrow(
      "Une victoire exige --filled=9",
    );
  });

  test("rejette un blocage partiellement configuré", () => {
    const args = parseSimulationArgs(["--end=blocked", "--filled=4"]);

    expect(() => inferSimulationTarget(args)).toThrow(
      "Un blocage explicite exige --filled et --lives ensemble",
    );
  });
});
