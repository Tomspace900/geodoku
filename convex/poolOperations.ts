import { ConvexError, type ObjectType, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { CELL_KEYS } from "./cellKeys";
import { todayUTC } from "./lib/dates";
import {
  type FinalizedPoolGrid,
  type GenerationReport,
  POOL_LOW_THRESHOLD,
} from "./lib/gridConstants";
import {
  type GridContentIssue,
  getGridContentIssue,
} from "./lib/gridContentCompatibility";
import { generateDiversePool } from "./lib/gridGenerator";
import {
  type PoolGenerationClaim,
  type PoolPostActivationWarning,
  runPoolPostActivationTasks,
  runPoolReconciliation,
} from "./lib/poolReconciliation";

const FUTURE_CONTENT_PAGE_SIZE = 25;

export const reconcilePoolAndScheduleArgs = {
  force: v.optional(v.boolean()),
};

type ReconcilePoolAndScheduleArgs = ObjectType<
  typeof reconcilePoolAndScheduleArgs
>;

export type ReconcilePoolResult =
  | {
      kind: "skipped";
      reason: "healthy" | "leased" | "legacy_migration_required";
    }
  | {
      kind: "generated";
      report: GenerationReport;
      deletedAvailable: number;
      warnings: PoolPostActivationWarning[];
    };

export type PoolFinalizationResult = {
  warnings: PoolPostActivationWarning[];
};

type ScheduledGridContentSnapshot = {
  date: string;
  candidateId: Id<"gridCandidates">;
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
};

export type FutureGridContentReconciliation = {
  checked: number;
  repaired: number;
  issues: Record<GridContentIssue, number>;
};

/**
 * Contrôle puis remplace uniquement les grilles strictement futures. Toutes les
 * pages sont lues avant la première mutation pour stabiliser la pagination.
 */
export async function reconcileFutureGridContentImpl(
  ctx: ActionCtx,
  currentDate: () => string = todayUTC,
): Promise<FutureGridContentReconciliation> {
  const referenceDate = currentDate();
  const snapshots: ScheduledGridContentSnapshot[] = [];
  let cursor: string | null = null;
  let isDone = false;
  while (!isDone) {
    const result: {
      page: ScheduledGridContentSnapshot[];
      isDone: boolean;
      continueCursor: string;
    } = await ctx.runQuery(
      internal.gridData.paginateScheduledGridContentAfterDate,
      {
        afterDate: referenceDate,
        paginationOpts: { numItems: FUTURE_CONTENT_PAGE_SIZE, cursor },
      },
    );
    snapshots.push(...result.page);
    cursor = result.continueCursor;
    isDone = result.isDone;
  }

  const issues: Record<GridContentIssue, number> = {
    constraint: 0,
    country: 0,
    matching: 0,
  };
  let repaired = 0;
  for (const snapshot of snapshots) {
    // La lecture peut traverser minuit UTC. Une grille devenue celle du jour
    // depuis le snapshot n'est plus éligible à une réparation automatique.
    if (snapshot.date <= currentDate()) continue;
    const issue = getGridContentIssue(snapshot);
    if (!issue) continue;
    if (snapshot.date <= currentDate()) continue;
    issues[issue]++;
    const result = await ctx.runMutation(
      internal.scheduling.replaceFutureGridCandidate,
      {
        date: snapshot.date,
        expectedCandidateId: snapshot.candidateId,
      },
    );
    if (result.kind === "replaced") repaired++;
  }
  return { checked: snapshots.length, repaired, issues };
}

export function isGeneratedPoolValid(generation: {
  grids: FinalizedPoolGrid[];
  report: GenerationReport;
}): boolean {
  return (
    generation.grids.length === generation.report.totalGenerated &&
    generation.grids.length >= POOL_LOW_THRESHOLD &&
    generation.report.constraintCoverage === 1 &&
    generation.report.countryCoverage > 0 &&
    generation.grids.every((grid) => {
      const answerKeys = Object.keys(grid.validAnswers);
      return (
        answerKeys.length === CELL_KEYS.length &&
        CELL_KEYS.every(
          (cellKey) =>
            Object.hasOwn(grid.validAnswers, cellKey) &&
            grid.validAnswers[cellKey].length > 0,
        ) &&
        getGridContentIssue(grid) === null
      );
    })
  );
}

/**
 * Pipeline unique de génération : lease, construction inactive, validation,
 * activation atomique, nettoyage de l'ancien pool puis replanification immédiate.
 */
export async function reconcilePoolAndScheduleImpl(
  ctx: ActionCtx,
  options: { force: boolean; ensureAfterActivation?: boolean },
): Promise<ReconcilePoolResult> {
  const jobId = crypto.randomUUID();
  let deletedAvailable = 0;
  const result = await runPoolReconciliation<
    FinalizedPoolGrid,
    GenerationReport
  >(
    {
      claim: async (claimedJobId, force): Promise<PoolGenerationClaim> => {
        const claim = await ctx.runMutation(
          internal.gridData.claimPoolGeneration,
          { jobId: claimedJobId, force },
        );
        if (claim.acquired && force) {
          const previous = await ctx.runQuery(
            internal.gridData.getAvailablePoolGrids,
            {},
          );
          deletedAvailable = previous.length;
        }
        return claim;
      },
      generate: async () => generateDiversePool(),
      validate: isGeneratedPoolValid,
      insert: async (generationId, grid) => {
        await ctx.runMutation(internal.gridData.insertPoolGrid, {
          generationId,
          rows: grid.rows,
          cols: grid.cols,
          validAnswers: grid.validAnswers,
          metadata: grid.metadata,
        });
      },
      activate: async (generationId, expectedCount) => {
        await ctx.runMutation(internal.gridData.activatePoolGeneration, {
          jobId: generationId,
          expectedCount,
        });
      },
      cleanup: async (generationId) => {
        await ctx.runMutation(internal.gridData.deleteInactiveGenerationBatch, {
          generationId,
        });
      },
      release: async (generationId) => {
        await ctx.runMutation(internal.gridData.releasePoolGeneration, {
          jobId: generationId,
        });
      },
      reconcileFutureGrids: async () => {
        await reconcileFutureGridContentImpl(ctx);
      },
      ensureDailyGrids: async () => {
        if (options.ensureAfterActivation !== false) {
          await ctx.runMutation(internal.scheduling.ensureDailyGrids, {});
        }
      },
    },
    { force: options.force, jobId },
  );

  if (result.kind === "skipped") return result;
  return {
    kind: "generated",
    report: result.report,
    deletedAvailable,
    warnings: result.warnings,
  };
}

/** Génération forcée utilisée par le seed historique. */
export async function generatePoolImpl(
  ctx: ActionCtx,
): Promise<GenerationReport> {
  const result = await reconcilePoolAndScheduleImpl(ctx, {
    force: true,
    ensureAfterActivation: false,
  });
  if (result.kind === "skipped") {
    throw new ConvexError(`Pool generation skipped: ${result.reason}`);
  }
  return result.report;
}

/** Refresh admin : même pipeline, sans suppression préalable du pool actif. */
export async function refreshPoolImpl(ctx: ActionCtx): Promise<
  GenerationReport & {
    deletedAvailable: number;
    warnings: PoolPostActivationWarning[];
  }
> {
  const result = await reconcilePoolAndScheduleImpl(ctx, { force: true });
  if (result.kind === "skipped") {
    throw new ConvexError(`Pool refresh skipped: ${result.reason}`);
  }
  return {
    ...result.report,
    deletedAvailable: result.deletedAvailable,
    warnings: result.warnings,
  };
}

/** Rejoue uniquement les post-traitements d'un lot déjà activé. */
export async function retryPoolFinalizationImpl(
  ctx: ActionCtx,
): Promise<PoolFinalizationResult> {
  const warnings = await runPoolPostActivationTasks({
    ensureDailyGrids: async () => {
      await ctx.runMutation(internal.scheduling.ensureDailyGrids, {});
    },
    reconcileFutureGrids: async () => {
      await reconcileFutureGridContentImpl(ctx);
    },
  });
  return { warnings };
}

export async function reconcileFutureGridContentHandler(
  ctx: ActionCtx,
): Promise<FutureGridContentReconciliation> {
  return await reconcileFutureGridContentImpl(ctx);
}

export async function reconcilePoolAndScheduleHandler(
  ctx: ActionCtx,
  args: ReconcilePoolAndScheduleArgs,
): Promise<ReconcilePoolResult> {
  return await reconcilePoolAndScheduleImpl(ctx, {
    force: args.force ?? false,
  });
}

export async function autoRefillPoolHandler(
  ctx: ActionCtx,
): Promise<ReconcilePoolResult> {
  return await reconcilePoolAndScheduleImpl(ctx, { force: false });
}
