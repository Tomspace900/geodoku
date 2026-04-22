import { Fragment, type ReactNode } from "react";
import { TUNING_CONSTANTS } from "../../../../convex/lib/gridGenerator";

/**
 * Collapsible read-only display of the tuning constants used by
 * `gridGenerator.ts`. Closed by default — constants rarely change, so this is
 * reference-level info and shouldn't take vertical space on first view.
 */

type Row = { label: string; value: ReactNode };
type Section = { title: string; rows: Row[] };

function n(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

function buildSections(): Section[] {
  const t = TUNING_CONSTANTS;
  return [
    {
      title: "Filtres",
      rows: [
        {
          label: "Solutions/cellule",
          value: `${t.filters.MIN_CELL_SIZE}–${t.filters.MAX_CELL_SIZE_HARD}`,
        },
        {
          label: "Cellules sans évident (max)",
          value: t.filters.MAX_CELLS_WITHOUT_OBVIOUS,
        },
        { label: "Catégories (min)", value: t.filters.MIN_CATEGORIES },
        {
          label: "Seuil « évident »",
          value: n(t.filters.OBVIOUS_POPULARITY_THRESHOLD),
        },
      ],
    },
    {
      title: "Quality",
      rows: [
        { label: "Tailles", value: n(t.qualityWeights.sizeComfort) },
        { label: "Évidentes", value: n(t.qualityWeights.obvious) },
        { label: "Mix easy/hard", value: n(t.qualityWeights.mixDiversity) },
        {
          label: "Soft cap sol/cellule",
          value: t.qualityShape.MAX_CELL_SIZE_SOFT,
        },
        { label: "Cible évidentes", value: t.qualityShape.OBVIOUS_IDEAL },
        {
          label: "Cible hard (/6)",
          value: n(t.qualityShape.MIX_HARD_TARGET_RATIO),
        },
      ],
    },
    {
      title: "Difficulty",
      rows: [
        {
          label: "Taille cellules",
          value: n(t.difficultyWeights.sizeHardness),
        },
        {
          label: "Rareté contraintes",
          value: n(t.difficultyWeights.constraintHardness),
        },
        {
          label: "Risque blocage",
          value: n(t.difficultyWeights.blockingRisk),
        },
        { label: "Raw P5", value: n(t.rescaling.DIFFICULTY_RAW_P5) },
        { label: "Raw P95", value: n(t.rescaling.DIFFICULTY_RAW_P95) },
      ],
    },
    {
      title: "Batch",
      rows: [
        { label: "Générés", value: t.batch.BATCH_GENERATE_N },
        { label: "Stockés", value: t.batch.BATCH_STORE_N },
      ],
    },
  ];
}

export function TuningConstantsPanel() {
  const sections = buildSections();
  return (
    <details className="group rounded-2xl bg-surface-lowest shadow-editorial">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 md:px-5 md:py-4">
        <span className="text-[10px] font-semibold tracking-widest text-on-surface-variant uppercase">
          Tuning constants
        </span>
        <span className="text-[10px] text-on-surface-variant group-open:hidden">
          Afficher
        </span>
        <span className="hidden text-[10px] text-on-surface-variant group-open:inline">
          Masquer
        </span>
      </summary>
      <div className="px-4 pb-4 md:px-5 md:pb-5">
        <p className="mb-3 text-[10px] text-on-surface-variant">
          Édition :{" "}
          <code className="text-on-surface">convex/lib/gridGenerator.ts</code>,
          puis <code className="text-on-surface">pnpm wipe:db</code> &{" "}
          <code className="text-on-surface">pnpm seed:grids:force</code>.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-1 text-[10px] font-semibold tracking-widest text-brand uppercase">
                {section.title}
              </p>
              <dl className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-0.5">
                {section.rows.map((row) => (
                  <Fragment key={row.label}>
                    <dt className="text-[11px] text-on-surface-variant">
                      {row.label}
                    </dt>
                    <dd className="text-[11px] font-semibold text-on-surface tabular-nums">
                      {row.value}
                    </dd>
                  </Fragment>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
