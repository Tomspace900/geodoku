// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import { CELL_KEYS } from "./cellKeys";
import { offsetUTC, todayUTC } from "./lib/dates";
import schema from "./schema";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./**/__tests__/**",
]);
const CLIENT_ID = "client-12345678";

function operationId(sequence: number): string {
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
}

function createBackend() {
  const backend = convexTest(schema, modules);
  rateLimiterTest.register(backend);
  return backend;
}

async function seedTodayGrid(
  backend: ReturnType<typeof createBackend>,
  options: { includeAnswers?: boolean } = {},
): Promise<void> {
  const includeAnswers = options.includeAnswers ?? true;
  await backend.run(async (ctx) => {
    const candidateId = await ctx.db.insert("gridCandidates", {
      rows: ["row-0", "row-1", "row-2"],
      cols: ["col-0", "col-1", "col-2"],
      metadata: {
        seedConstraint: "row-0",
        constraintIds: ["row-0", "row-1", "row-2", "col-0", "col-1", "col-2"],
        categories: ["continent", "geography"],
        avgCellSize: 2,
        minCellSize: 1,
        countryPool: ["FRA", "DEU"],
      },
      status: "used",
      usedAt: Date.now(),
      usedForDate: todayUTC(),
    });
    if (includeAnswers) {
      await ctx.db.insert("gridAnswers", {
        candidateId,
        validAnswers: Object.fromEntries(
          CELL_KEYS.map((cellKey) => [cellKey, ["FRA"]]),
        ),
      });
    }
    await ctx.db.insert("grids", {
      date: todayUTC(),
      rows: ["row-0", "row-1", "row-2"],
      cols: ["col-0", "col-1", "col-2"],
      countryPool: ["FRA", "DEU"],
      candidateId,
    });
  });
}

async function guessState(backend: ReturnType<typeof createBackend>) {
  return await backend.run(async (ctx) => {
    const guesses = await ctx.db
      .query("guesses")
      .withIndex("by_date_and_cell", (q) =>
        q.eq("date", todayUTC()).eq("cellKey", "0,0"),
      )
      .take(10);
    const stats = await ctx.db
      .query("dailyStats")
      .withIndex("by_date_and_cell", (q) =>
        q.eq("date", todayUTC()).eq("cellKey", "0,0"),
      )
      .unique();
    const receipts = await ctx.db
      .query("operationReceipts")
      .withIndex("by_expires_at")
      .take(10);
    return {
      guesses: guesses.map(({ countryCode, count }) => ({
        countryCode,
        count,
      })),
      totalGuesses: stats?.totalGuesses ?? 0,
      failedAttempts: stats?.failedAttempts ?? 0,
      receiptCount: receipts.length,
    };
  });
}

describe("today guess writes", () => {
  it("returns the initial result and counts a sequential retry once", async () => {
    const backend = createBackend();
    await seedTodayGrid(backend);
    const args = {
      operationId: operationId(1),
      cellKey: "0,0" as const,
      countryCode: "FRA",
      clientId: CLIENT_ID,
    };

    const first = await backend.mutation(api.guesses.submitTodayGuess, args);
    const retry = await backend.mutation(api.guesses.submitTodayGuess, args);

    expect({ first, retry, state: await guessState(backend) }).toEqual({
      first: { kind: "accepted", count: 1, total: 1, rarity: 1 },
      retry: { kind: "accepted", count: 1, total: 1, rarity: 1 },
      state: {
        guesses: [{ countryCode: "FRA", count: 1 }],
        totalGuesses: 1,
        failedAttempts: 0,
        receiptCount: 1,
      },
    });
  });

  it("serializes concurrent retries into one accepted guess", async () => {
    const backend = createBackend();
    await seedTodayGrid(backend);
    const args = {
      operationId: operationId(2),
      cellKey: "0,0" as const,
      countryCode: "FRA",
      clientId: CLIENT_ID,
    };

    const results = await Promise.all([
      backend.mutation(api.guesses.submitTodayGuess, args),
      backend.mutation(api.guesses.submitTodayGuess, args),
    ]);

    expect({ results, state: await guessState(backend) }).toEqual({
      results: [
        { kind: "accepted", count: 1, total: 1, rarity: 1 },
        { kind: "accepted", count: 1, total: 1, rarity: 1 },
      ],
      state: {
        guesses: [{ countryCode: "FRA", count: 1 }],
        totalGuesses: 1,
        failedAttempts: 0,
        receiptCount: 1,
      },
    });
  });

  it("rejects reusing an operation id with another payload", async () => {
    const backend = createBackend();
    await seedTodayGrid(backend);
    const id = operationId(3);
    await backend.mutation(api.guesses.submitTodayGuess, {
      operationId: id,
      cellKey: "0,0",
      countryCode: "FRA",
      clientId: CLIENT_ID,
    });

    await expect(
      backend.mutation(api.guesses.submitTodayGuess, {
        operationId: id,
        cellKey: "0,1",
        countryCode: "FRA",
        clientId: CLIENT_ID,
      }),
    ).rejects.toThrow("operationId already used for another payload");
  });

  it("rejects reusing an operation id for another operation type", async () => {
    const backend = createBackend();
    await seedTodayGrid(backend);
    const id = operationId(4);
    await backend.mutation(api.guesses.submitTodayGuess, {
      operationId: id,
      cellKey: "0,0",
      countryCode: "FRA",
      clientId: CLIENT_ID,
    });

    await expect(
      backend.mutation(api.guesses.recordTodayFailedGuess, {
        operationId: id,
        cellKey: "0,0",
        countryCode: "DEU",
        clientId: CLIENT_ID,
      }),
    ).rejects.toThrow("operationId already used for another payload");
  });

  it("deduplicates a domain rejection without touching aggregates", async () => {
    const backend = createBackend();
    await seedTodayGrid(backend);
    const args = {
      operationId: operationId(5),
      cellKey: "0,0" as const,
      countryCode: "DEU",
      clientId: CLIENT_ID,
    };

    const first = await backend.mutation(api.guesses.submitTodayGuess, args);
    const retry = await backend.mutation(api.guesses.submitTodayGuess, args);

    expect({ first, retry, state: await guessState(backend) }).toEqual({
      first: { kind: "domain_rejected", reason: "invalid_guess" },
      retry: { kind: "domain_rejected", reason: "invalid_guess" },
      state: {
        guesses: [],
        totalGuesses: 0,
        failedAttempts: 0,
        receiptCount: 1,
      },
    });
  });

  it("rejects recording a snapshot answer as a failed guess", async () => {
    const backend = createBackend();
    await seedTodayGrid(backend);

    await expect(
      backend.mutation(api.guesses.recordTodayFailedGuess, {
        operationId: operationId(6),
        cellKey: "0,0",
        countryCode: "FRA",
        clientId: CLIENT_ID,
      }),
    ).rejects.toThrow("A valid answer cannot be recorded as failed");
  });

  it("deduplicates an invalid-country-for-cell failed attempt", async () => {
    const backend = createBackend();
    await seedTodayGrid(backend);
    const args = {
      operationId: operationId(7),
      cellKey: "0,0" as const,
      countryCode: "DEU",
      clientId: CLIENT_ID,
    };

    const first = await backend.mutation(
      api.guesses.recordTodayFailedGuess,
      args,
    );
    const retry = await backend.mutation(
      api.guesses.recordTodayFailedGuess,
      args,
    );

    expect({ first, retry, state: await guessState(backend) }).toEqual({
      first: { kind: "recorded" },
      retry: { kind: "recorded" },
      state: {
        guesses: [],
        totalGuesses: 0,
        failedAttempts: 1,
        receiptCount: 1,
      },
    });
  });

  it("serializes concurrent failed-attempt retries", async () => {
    const backend = createBackend();
    await seedTodayGrid(backend);
    const args = {
      operationId: operationId(15),
      cellKey: "0,0" as const,
      countryCode: "DEU",
      clientId: CLIENT_ID,
    };

    const results = await Promise.all([
      backend.mutation(api.guesses.recordTodayFailedGuess, args),
      backend.mutation(api.guesses.recordTodayFailedGuess, args),
    ]);

    expect({ results, state: await guessState(backend) }).toEqual({
      results: [{ kind: "recorded" }, { kind: "recorded" }],
      state: {
        guesses: [],
        totalGuesses: 0,
        failedAttempts: 1,
        receiptCount: 1,
      },
    });
  });
});

describe("today feedback writes", () => {
  it("deduplicates game completion aggregates", async () => {
    const backend = createBackend();
    await seedTodayGrid(backend);
    const args = {
      operationId: operationId(8),
      endReason: "win" as const,
      livesLeft: 3,
      filledCells: 9,
      guessesSubmitted: 11,
      clientId: CLIENT_ID,
    };

    const first = await backend.mutation(api.grids.recordTodayGameEnd, args);
    const retry = await backend.mutation(api.grids.recordTodayGameEnd, args);
    const state = await backend.run(async (ctx) => {
      const feedback = await ctx.db
        .query("gridFeedback")
        .withIndex("by_date", (q) => q.eq("date", todayUTC()))
        .unique();
      const receipts = await ctx.db
        .query("operationReceipts")
        .withIndex("by_expires_at")
        .take(10);
      return { feedback, receiptCount: receipts.length };
    });

    expect({ first, retry, state }).toMatchObject({
      first: { kind: "recorded" },
      retry: { kind: "recorded" },
      state: {
        feedback: {
          wins: 1,
          losses: 0,
          totalLivesLeft: 3,
          totalFilledCells: 9,
          totalGuessesSubmitted: 11,
        },
        receiptCount: 1,
      },
    });
  });

  it("rejects an inconsistent game completion total", async () => {
    const backend = createBackend();
    await seedTodayGrid(backend);

    await expect(
      backend.mutation(api.grids.recordTodayGameEnd, {
        operationId: operationId(9),
        endReason: "win",
        livesLeft: 3,
        filledCells: 9,
        guessesSubmitted: 9,
        clientId: CLIENT_ID,
      }),
    ).rejects.toThrow("Invalid guessesSubmitted");
  });

  it("serializes concurrent game-completion retries", async () => {
    const backend = createBackend();
    await seedTodayGrid(backend);
    const args = {
      operationId: operationId(16),
      endReason: "win" as const,
      livesLeft: 3,
      filledCells: 9,
      guessesSubmitted: 11,
      clientId: CLIENT_ID,
    };

    const results = await Promise.all([
      backend.mutation(api.grids.recordTodayGameEnd, args),
      backend.mutation(api.grids.recordTodayGameEnd, args),
    ]);
    const feedback = await backend.run(async (ctx) => {
      return await ctx.db
        .query("gridFeedback")
        .withIndex("by_date", (q) => q.eq("date", todayUTC()))
        .unique();
    });

    expect({ results, feedback }).toMatchObject({
      results: [{ kind: "recorded" }, { kind: "recorded" }],
      feedback: {
        wins: 1,
        losses: 0,
        totalLivesLeft: 3,
        totalFilledCells: 9,
        totalGuessesSubmitted: 11,
      },
    });
  });

  it("deduplicates difficulty feedback aggregates", async () => {
    const backend = createBackend();
    await seedTodayGrid(backend);
    const args = {
      operationId: operationId(10),
      rating: "balanced" as const,
      clientId: CLIENT_ID,
    };

    const first = await backend.mutation(
      api.grids.submitTodayGridFeedback,
      args,
    );
    const retry = await backend.mutation(
      api.grids.submitTodayGridFeedback,
      args,
    );
    const feedback = await backend.run(async (ctx) => {
      return await ctx.db
        .query("gridFeedback")
        .withIndex("by_date", (q) => q.eq("date", todayUTC()))
        .unique();
    });

    expect({ first, retry, feedback }).toMatchObject({
      first: { kind: "recorded" },
      retry: { kind: "recorded" },
      feedback: {
        balancedCount: 1,
        tooEasyCount: 0,
        tooHardCount: 0,
        totalRatings: 1,
      },
    });
  });

  it("serializes concurrent difficulty-feedback retries", async () => {
    const backend = createBackend();
    await seedTodayGrid(backend);
    const args = {
      operationId: operationId(17),
      rating: "balanced" as const,
      clientId: CLIENT_ID,
    };

    const results = await Promise.all([
      backend.mutation(api.grids.submitTodayGridFeedback, args),
      backend.mutation(api.grids.submitTodayGridFeedback, args),
    ]);
    const feedback = await backend.run(async (ctx) => {
      return await ctx.db
        .query("gridFeedback")
        .withIndex("by_date", (q) => q.eq("date", todayUTC()))
        .unique();
    });

    expect({ results, feedback }).toMatchObject({
      results: [{ kind: "recorded" }, { kind: "recorded" }],
      feedback: {
        balancedCount: 1,
        tooEasyCount: 0,
        tooHardCount: 0,
        totalRatings: 1,
      },
    });
  });
});

describe("write availability and retention", () => {
  it("rejects a today write when the grid is absent", async () => {
    const backend = createBackend();

    await expect(
      backend.mutation(api.guesses.submitTodayGuess, {
        operationId: operationId(11),
        cellKey: "0,0",
        countryCode: "FRA",
        clientId: CLIENT_ID,
      }),
    ).rejects.toThrow("Grid unavailable");
  });

  it("rejects a today write when the answer satellite is absent", async () => {
    const backend = createBackend();
    await seedTodayGrid(backend, { includeAnswers: false });

    await expect(
      backend.mutation(api.guesses.submitTodayGuess, {
        operationId: operationId(12),
        cellKey: "0,0",
        countryCode: "FRA",
        clientId: CLIENT_ID,
      }),
    ).rejects.toThrow("Grid answers unavailable");
  });

  it("purges only expired operation receipts", async () => {
    const backend = createBackend();
    await backend.run(async (ctx) => {
      await ctx.db.insert("operationReceipts", {
        operationId: operationId(13),
        operationType: "grid_feedback",
        date: todayUTC(),
        canonicalPayload: JSON.stringify({ rating: "balanced" }),
        result: { kind: "recorded" },
        expiresAt: Date.now() - 60_000,
      });
      await ctx.db.insert("operationReceipts", {
        operationId: operationId(14),
        operationType: "grid_feedback",
        date: todayUTC(),
        canonicalPayload: JSON.stringify({ rating: "too_easy" }),
        result: { kind: "recorded" },
        expiresAt: Date.now() + 60_000,
      });
    });

    const deleted = await backend.mutation(
      internal.crons.deleteExpiredOperationReceipts,
      {},
    );
    const remaining = await backend.run(async (ctx) => {
      return await ctx.db
        .query("operationReceipts")
        .withIndex("by_expires_at")
        .take(10);
    });

    expect({
      deleted,
      remaining: remaining.map((row) => row.operationId),
    }).toEqual({
      deleted: 1,
      remaining: [operationId(14)],
    });
  });
});
