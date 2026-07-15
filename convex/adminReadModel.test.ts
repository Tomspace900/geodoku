// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { type TestConvex, convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { CONSTRAINTS } from "../src/features/game/logic/constraints";
import { readGridCellMetrics, readPoolStats } from "./adminReadModel";
import { CELL_KEYS } from "./cellKeys";
import schema from "./schema";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./**/__tests__/**",
]);
const DATE = "2026-07-01";

function candidateMetadata(options: {
  constraintId: string;
  countryCode: string;
}) {
  return {
    seedConstraint: options.constraintId,
    constraintIds: [options.constraintId],
    categories: ["geography"],
    avgCellSize: 2,
    minCellSize: 1,
    countryPool: [options.countryCode],
  };
}

async function seedObservedGrid(
  backend: TestConvex<typeof schema>,
): Promise<void> {
  await backend.run(async (ctx) => {
    const candidateId = await ctx.db.insert("gridCandidates", {
      rows: ["row-0", "row-1", "row-2"],
      cols: ["col-0", "col-1", "col-2"],
      metadata: candidateMetadata({
        constraintId: CONSTRAINTS[0].id,
        countryCode: "FRA",
      }),
      status: "used",
    });
    await ctx.db.insert("gridAnswers", {
      candidateId,
      validAnswers: {
        "0,0": ["FRA", "DEU", "BEL"],
        "0,1": ["ESP"],
      },
    });
    await ctx.db.insert("grids", {
      date: DATE,
      rows: ["row-0", "row-1", "row-2"],
      cols: ["col-0", "col-1", "col-2"],
      countryPool: ["FRA", "DEU", "BEL", "ESP"],
      candidateId,
    });
    await Promise.all([
      ctx.db.insert("dailyStats", {
        date: DATE,
        cellKey: "0,0",
        totalGuesses: 10,
        failedAttempts: 2,
      }),
      ctx.db.insert("dailyStats", {
        date: DATE,
        cellKey: "0,1",
        totalGuesses: 4,
        failedAttempts: 1,
      }),
      ctx.db.insert("guesses", {
        date: DATE,
        cellKey: "0,0",
        countryCode: "FRA",
        count: 6,
        isReplay: false,
      }),
      ctx.db.insert("guesses", {
        date: DATE,
        cellKey: "0,0",
        countryCode: "DEU",
        count: 3,
        isReplay: false,
      }),
      ctx.db.insert("guesses", {
        date: DATE,
        cellKey: "0,0",
        countryCode: "BEL",
        count: 1,
        isReplay: false,
      }),
      ctx.db.insert("guesses", {
        date: DATE,
        cellKey: "0,0",
        countryCode: "ESP",
        count: 99,
        isReplay: true,
      }),
      ctx.db.insert("guesses", {
        date: DATE,
        cellKey: "0,1",
        countryCode: "ESP",
        count: 4,
        isReplay: false,
      }),
      ctx.db.insert("guesses", {
        date: DATE,
        cellKey: "9,9",
        countryCode: "FRA",
        count: 100,
        isReplay: false,
      }),
      ctx.db.insert("gridFeedback", {
        date: DATE,
        tooEasyCount: 0,
        balancedCount: 0,
        tooHardCount: 0,
        totalRatings: 0,
        wins: 3,
        losses: 2,
        totalLivesLeft: 8,
        totalFilledCells: 35,
        totalGuessesSubmitted: 45,
      }),
    ]);
  });
}

describe("admin read model", () => {
  it("groups the two date ranges into the nine cell metrics", async () => {
    const backend = convexTest(schema, modules);
    await seedObservedGrid(backend);

    const metrics = await backend.run(async (ctx) => {
      return await readGridCellMetrics(ctx, DATE);
    });

    expect({
      summary: metrics && {
        gamesFinished: metrics.gamesFinished,
        playersEngaged: metrics.playersEngaged,
        wins: metrics.wins,
        losses: metrics.losses,
        cellCount: Object.keys(metrics.cells).length,
      },
      first: metrics?.cells["0,0"],
      second: metrics?.cells["0,1"],
      empty: metrics?.cells["2,2"],
    }).toEqual({
      summary: {
        gamesFinished: 5,
        playersEngaged: 10,
        wins: 3,
        losses: 2,
        cellCount: CELL_KEYS.length,
      },
      first: {
        totalGuesses: 10,
        distinctCountries: 3,
        validAnswersCount: 3,
        coverage: 1,
        fillRate: 1,
        observedDifficulty100: 0,
        topAnswers: [
          { countryCode: "FRA", count: 6, share: 0.6 },
          { countryCode: "DEU", count: 3, share: 0.3 },
          { countryCode: "BEL", count: 1, share: 0.1 },
        ],
        missingCountries: [],
        failedAttempts: 2,
        validAnswers: ["FRA", "DEU", "BEL"],
        picks: [
          { countryCode: "FRA", count: 6 },
          { countryCode: "DEU", count: 3 },
          { countryCode: "BEL", count: 1 },
        ],
      },
      second: {
        totalGuesses: 4,
        distinctCountries: 1,
        validAnswersCount: 1,
        coverage: 1,
        fillRate: 0.4,
        observedDifficulty100: 60,
        topAnswers: [{ countryCode: "ESP", count: 4, share: 1 }],
        missingCountries: [],
        failedAttempts: 1,
        validAnswers: ["ESP"],
        picks: [{ countryCode: "ESP", count: 4 }],
      },
      empty: {
        totalGuesses: 0,
        distinctCountries: 0,
        validAnswersCount: 0,
        coverage: 0,
        fillRate: 0,
        observedDifficulty100: 100,
        topAnswers: [],
        missingCountries: [],
        failedAttempts: 0,
        validAnswers: [],
        picks: [],
      },
    });
  });

  it("returns null when the scheduled grid does not exist", async () => {
    const backend = convexTest(schema, modules);

    const metrics = await backend.run(async (ctx) => {
      return await readGridCellMetrics(ctx, DATE);
    });

    expect(metrics).toBeNull();
  });

  it("reports only available candidates from the active pool", async () => {
    const backend = convexTest(schema, modules);
    await backend.run(async (ctx) => {
      await ctx.db.insert("poolState", {
        key: "singleton",
        activeGenerationId: "active-generation",
      });
      await ctx.db.insert("gridCandidates", {
        rows: ["a", "b", "c"],
        cols: ["d", "e", "f"],
        metadata: candidateMetadata({
          constraintId: CONSTRAINTS[0].id,
          countryCode: "FRA",
        }),
        status: "available",
        generationId: "active-generation",
      });
      await ctx.db.insert("gridCandidates", {
        rows: ["g", "h", "i"],
        cols: ["j", "k", "l"],
        metadata: candidateMetadata({
          constraintId: CONSTRAINTS[1].id,
          countryCode: "DEU",
        }),
        status: "used",
        generationId: "active-generation",
      });
    });

    const stats = await backend.run(async (ctx) => await readPoolStats(ctx));

    expect({
      keys: Object.keys(stats).sort(),
      available: stats.available,
      countries: stats.countryCoverage,
      firstConstraint: stats.constraintCoverage.find(
        ({ id }) => id === CONSTRAINTS[0].id,
      ),
      usedConstraint: stats.constraintCoverage.find(
        ({ id }) => id === CONSTRAINTS[1].id,
      ),
    }).toEqual({
      keys: ["available", "constraintCoverage", "countryCoverage"],
      available: 1,
      countries: [{ code: "FRA", gridsInPool: 1 }],
      firstConstraint: { id: CONSTRAINTS[0].id, gridsInPool: 1 },
      usedConstraint: { id: CONSTRAINTS[1].id, gridsInPool: 0 },
    });
  });
});
