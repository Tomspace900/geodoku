import { DifficultyPill } from "./DifficultyPill";
import { PanelCard } from "./PanelCard";
import { PanelHeader } from "./PanelHeader";

type FeedbackRow = {
  date: string;
  ratingCount: number;
  difficultyObserved100: number | null;
  winRate: number | null;
};

type ScheduledGrid = {
  date: string;
  difficulty: number;
};

type Props = {
  feedbackStats: FeedbackRow[] | undefined;
  scheduledGrids: ScheduledGrid[];
};

export function DiversityMetricsPanel({
  feedbackStats,
  scheduledGrids,
}: Props) {
  const estimatedByDate = new Map(
    scheduledGrids.map((g) => [g.date, g.difficulty]),
  );

  return (
    <PanelCard>
      <PanelHeader title="Métriques observées" className="mb-4" />

      {feedbackStats === undefined && (
        <p className="text-sm text-on-surface-variant">Chargement…</p>
      )}

      {feedbackStats !== undefined && feedbackStats.length === 0 && (
        <p className="text-sm text-on-surface-variant">
          Aucune donnée de feedback pour le moment.
        </p>
      )}

      {feedbackStats !== undefined && feedbackStats.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] font-semibold text-on-surface-variant tracking-widest uppercase">
                <th className="pb-2 pr-4 text-left">Date</th>
                <th className="pb-2 pr-4 text-right">Ratings</th>
                <th className="pb-2 pr-4 text-right">Win %</th>
                <th className="pb-2 pr-4 text-center">Diff. observée</th>
                <th className="pb-2 pr-4 text-center">Diff. estimée</th>
                <th className="pb-2 text-right">Δ</th>
              </tr>
            </thead>
            <tbody>
              {feedbackStats.map((row) => {
                const estimated = estimatedByDate.get(row.date) ?? null;
                const delta =
                  row.difficultyObserved100 !== null && estimated !== null
                    ? Math.abs(row.difficultyObserved100 - estimated)
                    : null;

                return (
                  <tr
                    key={row.date}
                    className="border-t border-outline-variant/10"
                  >
                    <td className="py-1.5 pr-4 font-mono text-on-surface">
                      {row.date}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums text-on-surface-variant">
                      {row.ratingCount}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums text-on-surface">
                      {row.winRate !== null
                        ? `${Math.round(row.winRate * 100)}%`
                        : "—"}
                    </td>
                    <td className="py-1.5 pr-4 text-center">
                      {row.difficultyObserved100 !== null ? (
                        <DifficultyPill value={row.difficultyObserved100} />
                      ) : (
                        <span className="text-on-surface-variant">—</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-4 text-center">
                      {estimated !== null ? (
                        <DifficultyPill value={estimated} />
                      ) : (
                        <span className="text-on-surface-variant">—</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {delta !== null ? (
                        <span
                          className={
                            delta > 20
                              ? "text-error font-medium"
                              : "text-on-surface-variant"
                          }
                        >
                          {delta}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  );
}
