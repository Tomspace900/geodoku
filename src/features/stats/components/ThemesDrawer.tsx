import { SheetDrawer } from "@/components/SheetDrawer";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import type { ThemeStat } from "../logic/myStats";

/** Le podium en violet : le premier plein, puis de plus en plus clair. */
const PODIUM_BARS = ["bg-brand", "bg-brand/60", "bg-brand/35"];
const OTHER_BAR = "bg-on-surface-variant/40";

/** Toutes les thématiques, classées, en barres ; les trois premières en violet. */
export function ThemesDrawer({
  open,
  themes,
  onClose,
}: {
  open: boolean;
  themes: readonly ThemeStat[];
  onClose: () => void;
}) {
  const { t } = useLocale();
  return (
    <SheetDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t("stats.themes")}
      subtitle={t("stats.themesSubtitle")}
      closeLabel={t("stats.closeDrawer")}
    >
      <ol className="flex flex-col gap-2.5 pt-2">
        {themes.map((stat, index) => {
          const percent = Math.round(stat.rate * 100);
          const podium = index < PODIUM_BARS.length;
          return (
            <li
              key={stat.id}
              className="grid grid-cols-[1rem_minmax(0,9rem)_1fr_2.5rem] items-center gap-3"
            >
              <span
                className={cn(
                  "text-right text-xs tabular-nums",
                  podium
                    ? "font-semibold text-brand"
                    : "text-on-surface-variant/70",
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  "truncate text-sm text-on-surface",
                  podium && "font-medium",
                )}
              >
                {t(`theme.${stat.id}`)}
              </span>
              <span
                aria-hidden
                className="h-2 overflow-hidden rounded-full bg-surface-low"
              >
                <span
                  className={cn(
                    "block h-full rounded-full",
                    PODIUM_BARS[index] ?? OTHER_BAR,
                  )}
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="text-right text-xs tabular-nums text-on-surface-variant">
                {`${percent}%`}
              </span>
            </li>
          );
        })}
      </ol>
    </SheetDrawer>
  );
}
