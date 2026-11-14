// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { daysAgoUTC, todayUTC, tomorrowUTC } from "./lib/dates";
import schema from "./schema";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./**/__tests__/**",
]);

const WIDE = ["FRA", "DEU", "ITA", "ESP", "PRT", "BEL", "NLD", "AUT", "CHE"];
const ANSWERS = { "0,0": WIDE, "0,1": ["DEU", "POL"] };

async function seedDay(
  backend: TestConvex<typeof schema>,
  date: string,
): Promise<void> {
  await backend.run(async (ctx) => {
    const candidateId = await ctx.db.insert("gridCandidates", {
      rows: ["row-0", "row-1", "row-2"],
      cols: ["col-0", "col-1", "col-2"],
      metadata: {
        seedConstraint: "row-0",
        constraintIds: ["row-0"],
        categories: ["continent"],
        avgCellSize: 2,
        minCellSize: 1,
        countryPool: WIDE,
      },
      status: "used",
    });
    await ctx.db.insert("gridAnswers", { candidateId, validAnswers: ANSWERS });
    await ctx.db.insert("grids", {
      date,
      rows: ["row-0", "row-1", "row-2"],
      cols: ["col-0", "col-1", "col-2"],
      countryPool: WIDE,
      candidateId,
    });
    await ctx.db.insert("cellStats", {
      date,
      cellKey: "0,0",
      counts: { FRA: 4, DEU: 1 },
    });
  });
}

describe("getFinishedDay", () => {
  it("renvoie la répartition finale d'un jour passé", async () => {
    const backend = convexTest(schema, modules);
    const date = daysAgoUTC(40);
    await seedDay(backend, date);
    const day = await backend.query(api.stats.getFinishedDay, { date });
    expect(day?.counts["0,0"]).toEqual({ FRA: 4, DEU: 1 });
  });

  it("ne renvoie que les réponses des cases qui peuvent se bloquer", async () => {
    const backend = convexTest(schema, modules);
    const date = daysAgoUTC(2);
    await seedDay(backend, date);
    const day = await backend.query(api.stats.getFinishedDay, { date });
    expect(day?.blockableAnswers).toEqual({ "0,1": ["DEU", "POL"] });
  });

  it("refuse la grille du jour", async () => {
    const backend = convexTest(schema, modules);
    await seedDay(backend, todayUTC());
    await expect(
      backend.query(api.stats.getFinishedDay, { date: todayUTC() }),
    ).rejects.toThrow("Date is not finished");
  });

  it("refuse une date future", async () => {
    const backend = convexTest(schema, modules);
    await seedDay(backend, tomorrowUTC());
    await expect(
      backend.query(api.stats.getFinishedDay, { date: tomorrowUTC() }),
    ).rejects.toThrow("Date is not finished");
  });

  it("compte les parties finies du jour dans l'histogramme, sans les imports ni les parties en cours", async () => {
    const backend = convexTest(schema, modules);
    const date = daysAgoUTC(4);
    await seedDay(backend, date);
    const nineNulls = Array.from({ length: 9 }, () => null);
    const lost = [5, 0, 0, 0, 0, 0, 0, 0, 0];
    await backend.run(async (ctx) => {
      await ctx.db.insert("games", {
        date,
        owner: { kind: "anon", tokenHash: "fini" },
        cells: nineNulls,
        failed: lost,
        origin: "live",
      });
      await ctx.db.insert("games", {
        date,
        owner: { kind: "user", userId: "importe" },
        cells: nineNulls,
        failed: lost,
        origin: "import",
      });
      await ctx.db.insert("games", {
        date,
        owner: { kind: "anon", tokenHash: "en-cours" },
        cells: nineNulls,
        failed: [1, 0, 0, 0, 0, 0, 0, 0, 0],
        origin: "live",
      });
    });
    const day = await backend.query(api.stats.getFinishedDay, { date });
    expect([
      day?.histogram[0],
      day?.histogram.reduce((sum, n) => sum + n, 0),
    ]).toEqual([1, 1]);
  });

  it("renvoie null pour un jour sans grille", async () => {
    const backend = convexTest(schema, modules);
    const day = await backend.query(api.stats.getFinishedDay, {
      date: daysAgoUTC(3),
    });
    expect(day).toBeNull();
  });
});
