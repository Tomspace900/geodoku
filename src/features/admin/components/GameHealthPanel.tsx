import { Eyebrow } from "@/components/editorial/Eyebrow";
import { GRID_LAUNCH_DATE_ISO } from "@/features/game/logic/gridIssue";
import {
  type FeedbackRow,
  type Summary,
  type TrendRow,
  buildSummary,
  buildTrend,
} from "../logic/analytics";
import { DifficultyPill } from "./DifficultyPill";
import { PanelCard } from "./PanelCard";
import { PanelHeader } from "./PanelHeader";
import { StatGlyph } from "./StatGlyph";

const TREND_DAYS = 7;
const SUMMARY_DAYS = 30;

type Props = {
  feedbackStats: FeedbackRow[] | undefined;
};

function SummaryCard({ summary }: { summary: Summary }) {
  const winPct =
    summary.winRate === null ? null : Math.round(summary.winRate * 100);
  return (
    <div className="mb-5 rounded-lg bg-surface-lowest p-4 shadow-editorial">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <div className="font-serif text-4xl font-medium leading-none text-brand">
            {winPct === null ? "—" : `${winPct} %`}
          </div>
          <Eyebrow className="mt-1.5">
            win rate global · {summary.finished} parties · {summary.days} j
          </Eyebrow>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <StatGlyph
            kind="terminees"
            size="md"
            showLabel
            value={summary.finished}
          />
          <StatGlyph
            kind="victoires"
            size="md"
            showLabel
            value={summary.wins}
          />
          <StatGlyph
            kind="defaites"
            size="md"
            showLabel
            value={summary.losses}
          />
          {!summary.lossSplitPending && summary.losses > 0 && (
            <span className="inline-flex items-center gap-1">
              <StatGlyph kind="vies" showLabel value={summary.lostByLives} />
              <span className="text-on-surface-variant/40">/</span>
              <StatGlyph
                kind="blocage"
                showLabel
                value={summary.lostByBlocked}
              />
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant">
        <span>
          <span className="font-semibold text-on-surface">
            {summary.avgFinishedPerDay.toFixed(1)}
          </span>{" "}
          parties/jour
        </span>
        <span>
          pic{" "}
          <span className="font-semibold text-on-surface">
            {summary.peakMax}
          </span>
        </span>
        <span>
          creux{" "}
          <span className="font-semibold text-on-surface">
            {summary.peakMin}
          </span>
        </span>
      </div>
    </div>
  );
}

function winCell(row: TrendRow): string {
  if (row.finished === 0 || row.winRate === null) return "—";
  return `${Math.round(row.winRate * 100)} % (${row.wins})`;
}

function splitCell(row: TrendRow): string {
  if (row.losses === 0) return "—";
  if (row.lossSplitPending) return "— en attente";
  return `${row.lostByLives} / ${row.lostByBlocked}`;
}

export function GameHealthPanel({ feedbackStats }: Props) {
  const sinceLaunch =
    feedbackStats?.filter((row) => row.date >= GRID_LAUNCH_DATE_ISO) ??
    undefined;

  const trend =
    sinceLaunch === undefined ? null : buildTrend(sinceLaunch, TREND_DAYS);
  const summary =
    sinceLaunch === undefined ? null : buildSummary(sinceLaunch, SUMMARY_DAYS);

  return (
    <PanelCard>
      <PanelHeader title="Santé de jeu" />

      {summary && summary.days > 0 && <SummaryCard summary={summary} />}

      <PanelHeader
        title={`Tendance ${TREND_DAYS} derniers jours`}
        className="mt-1"
      />

      {trend === null && (
        <p className="text-sm text-on-surface-variant">Chargement…</p>
      )}

      {trend !== null && trend.length === 0 && (
        <p className="text-sm text-on-surface-variant">
          Aucune donnée de feedback pour le moment.
        </p>
      )}

      {trend !== null && trend.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                <th className="pb-2 pr-4 text-left">Date</th>
                <th className="pb-2 pr-4 text-right">
                  <StatGlyph kind="terminees" showLabel />
                </th>
                <th className="pb-2 pr-4 text-right">
                  <StatGlyph kind="victoires" showLabel />
                </th>
                <th className="pb-2 pr-4 text-right">
                  <StatGlyph kind="defaites" showLabel />
                </th>
                <th className="pb-2 pr-4 text-right">
                  <span className="inline-flex items-center gap-1">
                    <StatGlyph kind="vies" showLabel />
                    <span className="text-on-surface-variant/40">/</span>
                    <StatGlyph kind="blocage" showLabel />
                  </span>
                </th>
                <th className="pb-2 pr-4 text-center">Diff. ressentie</th>
                <th className="pb-2 text-right">Remplies /9</th>
              </tr>
            </thead>
            <tbody>
              {trend.map((row) => (
                <tr
                  key={row.date}
                  className="border-t border-outline-variant/10"
                >
                  <td className="py-1.5 pr-4 font-mono text-on-surface">
                    {row.date}
                  </td>
                  <td className="py-1.5 pr-4 text-right tabular-nums text-on-surface">
                    {row.finished}
                  </td>
                  <td className="py-1.5 pr-4 text-right tabular-nums text-on-surface-variant">
                    {winCell(row)}
                  </td>
                  <td className="py-1.5 pr-4 text-right tabular-nums text-on-surface-variant">
                    {row.losses}
                  </td>
                  <td className="py-1.5 pr-4 text-right tabular-nums text-on-surface-variant">
                    {splitCell(row)}
                  </td>
                  <td className="py-1.5 pr-4 text-center">
                    {row.difficultyObserved100 !== null ? (
                      <span className="inline-flex items-center gap-1">
                        <DifficultyPill value={row.difficultyObserved100} />
                        <span className="text-[10px] tabular-nums text-on-surface-variant">
                          n{row.ratingCount}
                        </span>
                      </span>
                    ) : (
                      <span className="text-on-surface-variant">—</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-on-surface-variant">
                    {row.avgFilledCells === null
                      ? "—"
                      : row.avgFilledCells.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {trend?.some((r) => r.lossSplitPending) && (
        <p className="mt-3 text-[10px] text-on-surface-variant/60">
          Ventilation vies / blocage « en attente » jusqu'au déploiement de{" "}
          <code>endReason</code>.
        </p>
      )}
    </PanelCard>
  );
}
