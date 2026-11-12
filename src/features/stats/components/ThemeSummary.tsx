import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import type { ThemeStat } from "../logic/myStats";
import { StatsSection } from "./StatsSection";

/** Le podium en violet, comme dans le tiroir : le premier plein, puis plus clair. */
const PODIUM_TEXT = ["text-brand", "text-brand/75", "text-brand/55"];
const SUMMARY_COUNT = PODIUM_TEXT.length;

/**
 * « Mes thématiques › » : les 3 premières, « du premier coup » dit une fois à
 * droite du titre ; titre et lignes ouvrent toutes.
 */
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
    <StatsSection
      title={t("stats.themes")}
      onOpen={onOpen}
      aside={t("stats.firstTry")}
    >
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
              <span className="w-3 shrink-0 text-right text-sm font-semibold tabular-nums text-brand">
                {index + 1}
              </span>
              <span className="flex-1 text-left text-sm font-medium text-on-surface">
                {t(`theme.${stat.id}`)}
              </span>
              <span
                className={cn(
                  "shrink-0 text-sm font-semibold tabular-nums",
                  PODIUM_TEXT[index],
                )}
              >
                {`${Math.round(stat.rate * 100)}%`}
                <span className="sr-only">{` ${t("stats.firstTry")}`}</span>
              </span>
            </Button>
          </li>
        ))}
      </ol>
    </StatsSection>
  );
}
