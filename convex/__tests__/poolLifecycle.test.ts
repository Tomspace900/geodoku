import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "../_generated/api";
import { CELL_KEYS } from "../cellKeys";
import { offsetUTC, todayUTC, tomorrowUTC } from "../lib/dates";
import { POOL_LOW_THRESHOLD } from "../lib/gridConstants";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

function poolGrid(index: number) {
  const rows = [`r${index}a`, `r${index}b`, `r${index}c`];
  const cols = [`c${index}a`, `c${index}b`, `c${index}c`];
  return {
    rows,
    cols,
    validAnswers: Object.fromEntries(
      CELL_KEYS.map((key) => [key, [`answer-${index}-${key}`]]),
    ),
    metadata: {
      seedConstraint: rows[0],
      constraintIds: [...rows, ...cols],
      categories: ["a", "b", "c", "d"],
      avgCellSize: 3,
      minCellSize: 3,
      countryPool: [`country-${index}`],
    },
  };
}

describe("pool lifecycle", () => {
  it("preserves a non-empty legacy pool during an automatic refill", async () => {
    const t = convexTest(schema, modules);
    const legacyId = await t.mutation(internal.gridData.insertPoolGrid, {
      ...poolGrid(0),
    });

    const claim = await t.mutation(internal.gridData.claimPoolGeneration, {
      jobId: "automatic-refill",
      force: false,
    });
    const snapshot = await t.run(async (ctx) => ({
      candidateIds: (await ctx.db.query("gridCandidates").collect()).map(
        (candidate) => candidate._id,
      ),
      poolState: await ctx.db.query("poolState").first(),
    }));

    expect({ claim, snapshot }).toEqual({
      claim: {
        acquired: false,
        reason: "legacy_migration_required",
      },
      snapshot: {
        candidateIds: [legacyId],
        poolState: null,
      },
    });
  });

  it("allows an explicit force refresh to start the first pointer migration", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.gridData.insertPoolGrid, {
      ...poolGrid(0),
    });

    const claim = await t.mutation(internal.gridData.claimPoolGeneration, {
      jobId: "explicit-admin-refresh",
      force: true,
    });

    expect(claim).toEqual({
      acquired: true,
      previousActiveGenerationId: null,
    });
  });

  it("allows an automatic refill to self-heal an empty legacy pool", async () => {
    const t = convexTest(schema, modules);

    const claim = await t.mutation(internal.gridData.claimPoolGeneration, {
      jobId: "automatic-empty-refill",
      force: false,
    });

    expect(claim).toEqual({
      acquired: true,
      previousActiveGenerationId: null,
    });
  });

  it("keeps legacy candidates active until the first pointer switch", async () => {
    const t = convexTest(schema, modules);
    const legacyId = await t.mutation(internal.gridData.insertPoolGrid, {
      ...poolGrid(0),
    });
    await t.mutation(internal.gridData.claimPoolGeneration, {
      jobId: "inactive-build",
      force: true,
    });
    await t.mutation(internal.gridData.insertPoolGrid, {
      generationId: "inactive-build",
      ...poolGrid(1),
    });

    const available = await t.query(
      internal.gridData.getAvailablePoolGrids,
      {},
    );
    expect(available.map((candidate) => candidate._id)).toEqual([legacyId]);
  });

  it("migrates a legacy pool atomically and cleans only available legacy candidates", async () => {
    const t = convexTest(schema, modules);
    const legacyAvailableId = await t.mutation(
      internal.gridData.insertPoolGrid,
      { ...poolGrid(0) },
    );
    const legacyUsedId = await t.mutation(internal.gridData.insertPoolGrid, {
      ...poolGrid(1),
    });
    await t.run(async (ctx) => {
      const historicalDate = offsetUTC(-1);
      await ctx.db.patch(legacyUsedId, {
        status: "used",
        usedAt: Date.now(),
        usedForDate: historicalDate,
      });
      const used = await ctx.db.get(legacyUsedId);
      if (!used) throw new Error("Missing legacy candidate");
      await ctx.db.insert("grids", {
        date: historicalDate,
        rows: used.rows,
        cols: used.cols,
        countryPool: used.metadata.countryPool,
        candidateId: used._id,
      });
    });

    const jobId = "explicit-legacy-migration";
    await t.mutation(internal.gridData.claimPoolGeneration, {
      jobId,
      force: true,
    });
    for (let index = 0; index < POOL_LOW_THRESHOLD; index++) {
      await t.mutation(internal.gridData.insertPoolGrid, {
        generationId: jobId,
        ...poolGrid(index + 10),
      });
    }
    const visibleBeforeActivation = await t.query(
      internal.gridData.getAvailablePoolGrids,
      {},
    );

    await t.mutation(internal.gridData.activatePoolGeneration, {
      jobId,
      expectedCount: POOL_LOW_THRESHOLD,
    });
    await t.mutation(internal.gridData.deleteInactiveGenerationBatch, {
      generationId: null,
    });

    const snapshot = await t.run(async (ctx) => {
      const state = await ctx.db.query("poolState").first();
      const active = await ctx.db
        .query("gridCandidates")
        .withIndex("by_generation_id_and_status", (q) =>
          q.eq("generationId", jobId).eq("status", "available"),
        )
        .take(POOL_LOW_THRESHOLD + 1);
      const legacyUsedAnswers = await ctx.db
        .query("gridAnswers")
        .withIndex("by_candidate", (q) => q.eq("candidateId", legacyUsedId))
        .unique();
      return {
        visibleBeforeActivation: visibleBeforeActivation.map(
          (candidate) => candidate._id,
        ),
        activeGenerationId: state?.activeGenerationId,
        leaseReleased:
          state?.jobId === undefined && state?.leaseUntil === undefined,
        activeAvailable: active.length,
        legacyAvailable: await ctx.db.get(legacyAvailableId),
        legacyUsed: await ctx.db.get(legacyUsedId),
        legacyUsedAnswers,
      };
    });

    expect(snapshot).toMatchObject({
      visibleBeforeActivation: [legacyAvailableId],
      activeGenerationId: jobId,
      leaseReleased: true,
      activeAvailable: POOL_LOW_THRESHOLD,
      legacyAvailable: null,
      legacyUsed: { _id: legacyUsedId, status: "used" },
      legacyUsedAnswers: { candidateId: legacyUsedId },
    });
  });

  it("keeps a live lease exclusive", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(internal.gridData.claimPoolGeneration, {
      jobId: "job-1",
      force: false,
    });
    const second = await t.mutation(internal.gridData.claimPoolGeneration, {
      jobId: "job-2",
      force: false,
    });

    expect([first.acquired, second]).toEqual([
      true,
      { acquired: false, reason: "leased" },
    ]);
  });

  it("activates one complete generation then assigns today and tomorrow", async () => {
    const t = convexTest(schema, modules);
    const jobId = "complete-generation";
    await t.mutation(internal.gridData.claimPoolGeneration, {
      jobId,
      force: false,
    });
    for (let index = 0; index < POOL_LOW_THRESHOLD; index++) {
      await t.mutation(internal.gridData.insertPoolGrid, {
        generationId: jobId,
        ...poolGrid(index),
      });
    }
    await t.mutation(internal.gridData.activatePoolGeneration, {
      jobId,
      expectedCount: POOL_LOW_THRESHOLD,
    });
    await t.mutation(internal.scheduling.ensureDailyGrids, {});

    const snapshot = await t.run(async (ctx) => {
      const state = await ctx.db.query("poolState").first();
      const grids = await ctx.db.query("grids").collect();
      const candidates = await Promise.all(
        grids.map((grid) => ctx.db.get(grid.candidateId)),
      );
      return {
        activeGenerationId: state?.activeGenerationId,
        dates: grids.map((grid) => grid.date).sort(),
        generations: new Set(
          candidates.map((candidate) => candidate?.generationId),
        ).size,
      };
    });

    expect(snapshot).toEqual({
      activeGenerationId: jobId,
      dates: [todayUTC(), tomorrowUTC()].sort(),
      generations: 1,
    });
  });

  it("keeps the previous pointer when activation sees an incomplete build", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("poolState", {
        key: "singleton",
        activeGenerationId: "stable-generation",
      });
    });
    await t.mutation(internal.gridData.claimPoolGeneration, {
      jobId: "partial-generation",
      force: true,
    });
    await t.mutation(internal.gridData.insertPoolGrid, {
      generationId: "partial-generation",
      ...poolGrid(0),
    });

    await expect(
      t.mutation(internal.gridData.activatePoolGeneration, {
        jobId: "partial-generation",
        expectedCount: POOL_LOW_THRESHOLD,
      }),
    ).rejects.toThrow("Generated pool is incomplete");
    const activeGenerationId = await t.run(async (ctx) => {
      return (await ctx.db.query("poolState").first())?.activeGenerationId;
    });
    expect(activeGenerationId).toBe("stable-generation");
  });
});
