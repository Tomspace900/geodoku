import type { ReactNode } from "react";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { useLocale } from "@/i18n/LocaleContext";
import type { MyStats } from "../logic/myStats";
import { formatStatsDate } from "../logic/statsDates";

function Tile({
  value,
  label,
  caption,
}: {
  value: ReactNode;
  label: string;
  caption?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-surface-low px-3.5 py-3">
      <span className="font-serif text-3xl font-medium leading-none tabular-nums text-on-surface">
        {value}
      </span>
      <Eyebrow as="span">{label}</Eyebrow>
      {caption && (
        <span className="text-[11px] text-on-surface-variant">{caption}</span>
      )}
    </div>
  );
}

/** Les 4 cases : parties jouées, grilles complètes, score moyen, record. */
export function StatTiles({ stats }: { stats: MyStats }) {
  const { t, locale } = useLocale();
  return (
    <div className="grid grid-cols-2 gap-2">
      <Tile value={stats.played} label={t("stats.played")} />
      <Tile value={`${stats.completePercent}%`} label={t("stats.complete")} />
      <Tile value={stats.average} label={t("stats.average")} />
      <Tile
        value={stats.best?.total ?? "—"}
        label={t("stats.best")}
        caption={
          stats.best
            ? formatStatsDate(stats.best.date, locale, "long")
            : undefined
        }
      />
    </div>
  );
}
