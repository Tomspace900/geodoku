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

function formatDateFr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(y as number, (m as number) - 1, d as number));
}

function difficultyLabel(difficulty: number): string {
  const stars = Math.round((difficulty / 100) * 5);
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

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

  return (
    <div className="h-full overflow-hidden rounded-xl bg-surface-lowest shadow-editorial">
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold tracking-widest text-on-surface-variant uppercase">
            Grille du
          </p>
          <h2 className="font-serif text-xl font-medium text-on-surface capitalize">
            {formatDateFr(grid.date)}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-highest px-2.5 py-1 text-xs font-semibold text-on-surface">
              {difficultyLabel(grid.difficulty)}
            </span>
            <span className="text-xs text-on-surface-variant">
              difficulté {grid.difficulty}/100
            </span>
          </div>
        </div>
      </div>
      {detail && (
        <div className="px-4 pb-3 text-xs text-on-surface-variant space-y-1">
          <p>
            Contraintes : {detail.rows.join(", ")} / {detail.cols.join(", ")}
          </p>
          {detail.metadata && (
            <p>
              Difficulté estimée : {detail.metadata.difficultyEstimate}/100 ·{" "}
              {detail.metadata.constraintIds.length} contraintes ·{" "}
              {detail.metadata.categories.length} catégories
            </p>
          )}
        </div>
      )}
      <div className="px-4 pb-4">
        <div className="mx-auto w-full max-w-[860px]">
          <GridPreview
            rows={grid.rows}
            cols={grid.cols}
            validAnswers={grid.validAnswers}
            mode="compact"
          />
        </div>
      </div>
    </div>
  );
}
