import {
  difficultyStars,
  difficultyTierSurfaceClass,
  formatGridDateHeadingFr,
} from "@/features/admin/logic/display";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { GridPreview } from "./GridPreview";

type ScheduledGrid = {
  date: string;
  difficulty: number;
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
};

type Props = {
  grid: ScheduledGrid | null;
  selectedDate: string | null;
};

export function GridDetail({ grid, selectedDate }: Props) {
  const detail = useQuery(
    api.grids.getGridDetailByDate,
    grid ? { date: grid.date } : "skip",
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

  const metadata = detail?.metadata ?? null;

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
      {metadata && (
        <div className="px-4 pb-3 space-y-2">
          <div className="flex flex-wrap gap-1">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${difficultyTierSurfaceClass("easy")}`}
            >
              {metadata.difficultyTags.easy} faciles
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${difficultyTierSurfaceClass("medium")}`}
            >
              {metadata.difficultyTags.medium} moyennes
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${difficultyTierSurfaceClass("hard")}`}
            >
              {metadata.difficultyTags.hard} difficiles
            </span>
            {metadata.categories.map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-surface-low px-2 py-0.5 text-[10px] text-on-surface-variant"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="px-4 pb-4">
        <div className="mx-auto w-full max-w-[860px]">
          <GridPreview
            rows={grid.rows}
            cols={grid.cols}
            validAnswers={grid.validAnswers}
            cellDifficulties={metadata?.cellDifficulties ?? null}
          />
        </div>
      </div>
    </div>
  );
}
