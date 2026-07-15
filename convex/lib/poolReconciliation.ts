export type PoolGenerationClaim =
  | {
      acquired: false;
      reason: "healthy" | "leased" | "legacy_migration_required";
    }
  | {
      acquired: true;
      previousActiveGenerationId: string | null;
      staleGenerationId?: string;
    };

export type PoolReconciliationDependencies<Grid, Report> = {
  claim: (jobId: string, force: boolean) => Promise<PoolGenerationClaim>;
  generate: () => Promise<{ grids: Grid[]; report: Report }>;
  validate: (generation: { grids: Grid[]; report: Report }) => boolean;
  insert: (generationId: string, grid: Grid) => Promise<void>;
  activate: (generationId: string, expectedCount: number) => Promise<void>;
  cleanup: (generationId: string | null) => Promise<void>;
  release: (jobId: string) => Promise<void>;
  reconcileFutureGrids: () => Promise<void>;
  ensureDailyGrids: () => Promise<void>;
};

export type PoolReconciliationResult<Report> =
  | {
      kind: "skipped";
      reason: "healthy" | "leased" | "legacy_migration_required";
    }
  | {
      kind: "generated";
      report: Report;
      warnings: PoolPostActivationWarning[];
    };

export type PoolPostActivationWarning =
  | "ensure_daily_grids_failed"
  | "future_grid_reconciliation_failed";

type PoolPostActivationDependencies = Pick<
  PoolReconciliationDependencies<unknown, unknown>,
  "ensureDailyGrids" | "reconcileFutureGrids"
>;

export async function runPoolPostActivationTasks(
  dependencies: PoolPostActivationDependencies,
): Promise<PoolPostActivationWarning[]> {
  const warnings: PoolPostActivationWarning[] = [];
  try {
    await dependencies.ensureDailyGrids();
  } catch {
    warnings.push("ensure_daily_grids_failed");
  }
  try {
    await dependencies.reconcileFutureGrids();
  } catch {
    warnings.push("future_grid_reconciliation_failed");
  }
  return warnings;
}

export function isPoolGenerationActive(
  activeGenerationId: string | null,
  candidateGenerationId: string | undefined,
): boolean {
  return activeGenerationId === null
    ? candidateGenerationId === undefined
    : candidateGenerationId === activeGenerationId;
}

/**
 * Orchestration pure du remplacement de pool. La génération reste invisible
 * jusqu'à ce que toutes les candidates soient insérées puis validées par
 * `activate`. Une erreur avant cette bascule ne touche donc jamais au pool actif.
 */
export async function runPoolReconciliation<Grid, Report>(
  dependencies: PoolReconciliationDependencies<Grid, Report>,
  options: { force: boolean; jobId: string },
): Promise<PoolReconciliationResult<Report>> {
  const claim = await dependencies.claim(options.jobId, options.force);
  if (!claim.acquired) {
    return { kind: "skipped", reason: claim.reason };
  }

  let generation: { grids: Grid[]; report: Report };
  try {
    generation = await dependencies.generate();
    if (!dependencies.validate(generation)) {
      throw new Error("Generated pool failed validation");
    }
    for (const grid of generation.grids) {
      await dependencies.insert(options.jobId, grid);
    }
    await dependencies.activate(options.jobId, generation.grids.length);
  } catch (error) {
    await Promise.allSettled([
      dependencies.release(options.jobId),
      dependencies.cleanup(options.jobId),
      ...(claim.staleGenerationId
        ? [dependencies.cleanup(claim.staleGenerationId)]
        : []),
    ]);
    throw error;
  }

  await Promise.allSettled([
    dependencies.cleanup(claim.previousActiveGenerationId),
    ...(claim.staleGenerationId
      ? [dependencies.cleanup(claim.staleGenerationId)]
      : []),
  ]);
  // La disponibilité du jeu est prioritaire : aujourd'hui et demain sont
  // assignés immédiatement, avant le contrôle potentiellement long des autres
  // dates futures.
  const warnings = await runPoolPostActivationTasks(dependencies);
  return { kind: "generated", report: generation.report, warnings };
}
