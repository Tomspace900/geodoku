import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "../_generated/api";
import { CELL_KEYS } from "../cellKeys";
import { offsetUTC, todayUTC, tomorrowUTC } from "../lib/dates";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");
const ACTIVE_GENERATION = "active-generation";
const ACTIVE_ROWS = ["continent_europe", "continent_asia", "continent_africa"];
const ACTIVE_COLS = ["language_english", "water_landlocked", "flag_has_star"];
const DISTINCT_COUNTRIES = [
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

type GridContent = {
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
};

function currentGridContent(): GridContent {
  return {
    rows: [...ACTIVE_ROWS],
    cols: [...ACTIVE_COLS],
    validAnswers: Object.fromEntries(
      CELL_KEYS.map((key, index) => [key, [DISTINCT_COUNTRIES[index]]]),
    ),
  };
}

function poolGrid(content: GridContent) {
  return {
    ...content,
    metadata: {
      seedConstraint: content.rows[0],
      constraintIds: [...content.rows, ...content.cols],
      categories: ["continent", "language", "water_access", "flag"],
      avgCellSize: 1,
      minCellSize: 1,
      countryPool: [...DISTINCT_COUNTRIES],
    },
  };
}

describe("future grid content reconciliation", () => {
  it("replaces an incompatible future grid from the active pool", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("poolState", {
        key: "singleton",
        activeGenerationId: ACTIVE_GENERATION,
      });
    });
    const replacementId = await t.mutation(internal.gridData.insertPoolGrid, {
      generationId: ACTIVE_GENERATION,
      ...poolGrid(currentGridContent()),
    });
    const incompatible = currentGridContent();
    incompatible.rows[0] = "flag_two_colors";
    const previousId = await t.mutation(internal.gridData.insertPoolGrid, {
      generationId: "old-generation",
      ...poolGrid(incompatible),
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(previousId, {
        status: "used",
        usedAt: Date.now(),
        usedForDate: tomorrowUTC(),
      });
      await ctx.db.insert("grids", {
        date: tomorrowUTC(),
        rows: incompatible.rows,
        cols: incompatible.cols,
        countryPool: DISTINCT_COUNTRIES,
        candidateId: previousId,
      });
    });

    await t.action(internal.grids.reconcileFutureGridContent, {});

    const snapshot = await t.run(async (ctx) => {
      const future = await ctx.db
        .query("grids")
        .withIndex("by_date", (q) => q.eq("date", tomorrowUTC()))
        .unique();
      const previous = await ctx.db.get(previousId);
      const previousAnswers = await ctx.db
        .query("gridAnswers")
        .withIndex("by_candidate", (q) => q.eq("candidateId", previousId))
        .unique();
      return [future?.candidateId, previous, previousAnswers] as const;
    });
    expect(snapshot).toEqual([replacementId, null, null]);
  });

  it("preserves today, history, and snapshots still referenced by history", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("poolState", {
        key: "singleton",
        activeGenerationId: ACTIVE_GENERATION,
      });
    });
    const replacementId = await t.mutation(internal.gridData.insertPoolGrid, {
      generationId: ACTIVE_GENERATION,
      ...poolGrid(currentGridContent()),
    });
    const incompatible = currentGridContent();
    incompatible.rows[0] = "flag_two_colors";
    const sharedHistoricalId = await t.mutation(
      internal.gridData.insertPoolGrid,
      {
        generationId: "old-generation",
        ...poolGrid(incompatible),
      },
    );
    const todayCandidateId = await t.mutation(
      internal.gridData.insertPoolGrid,
      {
        generationId: "old-generation",
        ...poolGrid(incompatible),
      },
    );
    await t.run(async (ctx) => {
      await ctx.db.patch(sharedHistoricalId, {
        status: "used",
        usedAt: Date.now(),
        usedForDate: tomorrowUTC(),
      });
      await ctx.db.patch(todayCandidateId, {
        status: "used",
        usedAt: Date.now(),
        usedForDate: todayUTC(),
      });
      await ctx.db.insert("grids", {
        date: offsetUTC(-1),
        rows: incompatible.rows,
        cols: incompatible.cols,
        countryPool: DISTINCT_COUNTRIES,
        candidateId: sharedHistoricalId,
      });
      await ctx.db.insert("grids", {
        date: todayUTC(),
        rows: incompatible.rows,
        cols: incompatible.cols,
        countryPool: DISTINCT_COUNTRIES,
        candidateId: todayCandidateId,
      });
      await ctx.db.insert("grids", {
        date: tomorrowUTC(),
        rows: incompatible.rows,
        cols: incompatible.cols,
        countryPool: DISTINCT_COUNTRIES,
        candidateId: sharedHistoricalId,
      });
    });

    await t.action(internal.grids.reconcileFutureGridContent, {});

    const snapshot = await t.run(async (ctx) => {
      const grids = await ctx.db
        .query("grids")
        .withIndex("by_date", (q) => q.gte("date", offsetUTC(-1)))
        .order("asc")
        .take(3);
      const sharedCandidate = await ctx.db.get(sharedHistoricalId);
      const sharedAnswers = await ctx.db
        .query("gridAnswers")
        .withIndex("by_candidate", (q) =>
          q.eq("candidateId", sharedHistoricalId),
        )
        .unique();
      return [
        grids.map((grid) => [grid.date, grid.candidateId]),
        sharedCandidate !== null,
        sharedAnswers !== null,
      ] as const;
    });
    expect(snapshot).toEqual([
      [
        [offsetUTC(-1), sharedHistoricalId],
        [todayUTC(), todayCandidateId],
        [tomorrowUTC(), replacementId],
      ],
      true,
      true,
    ]);
  });

  it("leaves a compatible future grid untouched", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("poolState", {
        key: "singleton",
        activeGenerationId: ACTIVE_GENERATION,
      });
    });
    const replacementId = await t.mutation(internal.gridData.insertPoolGrid, {
      generationId: ACTIVE_GENERATION,
      ...poolGrid(currentGridContent()),
    });
    const compatible = currentGridContent();
    const scheduledId = await t.mutation(internal.gridData.insertPoolGrid, {
      generationId: "old-generation",
      ...poolGrid(compatible),
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(scheduledId, {
        status: "used",
        usedAt: Date.now(),
        usedForDate: tomorrowUTC(),
      });
      await ctx.db.insert("grids", {
        date: tomorrowUTC(),
        rows: compatible.rows,
        cols: compatible.cols,
        countryPool: DISTINCT_COUNTRIES,
        candidateId: scheduledId,
      });
    });

    const result = await t.action(
      internal.grids.reconcileFutureGridContent,
      {},
    );

    const snapshot = await t.run(async (ctx) => {
      const future = await ctx.db
        .query("grids")
        .withIndex("by_date", (q) => q.eq("date", tomorrowUTC()))
        .unique();
      const replacement = await ctx.db.get(replacementId);
      return [
        result.repaired,
        future?.candidateId,
        replacement?.status,
      ] as const;
    });
    expect(snapshot).toEqual([0, scheduledId, "available"]);
  });
});
