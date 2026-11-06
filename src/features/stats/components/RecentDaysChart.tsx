import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import type { RecentDays } from "../logic/myStats";
import { formatStatsDate } from "../logic/statsDates";

/** Une barre de 3 % au moins, pour qu'un score de 0 reste visible. */
const MIN_BAR_PERCENT = 3;
const SCORE_TO_PERCENT = 10;

function barHeight(total: number): string {
  return `${Math.max(MIN_BAR_PERCENT, total / SCORE_TO_PERCENT)}%`;
}

type Props = {
  recent: RecentDays;
  /** Jour affiché dans le tiroir ; sans lui, le meilleur score est en violet. */
  selected: string | null;
  onSelect: (date: string) => void;
  height?: number;
};

/**
 * « Mes 30 derniers jours » : une barre par jour (hauteur = score), la moyenne
 * en pointillé, un point pour un jour non joué, un contour pointillé pour une
 * partie pas finie. Le survol d'une barre à la souris donne date et score.
 */
export function RecentDaysChart({
  recent,
  selected,
  onSelect,
  height = 96,
}: Props) {
  const { t, locale } = useLocale();
  const [hovered, setHovered] = useState<string | null>(null);
  const highlighted = selected ?? recent.bestDate;
  const hoveredDay = recent.days.find(
    (day) => day.date === hovered && day.kind === "finished",
  );
  const hoveredIndex = hoveredDay ? recent.days.indexOf(hoveredDay) : -1;

  return (
    <div className="flex flex-col gap-1">
      <fieldset
        aria-label={t("stats.chartAriaLabel")}
        className="relative m-0 flex min-w-0 items-end gap-[3px] border-0 p-0"
        style={{ height }}
      >
        {recent.days.map((day) => {
          const label = formatStatsDate(day.date, locale, "long");
          if (day.kind === "none") {
            return (
              <div
                key={day.date}
                className="flex flex-1 justify-center pb-px"
                role="img"
                aria-label={t("stats.barNone", { date: label })}
              >
                <span className="size-1 rounded-full bg-on-surface-variant/25" />
              </div>
            );
          }
          const isHighlighted = day.date === highlighted;
          return (
            <Button
              key={day.date}
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => onSelect(day.date)}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") setHovered(day.date);
              }}
              onPointerLeave={() => setHovered(null)}
              aria-pressed={selected === null ? undefined : isHighlighted}
              aria-label={
                day.kind === "finished"
                  ? t("stats.barScore", { date: label, score: day.total })
                  : t("stats.barUnfinished", { date: label })
              }
              className="flex h-full min-w-0 flex-1 items-end rounded-none hover:opacity-75"
            >
              {day.kind === "finished" ? (
                <span
                  className={cn(
                    "w-full rounded-t-sm",
                    isHighlighted ? "bg-brand" : "bg-surface-highest",
                  )}
                  style={{ height: barHeight(day.total) }}
                />
              ) : (
                <span
                  className={cn(
                    "h-1/3 w-full rounded-t-sm border border-dashed",
                    isHighlighted
                      ? "border-brand"
                      : "border-on-surface-variant/50",
                  )}
                />
              )}
            </Button>
          );
        })}
        {recent.average !== null && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-on-surface-variant/50"
            style={{ bottom: `${recent.average / SCORE_TO_PERCENT}%` }}
          />
        )}
        {hoveredDay && hoveredDay.kind === "finished" && (
          <span
            aria-hidden
            className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-surface-lowest px-2.5 py-1.5 text-xs tabular-nums text-on-surface shadow-editorial"
            style={{
              left: `${((hoveredIndex + 0.5) / recent.days.length) * 100}%`,
              bottom: `calc(${barHeight(hoveredDay.total)} + 8px)`,
            }}
          >
            {t("stats.tooltip", {
              date: formatStatsDate(hoveredDay.date, locale),
              score: hoveredDay.total,
            })}
          </span>
        )}
      </fieldset>
      <div
        aria-hidden
        className="relative h-3 text-[9px] tabular-nums text-on-surface-variant/80"
      >
        <span className="absolute left-0">
          {formatStatsDate(recent.days[0].date, locale)}
        </span>
        <span className="absolute right-0">{t("stats.today")}</span>
      </div>
    </div>
  );
}
