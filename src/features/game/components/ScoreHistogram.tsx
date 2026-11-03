import {
  CHART_BAR_COUNT,
  chartBarIndex,
  chartBars,
  isThinCohort,
  medianScore,
  SCORE_MAX,
} from "@/features/game/logic/cohort";
import { useT } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";

const MIN_BAR_PERCENT = 3;

/**
 * Silhouette neutre d'une journée, pour le graphique grisé d'une cohorte
 * mince : la forme suggère le graphique à venir sans rien affirmer.
 */
const PLACEHOLDER_BARS = Array.from({ length: CHART_BAR_COUNT }, (_, bar) =>
  Math.round(
    10 * Math.exp(-0.5 * ((bar - 13) / 2.8) ** 2) +
      3 * Math.exp(-0.5 * ((bar - 7) / 2) ** 2),
  ),
);

type Props = {
  histogram: readonly number[];
  /** Score du joueur, `null` tant que sa rareté charge. */
  score: number | null;
};

/**
 * Scores du jour en barres de 50 points (#70) : la tienne en violet, libellée
 * « Toi », la médiane en pointillé gris. Aucun autre texte, ni le nombre de
 * joueurs. Sous 5 parties finies, le graphique est grisé.
 */
export function ScoreHistogram({ histogram, score }: Props) {
  const t = useT();
  const thin = isThinCohort(histogram);
  const bars = thin ? PLACEHOLDER_BARS : chartBars(histogram);
  const max = Math.max(...bars, 1);
  const own = !thin && score !== null ? chartBarIndex(score) : null;
  const median = thin ? null : medianScore(histogram);
  const medianLeft = median === null ? null : `${(median / SCORE_MAX) * 100}%`;

  return (
    <div
      className="relative flex h-full flex-col justify-end gap-1 pt-4"
      role="img"
      aria-label={t(thin ? "ui.tooEarlyToCompare" : "ui.scoreChartAriaLabel")}
    >
      <div
        className={cn(
          "relative flex flex-1 items-end gap-[3px]",
          thin && "opacity-25",
        )}
      >
        {bars.map((count, bar) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: barres fixes
            key={bar}
            className={cn(
              "flex-1 rounded-t-sm",
              bar === own ? "bg-brand" : "bg-surface-highest",
            )}
            style={{
              height: `${Math.max(MIN_BAR_PERCENT, (count / max) * 100)}%`,
            }}
          />
        ))}
        {own !== null && (
          <span
            aria-hidden
            className="absolute -top-4 -translate-x-1/2 text-[10px] font-semibold text-brand"
            style={{ left: `${((own + 0.5) / bars.length) * 100}%` }}
          >
            {t("ui.chartYou")}
          </span>
        )}
        {medianLeft && (
          <span
            aria-hidden
            className="absolute inset-y-0 border-l border-dashed border-on-surface-variant/60"
            style={{ left: medianLeft }}
          />
        )}
      </div>
      <div
        aria-hidden
        className={cn(
          "relative h-3 text-[9px] tabular-nums text-on-surface-variant/70",
          thin && "opacity-25",
        )}
      >
        <span className="absolute left-0">0</span>
        {medianLeft && (
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap text-on-surface-variant"
            style={{ left: medianLeft }}
          >
            {t("ui.chartMedian")}
          </span>
        )}
        <span className="absolute right-0">{SCORE_MAX}</span>
      </div>
      {thin && (
        <p className="absolute inset-0 flex items-center justify-center text-center text-sm text-on-surface-variant">
          {t("ui.tooEarlyToCompare")}
        </p>
      )}
    </div>
  );
}
