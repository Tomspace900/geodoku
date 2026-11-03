// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import { CELL_KEYS } from "./cellKeys";
import { daysAgoUTC, todayUTC } from "./lib/dates";
import schema from "./schema";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./**/__tests__/**",
]);
const CLIENT_ID = "client-12345678";

function token(sequence: number): string {
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
}

function createBackend() {
  const backend = convexTest(schema, modules);
  rateLimiterTest.register(backend);
  return backend;
}

type Backend = ReturnType<typeof createBackend>;

/** Une réponse par case, toutes distinctes, plus DEU valable en 0,0. */
const ANSWERS: Record<string, string[]> = {
  "0,0": ["FRA", "DEU"],
  "0,1": ["ITA"],
  "0,2": ["ESP"],
  "1,0": ["PRT"],
  "1,1": ["BEL"],
  "1,2": ["NLD"],
  "2,0": ["AUT"],
  "2,1": ["CHE"],
  "2,2": ["POL"],
};

async function seedGrid(
  backend: Backend,
  date = todayUTC(),
  options: { includeAnswers?: boolean } = {},
): Promise<void> {
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
        countryPool: Object.values(ANSWERS).flat(),
      },
      status: "used",
      usedAt: Date.now(),
      usedForDate: date,
    });
    if (options.includeAnswers ?? true) {
      await ctx.db.insert("gridAnswers", {
        candidateId,
        validAnswers: ANSWERS,
      });
    }
    await ctx.db.insert("grids", {
      date,
      rows: ["row-0", "row-1", "row-2"],
      cols: ["col-0", "col-1", "col-2"],
      countryPool: Object.values(ANSWERS).flat(),
      candidateId,
    });
  });
}

function move(
  sequence: number,
  moveIndex: number,
  cellKey: (typeof CELL_KEYS)[number],
  countryCode: string,
  overrides: { date?: string; clientId?: string } = {},
) {
  return {
    date: overrides.date ?? todayUTC(),
    token: token(sequence),
    clientId: overrides.clientId ?? CLIENT_ID,
    moveIndex,
    cellKey,
    countryCode,
  };
}

async function readState(backend: Backend) {
  return await backend.run(async (ctx) => {
    const games = await ctx.db.query("games").take(10);
    const stats = await ctx.db.query("cellStats").take(10);
    return {
      games: games.map(({ cells, failed, rating }) => ({
        cells,
        failed,
        rating,
      })),
      counts: Object.fromEntries(stats.map((row) => [row.cellKey, row.counts])),
    };
  });
}

describe("playMove", () => {
  it("creates the game row on the first move and counts the country", async () => {
    const backend = createBackend();
    await seedGrid(backend);

    const result = await backend.mutation(
      api.games.playMove,
      move(1, 0, "0,0", "FRA"),
    );

    expect({ result, state: await readState(backend) }).toMatchObject({
      result: { kind: "applied", outcome: "success", count: 1, total: 1 },
      state: {
        games: [
          { cells: ["FRA", null, null, null, null, null, null, null, null] },
        ],
        counts: { "0,0": { FRA: 1 } },
      },
    });
  });

  it("never stores the token itself", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    await backend.mutation(api.games.playMove, move(1, 0, "0,0", "FRA"));

    const owner = await backend.run(
      async (ctx) => (await ctx.db.query("games").first())?.owner,
    );

    expect(JSON.stringify(owner)).not.toContain(token(1));
  });

  it("acknowledges a resent move without counting it twice", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    await backend.mutation(api.games.playMove, move(1, 0, "0,0", "FRA"));

    const resent = await backend.mutation(
      api.games.playMove,
      move(1, 0, "0,0", "FRA"),
    );

    expect({ resent, counts: (await readState(backend)).counts }).toEqual({
      resent: { kind: "duplicate" },
      counts: { "0,0": { FRA: 1 } },
    });
  });

  it("serializes concurrent copies of the same move into one", async () => {
    const backend = createBackend();
    await seedGrid(backend);

    const results = await Promise.all([
      backend.mutation(api.games.playMove, move(1, 0, "0,0", "FRA")),
      backend.mutation(api.games.playMove, move(1, 0, "0,0", "FRA")),
    ]);

    expect({
      kinds: results.map((r) => r.kind).sort(),
      counts: (await readState(backend)).counts,
    }).toEqual({
      kinds: ["applied", "duplicate"],
      counts: { "0,0": { FRA: 1 } },
    });
  });

  it("records a failed move on the game row only", async () => {
    const backend = createBackend();
    await seedGrid(backend);

    const result = await backend.mutation(
      api.games.playMove,
      move(1, 0, "0,1", "FRA"),
    );

    expect({ result, state: await readState(backend) }).toEqual({
      result: { kind: "applied", outcome: "failure" },
      state: {
        games: [
          {
            cells: Array.from({ length: 9 }, () => null),
            failed: [0, 1, 0, 0, 0, 0, 0, 0, 0],
            rating: undefined,
          },
        ],
        counts: {},
      },
    });
  });

  it("refuses a move ahead of the next expected index", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    await backend.mutation(api.games.playMove, move(1, 0, "0,0", "FRA"));

    expect(
      await backend.mutation(api.games.playMove, move(1, 2, "0,1", "ITA")),
    ).toEqual({ kind: "rejected", reason: "out_of_order" });
  });

  it("refuses a later move of a game the server never saw", async () => {
    const backend = createBackend();
    await seedGrid(backend);

    expect(
      await backend.mutation(api.games.playMove, move(1, 3, "0,1", "ITA")),
    ).toEqual({ kind: "rejected", reason: "unknown_game" });
  });

  it("refuses a new move addressed to another day without writing", async () => {
    const backend = createBackend();
    await seedGrid(backend);

    const result = await backend.mutation(
      api.games.playMove,
      move(1, 0, "0,0", "FRA", { date: daysAgoUTC(1) }),
    );

    expect({ result, state: await readState(backend) }).toEqual({
      result: { kind: "rejected", reason: "date_mismatch" },
      state: { games: [], counts: {} },
    });
  });

  it("acknowledges a move counted yesterday when resent after midnight", async () => {
    const backend = createBackend();
    const yesterday = daysAgoUTC(1);
    await seedGrid(backend);
    await backend.mutation(api.games.playMove, move(2, 0, "0,0", "FRA"));
    // La partie a été jouée hier : on recule la date de sa ligne.
    await backend.run(async (ctx) => {
      const game = await ctx.db.query("games").first();
      if (game) await ctx.db.patch(game._id, { date: yesterday });
    });

    expect(
      await backend.mutation(
        api.games.playMove,
        move(2, 0, "0,0", "FRA", { date: yesterday }),
      ),
    ).toEqual({ kind: "duplicate" });
  });

  it("refuses any move once the lives are spent", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    for (let index = 0; index < 5; index++) {
      await backend.mutation(api.games.playMove, move(1, index, "0,1", "FRA"));
    }

    expect(
      await backend.mutation(api.games.playMove, move(1, 5, "0,0", "FRA")),
    ).toEqual({ kind: "rejected", reason: "game_over" });
  });

  it("limits game creation per browser and counts the refusal", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    await backend.mutation(api.games.playMove, move(1, 0, "0,0", "FRA"));

    const second = await backend.mutation(
      api.games.playMove,
      move(2, 0, "0,0", "DEU"),
    );
    const refusals = await backend.run(
      async (ctx) =>
        (await ctx.db.query("healthCounters").first())?.rateLimited,
    );

    expect({ second, refusals }).toEqual({
      second: { kind: "rejected", reason: "rate_limited" },
      refusals: 1,
    });
  });

  it("fails loudly when today's grid is absent", async () => {
    const backend = createBackend();

    await expect(
      backend.mutation(api.games.playMove, move(1, 0, "0,0", "FRA")),
    ).rejects.toThrow("Grid unavailable");
  });

  it("fails loudly when the answer satellite is absent", async () => {
    const backend = createBackend();
    await seedGrid(backend, todayUTC(), { includeAnswers: false });

    await expect(
      backend.mutation(api.games.playMove, move(1, 0, "0,0", "FRA")),
    ).rejects.toThrow("Grid answers unavailable");
  });
});

describe("rateTodayGame", () => {
  it("keeps the first rating of the game", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    await backend.mutation(api.games.playMove, move(1, 0, "0,0", "FRA"));
    const args = { date: todayUTC(), token: token(1) };

    await backend.mutation(api.games.rateTodayGame, {
      ...args,
      rating: "balanced",
    });
    await backend.mutation(api.games.rateTodayGame, {
      ...args,
      rating: "too_hard",
    });

    expect((await readState(backend)).games[0].rating).toBe("balanced");
  });

  it("refuses a rating for a game the server never saw", async () => {
    const backend = createBackend();
    await seedGrid(backend);

    expect(
      await backend.mutation(api.games.rateTodayGame, {
        date: todayUTC(),
        token: token(9),
        rating: "balanced",
      }),
    ).toEqual({ kind: "rejected", reason: "unknown_game" });
  });
});

describe("cohort reads", () => {
  async function seedFinishedGames(backend: Backend, date: string) {
    await backend.run(async (ctx) => {
      const insert = (cells: (string | null)[], failed: number[]) =>
        ctx.db.insert("games", {
          date,
          owner: { kind: "anon", tokenHash: `hash-${failed.join("")}` },
          cells,
          failed,
          origin: "live",
        });
      const full = [
        "FRA",
        "ITA",
        "ESP",
        "PRT",
        "BEL",
        "NLD",
        "AUT",
        "CHE",
        "POL",
      ];
      await insert(full, [1, 0, 0, 0, 0, 0, 0, 0, 0]);
      await insert(full, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
      // En cours : hors cohorte.
      await insert([null, ...full.slice(1)], [0, 0, 0, 0, 0, 0, 0, 0, 2]);
      await Promise.all(
        CELL_KEYS.map((cellKey, index) =>
          ctx.db.insert("cellStats", {
            date,
            cellKey,
            counts: { [full[index]]: index === 0 ? 2 : 3 },
          }),
        ),
      );
    });
  }

  it("scores only the finished games of today", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    await seedFinishedGames(backend, todayUTC());

    const cohort = await backend.query(api.games.getTodayCohort, {});

    expect({
      finished: cohort?.histogram.reduce((a, b) => a + b, 0),
      failedPlayers: cohort?.failedPlayers,
    }).toEqual({ finished: 2, failedPlayers: [1, 0, 0, 0, 0, 0, 0, 0, 0] });
  });

  it("gives a past grid its frozen counts and failures", async () => {
    const backend = createBackend();
    const date = daysAgoUTC(2);
    await seedGrid(backend, date);
    await seedFinishedGames(backend, date);

    const stats = await backend.query(api.games.getReplayStats, { date });

    expect({
      finishedGames: stats?.finishedGames,
      firstCell: stats?.counts["0,0"],
      failedPlayers: stats?.failedPlayers[0],
    }).toEqual({ finishedGames: 2, firstCell: { FRA: 2 }, failedPlayers: 1 });
  });

  it("refuses today's grid as a replay", async () => {
    const backend = createBackend();
    await seedGrid(backend);

    await expect(
      backend.query(api.games.getReplayStats, { date: todayUTC() }),
    ).rejects.toThrow("Date is not replayable");
  });
});

describe("server health", () => {
  it("reports the largest increase of a country since the last sample", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    await backend.run(async (ctx) => {
      await ctx.db.insert("cellStats", {
        date: todayUTC(),
        cellKey: "0,0",
        counts: { FRA: 7, DEU: 2 },
      });
    });

    const first = await backend.mutation(internal.health.takeHealthSample, {});
    const second = await backend.mutation(internal.health.takeHealthSample, {});

    expect([first.maxCountryIncrease, second.maxCountryIncrease]).toEqual([
      7, 0,
    ]);
  });
});
