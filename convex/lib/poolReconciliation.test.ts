import { describe, expect, it } from "vitest";
import {
  type PoolReconciliationDependencies,
  isPoolGenerationActive,
  runPoolReconciliation,
} from "./poolReconciliation";

type Grid = { id: string };
type Report = { totalGenerated: number };

function baseDependencies(
  overrides: Partial<PoolReconciliationDependencies<Grid, Report>> = {},
): PoolReconciliationDependencies<Grid, Report> {
  return {
    claim: async () => ({
      acquired: true,
      previousActiveGenerationId: null,
    }),
    generate: async () => ({
      grids: [{ id: "a" }, { id: "b" }],
      report: { totalGenerated: 2 },
    }),
    validate: () => true,
    insert: async () => undefined,
    activate: async () => undefined,
    cleanup: async () => undefined,
    release: async () => undefined,
    reconcileFutureGrids: async () => undefined,
    ensureDailyGrids: async () => undefined,
    ...overrides,
  };
}

describe("runPoolReconciliation", () => {
  it("generates once then immediately assigns today and tomorrow", async () => {
    let generations = 0;
    let assignments = 0;
    let activeGenerationId: string | null = null;
    const events: string[] = [];
    const dependencies = baseDependencies({
      generate: async () => {
        generations++;
        events.push("generated");
        return {
          grids: [{ id: "a" }, { id: "b" }],
          report: { totalGenerated: 2 },
        };
      },
      insert: async (generationId, grid) => {
        events.push(`inserted:${generationId}:${grid.id}`);
      },
      activate: async (generationId) => {
        activeGenerationId = generationId;
        events.push("activated");
      },
      cleanup: async () => {
        events.push("cleaned");
      },
      reconcileFutureGrids: async () => {
        events.push("content-reconciled");
      },
      ensureDailyGrids: async () => {
        assignments += 2;
        events.push("scheduled");
      },
    });

    const result = await runPoolReconciliation(dependencies, {
      force: false,
      jobId: "generation-1",
    });

    expect(result.kind).toBe("generated");
    expect(generations).toBe(1);
    expect(assignments).toBe(2);
    expect(activeGenerationId).toBe("generation-1");
    expect(events).toEqual([
      "generated",
      "inserted:generation-1:a",
      "inserted:generation-1:b",
      "activated",
      "cleaned",
      "scheduled",
      "content-reconciled",
    ]);
  });

  it("does nothing while another generation owns the lease", async () => {
    let generated = false;
    const dependencies = baseDependencies({
      claim: async () => ({ acquired: false, reason: "leased" }),
      generate: async () => {
        generated = true;
        return { grids: [], report: { totalGenerated: 0 } };
      },
    });

    const result = await runPoolReconciliation(dependencies, {
      force: false,
      jobId: "generation-2",
    });

    expect(result).toEqual({ kind: "skipped", reason: "leased" });
    expect(generated).toBe(false);
  });

  it("does not generate when the legacy pool requires an explicit migration", async () => {
    let generated = false;
    const dependencies = baseDependencies({
      claim: async () => ({
        acquired: false,
        reason: "legacy_migration_required",
      }),
      generate: async () => {
        generated = true;
        return { grids: [], report: { totalGenerated: 0 } };
      },
    });

    const result = await runPoolReconciliation(dependencies, {
      force: false,
      jobId: "automatic-refill",
    });

    expect({ result, generated }).toEqual({
      result: { kind: "skipped", reason: "legacy_migration_required" },
      generated: false,
    });
  });

  it("keeps the active generation when the inactive build is interrupted", async () => {
    let activeGenerationId = "stable-generation";
    let inserted = 0;
    let released = false;
    let scheduled = false;
    const cleaned: Array<string | null> = [];
    const dependencies = baseDependencies({
      claim: async () => ({
        acquired: true,
        previousActiveGenerationId: activeGenerationId,
      }),
      insert: async () => {
        inserted++;
        if (inserted === 2) throw new Error("interrupted");
      },
      activate: async (generationId) => {
        activeGenerationId = generationId;
      },
      release: async () => {
        released = true;
      },
      cleanup: async (generationId) => {
        cleaned.push(generationId);
      },
      ensureDailyGrids: async () => {
        scheduled = true;
      },
    });

    await expect(
      runPoolReconciliation(dependencies, {
        force: false,
        jobId: "interrupted-generation",
      }),
    ).rejects.toThrow("interrupted");
    expect(activeGenerationId).toBe("stable-generation");
    expect(released).toBe(true);
    expect(cleaned).toEqual(["interrupted-generation"]);
    expect(scheduled).toBe(false);
  });

  it("keeps the activated pool committed when future reconciliation fails", async () => {
    let activated = false;
    let scheduled = false;
    const dependencies = baseDependencies({
      activate: async () => {
        activated = true;
      },
      reconcileFutureGrids: async () => {
        throw new Error("future reconciliation failed");
      },
      ensureDailyGrids: async () => {
        scheduled = true;
      },
    });

    const result = await runPoolReconciliation(dependencies, {
      force: false,
      jobId: "generation-with-bad-future",
    });

    expect({ activated, scheduled, result }).toEqual({
      activated: true,
      scheduled: true,
      result: {
        kind: "generated",
        report: { totalGenerated: 2 },
        warnings: ["future_grid_reconciliation_failed"],
      },
    });
  });

  it("still reconciles future grids when immediate scheduling fails", async () => {
    let activated = false;
    let futureReconciled = false;
    const dependencies = baseDependencies({
      activate: async () => {
        activated = true;
      },
      ensureDailyGrids: async () => {
        throw new Error("scheduling failed");
      },
      reconcileFutureGrids: async () => {
        futureReconciled = true;
      },
    });

    const result = await runPoolReconciliation(dependencies, {
      force: false,
      jobId: "generation-with-bad-scheduling",
    });

    expect({ activated, futureReconciled, result }).toEqual({
      activated: true,
      futureReconciled: true,
      result: {
        kind: "generated",
        report: { totalGenerated: 2 },
        warnings: ["ensure_daily_grids_failed"],
      },
    });
  });
});

describe("isPoolGenerationActive", () => {
  it("keeps only legacy candidates active while no pointer exists", () => {
    expect([
      isPoolGenerationActive(null, undefined),
      isPoolGenerationActive(null, "inactive-build"),
    ]).toEqual([true, false]);
  });

  it("keeps only the pointed generation active after activation", () => {
    expect([
      isPoolGenerationActive("active", "active"),
      isPoolGenerationActive("active", undefined),
      isPoolGenerationActive("active", "old"),
    ]).toEqual([true, false, false]);
  });
});
