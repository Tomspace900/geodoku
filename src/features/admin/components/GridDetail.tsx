import {
  difficultyStars,
  formatGridDateHeadingFr,
} from "@/features/admin/logic/display";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { PoolGridMetadata } from "../../../../convex/lib/gridConstants";
import { DifficultyPill } from "./DifficultyPill";
import { GridPreview } from "./GridPreview";
import { TagPill } from "./TagPill";

type ScheduledGridSummary = {
  date: string;
  difficulty: number;
  rows: string[];
  cols: string[];
  metadata: PoolGridMetadata | null;
};

type Props = {
  token: string;
  grid: ScheduledGridSummary | null;
  selectedDate: string | null;
};

export function GridDetail({ token, grid, selectedDate }: Props) {
  const previewDetail = useQuery(
    api.grids.getScheduledGridPreviewDetail,
    grid ? { adminToken: token, date: grid.date } : "skip",
  );

  if (!selectedDate) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 rounded-xl bg-surface-lowest p-6 shadow-editorial">
        <p className="text-sm text-on-surface-variant text-center">
          Cliquez sur un jour du calendrier pour voir la grille planifiée.
        </p>
      </div>
    );
  }

  if (!grid) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 rounded-xl bg-surface-lowest p-6 shadow-editorial">
        <p className="text-sm text-on-surface-variant text-center">
          Aucune grille planifiée pour cette date.
        </p>
      </div>
    );
  }

  const metadata = grid.metadata;

  return (
    <div className="h-full overflow-hidden rounded-xl bg-surface-lowest shadow-editorial">
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-medium text-on-surface capitalize">
            {formatGridDateHeadingFr(grid.date)}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-highest px-2.5 py-1 text-xs font-semibold text-on-surface">
              {difficultyStars(grid.difficulty)}
            </span>
            <span className="text-xs text-on-surface-variant">
              difficulté {grid.difficulty}/100
            </span>
          </div>
        </div>
      </div>
      {metadata === null && (
        <div className="px-4 pb-3">
          <p className="text-xs text-on-surface-variant animate-pulse">
            Métadonnées candidate indisponibles…
          </p>
        </div>
      )}
      {metadata && (
        <div className="px-4 pb-3 space-y-2">
          <div className="flex flex-wrap gap-1">
            <DifficultyPill tier="easy">
              {metadata.difficultyTags.easy} faciles
            </DifficultyPill>
            <DifficultyPill tier="medium">
              {metadata.difficultyTags.medium} moyennes
            </DifficultyPill>
            <DifficultyPill tier="hard">
              {metadata.difficultyTags.hard} difficiles
            </DifficultyPill>
            {metadata.categories.map((cat) => (
              <TagPill key={cat}>{cat}</TagPill>
            ))}
          </div>
        </div>
      )}
      <div className="px-4 pb-4">
        <div className="mx-auto w-full max-w-[860px]">
          {previewDetail === undefined && (
            <p className="text-sm text-on-surface-variant animate-pulse">
              Chargement de la grille…
            </p>
          )}
          {previewDetail === null && (
            <p className="text-sm text-on-surface-variant">
              Détail de grille indisponible.
            </p>
          )}
          {previewDetail && (
            <GridPreview
              rows={previewDetail.rows}
              cols={previewDetail.cols}
              validAnswers={previewDetail.validAnswers}
              cellDifficulties={metadata?.cellDifficulties ?? null}
            />
          )}
        </div>
      </div>
    </div>
  );
}
