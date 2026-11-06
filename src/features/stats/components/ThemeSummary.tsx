import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/LocaleContext";
import type { ThemeStat } from "../logic/myStats";
import { StatsSection } from "./StatsSection";

const SUMMARY_COUNT = 3;

/** « Mes thématiques › » : les 3 premières ; titre et lignes ouvrent toutes. */
export function ThemeSummary({
  themes,
  onOpen,
}: {
  themes: readonly ThemeStat[];
  onOpen: () => void;
}) {
  const { t } = useLocale();
  if (themes.length === 0) return null;
  return (
    <StatsSection title={t("stats.themes")} onOpen={onOpen}>
      <ol className="flex flex-col gap-1.5">
        {themes.slice(0, SUMMARY_COUNT).map((stat, index) => (
          <li key={stat.id}>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={onOpen}
              className="flex w-full items-baseline gap-3 whitespace-normal rounded-xl bg-surface-low px-3.5 py-2.5 font-normal hover:bg-surface-highest/50 hover:text-on-surface"
            >
              <span className="w-3 shrink-0 text-right text-xs tabular-nums text-on-surface-variant/70">
                {index + 1}
              </span>
              <span className="flex-1 text-left text-sm font-medium text-on-surface">
                {t(`theme.${stat.id}`)}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-on-surface-variant">
                <span className="font-medium text-on-surface">{`${Math.round(stat.rate * 100)}%`}</span>{" "}
                {t("stats.firstTry")}
              </span>
            </Button>
          </li>
        ))}
      </ol>
    </StatsSection>
  );
}
