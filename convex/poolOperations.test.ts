import { describe, expect, it } from "vitest";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { CELL_KEYS } from "./cellKeys";
import {
  isGeneratedPoolValid,
  reconcileFutureGridContentImpl,
} from "./poolOperations";

const ROWS = ["continent_europe", "continent_asia", "continent_africa"];
const COLS = ["language_english", "water_landlocked", "flag_has_star"];
const COUNTRIES = [
  "FRA",
  "DEU",
  "ITA",
  "ESP",
  "PRT",
  "BEL",
  "NLD",
  "AUT",
  "POL",
];

function validAnswers(): Record<string, string[]> {
  return Object.fromEntries(
    CELL_KEYS.map((key, index) => [key, [COUNTRIES[index]]]),
  );
}

function grid(answers = validAnswers()) {
  return {
    rows: [...ROWS],
    cols: [...COLS],
    validAnswers: answers,
    metadata: {
      seedConstraint: ROWS[0],
      constraintIds: [...ROWS, ...COLS],
      categories: ["continent", "language", "water_access", "flag"],
      avgCellSize: 1,
      minCellSize: 1,
      countryPool: [...COUNTRIES],
    },
  };
}

function generationWithAnswers(answers: Record<string, string[]>) {
  const grids = Array.from({ length: 50 }, () => grid(answers));
  return {
    grids,
    report: {
      seed: 1,
      totalGenerated: grids.length,
      seedResults: [],
      constraintCoverage: 1,
      countryCoverage: COUNTRIES.length,
      durationMs: 1,
    },
  };
}

describe("isGeneratedPoolValid", () => {
  it("accepts a complete generation with a perfect nine-country matching", () => {
    expect(isGeneratedPoolValid(generationWithAnswers(validAnswers()))).toBe(
      true,
    );
  });

  it("rejects nine answer entries that are not the canonical cell keys", () => {
    const answers = Object.fromEntries(
      Object.entries(validAnswers()).filter(([cellKey]) => cellKey !== "0,0"),
    );
    answers.unknown = ["FRA"];

    expect(isGeneratedPoolValid(generationWithAnswers(answers))).toBe(false);
  });

  it("rejects an empty cell answer set", () => {
    const answers = validAnswers();
    answers["0,0"] = [];

    expect(isGeneratedPoolValid(generationWithAnswers(answers))).toBe(false);
  });

  it("rejects a generation without nine distinct assignable countries", () => {
    const answers = Object.fromEntries(CELL_KEYS.map((key) => [key, ["FRA"]]));

    expect(isGeneratedPoolValid(generationWithAnswers(answers))).toBe(false);
  });
});

describe("reconcileFutureGridContentImpl", () => {
  it("uses one pagination cutoff and skips snapshots that become current", async () => {
    const afterDates: string[] = [];
    const replacedDates: string[] = [];
    let page = 0;
    const snapshots = ["2026-07-15", "2026-07-16"].map((date, index) => ({
      date,
      candidateId: `candidate-${index}` as Id<"gridCandidates">,
      rows: ["archived-constraint", ...ROWS.slice(1)],
      cols: [...COLS],
      validAnswers: validAnswers(),
    }));
    const ctx = {
      runQuery: async (
        _reference: unknown,
        args: {
          afterDate: string;
          paginationOpts: { cursor: string | null };
        },
      ) => {
        afterDates.push(args.afterDate);
        const currentPage = page++;
        return {
          page: [snapshots[currentPage]],
          isDone: currentPage === 1,
          continueCursor: currentPage === 0 ? "next" : "done",
        };
      },
      runMutation: async (
        _reference: unknown,
        args: { date: string; expectedCandidateId: Id<"gridCandidates"> },
      ) => {
        replacedDates.push(args.date);
        return { kind: "replaced" as const };
      },
    } as unknown as ActionCtx;
    const dates = [
      "2026-07-14",
      "2026-07-14",
      "2026-07-15",
      "2026-07-15",
      "2026-07-15",
    ];
    let dateRead = 0;
    const currentDate = () => dates[dateRead++] ?? "2026-07-15";

    const result = await reconcileFutureGridContentImpl(ctx, currentDate);

    expect({ afterDates, replacedDates, result }).toEqual({
      afterDates: ["2026-07-14", "2026-07-14"],
      replacedDates: ["2026-07-16"],
      result: {
        checked: 2,
        repaired: 1,
        issues: { constraint: 1, country: 0, matching: 0 },
      },
    });
  });
});
