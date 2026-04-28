import {
  constraintLabel,
  difficultyPillClass,
} from "@/features/admin/logic/display";
import { getCountryByCode } from "@/features/countries/lib/search";
import { cn } from "@/lib/utils";

const headerClass =
  "flex items-center justify-center text-center text-[10px] font-medium text-on-surface-variant bg-surface-low rounded-xl p-2 leading-tight min-h-[52px]";

type GridPreviewData = {
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
  // 9 valeurs row-major (0–100) ; affiche un badge coloré en coin de chaque cellule.
  cellDifficulties?: number[] | null;
};

export function GridPreview({
  rows,
  cols,
  validAnswers,
  cellDifficulties,
}: GridPreviewData) {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: "minmax(0,1fr) repeat(3, minmax(0,1fr))" }}
    >
      <div />

      {cols.map((colId) => (
        <div key={colId} className={`${headerClass} p-1.5`}>
          {constraintLabel(colId)}
        </div>
      ))}

      {rows.map((rowId, r) => [
        <div key={`row-${rowId}`} className={`${headerClass} p-1.5`}>
          {constraintLabel(rowId)}
        </div>,

        ...cols.map((_, c) => {
          const key = `${r},${c}`;
          const codes = validAnswers[key] ?? [];
          const difficulty = cellDifficulties?.[r * 3 + c];
          const hasDifficulty = typeof difficulty === "number";
          return (
            <div
              key={key}
              className="relative isolate aspect-square w-full min-h-0 rounded-xl bg-surface-lowest shadow-editorial"
            >
              <div className="flex h-full min-h-0 flex-wrap content-start overflow-y-auto p-1.5 gap-1">
                {codes.map((code) => {
                  const country = getCountryByCode(code);
                  return (
                    <span
                      key={`${key}-${code}`}
                      className="inline-flex items-center gap-1 rounded-md bg-surface-low px-1.5 py-0.5 text-[11px] font-medium text-on-surface leading-none"
                    >
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-[11px] leading-none"
                      >
                        {country?.flagEmoji ?? "🏳️"}
                      </span>
                      <span className="min-w-0 truncate">{code}</span>
                    </span>
                  );
                })}
                {codes.length === 0 && (
                  <span className="text-[11px] text-on-surface-variant">
                    Aucun pays
                  </span>
                )}
              </div>
              {hasDifficulty && (
                <span
                  className={cn(
                    "pointer-events-none absolute bottom-1.5 right-1.5 z-10 rounded-full font-semibold tabular-nums shadow-sm",
                    difficultyPillClass(difficulty),
                    "px-1.5 py-0.5 text-[11px]",
                  )}
                >
                  {difficulty}
                </span>
              )}
            </div>
          );
        }),
      ])}
    </div>
  );
}
