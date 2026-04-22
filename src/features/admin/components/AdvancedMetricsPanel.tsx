import {
  type DifficultyComponentKey,
  type GridMetadata,
  type QualityComponentKey,
  TUNING_CONSTANTS,
  computeDifficultyBreakdown,
  computeQualityBreakdown,
} from "../../../../convex/lib/gridGenerator";

/**
 * Compact inspector for the admin Advanced view. Two columns (quality /
 * difficulty), one row per component. Hints surface via `title` tooltip on
 * hover to keep the panel scannable.
 */

type Props = {
  metadata: GridMetadata | null | undefined;
};

const QUALITY_LABELS: Record<QualityComponentKey, string> = {
  sizeComfort: "Tailles",
  obvious: "Évidentes",
  mixDiversity: "Mix easy/hard",
};

const DIFFICULTY_LABELS: Record<DifficultyComponentKey, string> = {
  sizeHardness: "Taille cellules",
  constraintHardness: "Rareté",
  blockingRisk: "Blocage",
};

function fmt(n: number, digits = 2): string {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

function pct(n: number): string {
  return Number.isFinite(n) ? `${Math.round(n * 100)}%` : "—";
}

function qualityHint(key: QualityComponentKey, metadata: GridMetadata): string {
  switch (key) {
    case "sizeComfort":
      return `cellules ${metadata.minCellSize}–${metadata.maxCellSize} sol (moy ${fmt(metadata.avgCellSize, 1)}) — soft cap ${TUNING_CONSTANTS.qualityShape.MAX_CELL_SIZE_SOFT}`;
    case "obvious":
      return `${metadata.obviousCellCount}/9 évidentes — cible ${TUNING_CONSTANTS.qualityShape.OBVIOUS_IDEAL} ± ${TUNING_CONSTANTS.qualityShape.OBVIOUS_BELL_HALF_WIDTH}`;
    case "mixDiversity": {
      const hard = metadata.hardConstraintCount;
      const easy = metadata.easyConstraintCount;
      const medium = 6 - hard - easy;
      return `${easy} easy · ${medium} medium · ${hard} hard — cible ≈ ${Math.round(TUNING_CONSTANTS.qualityShape.MIX_HARD_TARGET_RATIO * 6)} hard & ≥ 1 easy`;
    }
  }
}

function difficultyHint(
  key: DifficultyComponentKey,
  metadata: GridMetadata,
): string {
  switch (key) {
    case "sizeHardness":
      return `moy ${fmt(metadata.avgCellSize, 1)} sol/cellule`;
    case "constraintHardness":
      return `moy rareté ${fmt(metadata.constraintHardnessMean, 2)}`;
    case "blockingRisk":
      return `cellRisk max ${fmt(metadata.maxCellRisk, 2)} · avg ${fmt(metadata.avgCellRisk, 2)}`;
  }
}

type RowProps = {
  label: string;
  hint: string;
  norm: number;
  weight: number;
};

function CompactRow({ label, hint, norm, weight }: RowProps) {
  const contribution = norm * weight * 100;
  const maxContribution = weight * 100;
  const widthPct = Math.max(0, Math.min(100, norm * 100));
  return (
    <div
      className="flex items-center gap-2 text-[11px] tabular-nums"
      title={hint}
    >
      <span className="w-24 shrink-0 text-on-surface">{label}</span>
      <div className="flex h-1 flex-1 overflow-hidden rounded-full bg-surface-highest">
        <div
          className="h-full rounded-full bg-brand/70"
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-on-surface-variant">
        {fmt(contribution, 0)} / {fmt(maxContribution, 0)}
      </span>
    </div>
  );
}

export function AdvancedMetricsPanel({ metadata }: Props) {
  if (!metadata?.cellMetrics?.length) {
    return (
      <div className="rounded-xl bg-surface-highest/40 px-3 py-2 text-xs text-on-surface-variant">
        Métadonnées scoring indisponibles pour cette grille.
      </div>
    );
  }

  const quality = computeQualityBreakdown(metadata);
  const difficulty = computeDifficultyBreakdown(metadata);

  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl bg-surface-highest/30 p-3 md:grid-cols-2 md:p-4">
      <section>
        <p className="mb-2 flex items-baseline gap-1.5 text-[10px] font-semibold tracking-widest text-on-surface-variant uppercase">
          Quality
          <span className="text-sm font-medium text-on-surface">
            {quality.total}
          </span>
          <span className="text-[9px] text-on-surface-variant">/ 100</span>
        </p>
        <div className="space-y-1.5">
          {quality.components.map((c) => (
            <CompactRow
              key={c.key}
              label={QUALITY_LABELS[c.key]}
              hint={qualityHint(c.key, metadata)}
              norm={c.norm}
              weight={c.weight}
            />
          ))}
        </div>
        <p
          className="mt-2 text-[9px] text-on-surface-variant"
          title={`overlap contraintes ${pct(metadata.criteriaOverlapScore)}`}
        >
          overlap {pct(metadata.criteriaOverlapScore)}
        </p>
      </section>

      <section>
        <p className="mb-2 flex items-baseline gap-1.5 text-[10px] font-semibold tracking-widest text-on-surface-variant uppercase">
          Difficulty
          <span className="text-sm font-medium text-on-surface">
            {difficulty.total}
          </span>
          <span className="text-[9px] text-on-surface-variant">/ 100</span>
        </p>
        <div className="space-y-1.5">
          {difficulty.components.map((c) => (
            <CompactRow
              key={c.key}
              label={DIFFICULTY_LABELS[c.key]}
              hint={difficultyHint(c.key, metadata)}
              norm={c.norm}
              weight={c.weight}
            />
          ))}
        </div>
        <p
          className="mt-2 text-[9px] text-on-surface-variant"
          title={`raw ${fmt(difficulty.rawDifficulty, 2)} rescalé sur [${fmt(TUNING_CONSTANTS.rescaling.DIFFICULTY_RAW_P5, 2)}, ${fmt(TUNING_CONSTANTS.rescaling.DIFFICULTY_RAW_P95, 2)}]`}
        >
          raw {fmt(difficulty.rawDifficulty, 2)} → rescalé
        </p>
      </section>
    </div>
  );
}
