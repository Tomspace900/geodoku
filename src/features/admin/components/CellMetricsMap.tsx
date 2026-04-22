import { cn } from "@/lib/utils";

type CellMetric = {
  cellKey: string;
  solutionCount: number;
  popularCount: number;
  avgPopularity: number;
};

type Props = {
  cellMetrics: readonly CellMetric[];
};

export function CellMetricsMap({ cellMetrics }: Props) {
  const byKey = new Map(cellMetrics.map((m) => [m.cellKey, m] as const));

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold tracking-widest text-on-surface-variant uppercase">
        Signaux par cellule
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 9 }).map((_, idx) => {
          const r = Math.floor(idx / 3);
          const c = idx % 3;
          const metric = byKey.get(`${r},${c}`);
          if (!metric) {
            return (
              <div
                key={`${r},${c}`}
                className="aspect-square rounded-md bg-surface-low"
              />
            );
          }
          const hasObvious = metric.popularCount >= 1;
          const noObvious = !hasObvious;
          return (
            <div
              key={metric.cellKey}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-md px-1 py-1.5",
                noObvious ? "bg-rarity-ultra/10" : "bg-surface-low",
              )}
            >
              <span
                className={cn(
                  "font-serif text-2xl font-medium leading-none",
                  noObvious ? "text-rarity-ultra" : "text-on-surface",
                )}
              >
                {metric.solutionCount}
              </span>
              <span className="mt-1 text-[9px] tracking-wide text-on-surface-variant uppercase">
                {metric.popularCount} évid.
              </span>
              {hasObvious && (
                <span className="mt-0.5 rounded-full bg-brand/10 px-1.5 text-[9px] font-semibold text-brand">
                  ★
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
