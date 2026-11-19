import { ChartColumnBig } from "lucide-react";
import { Link } from "react-router";
import { AppMark } from "@/components/AppMark";
import { DisplayHeader } from "@/components/editorial/DisplayHeader";
import { formatGridDateLabel } from "@/features/game/logic/gridDateLabel";
import type { LivesState } from "@/features/game/types";
import { useLocale, useT } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import {
  ChangelogSpotlight,
  type ChangelogSpotlightState,
} from "./ChangelogSpotlight";
import { LivesMeter } from "./LivesMeter";

type Props = {
  lives: LivesState;
  date: string; // "YYYY-MM-DD"
  gridNumber: number | null;
  spotlight?: ChangelogSpotlightState | null;
};

export function Header({ lives, date, gridNumber, spotlight = null }: Props) {
  const { locale, localizedPath } = useLocale();
  const t = useT();

  const dateLabel = formatGridDateLabel(date, locale);
  const statsSpotlit = spotlight?.entry.announcement?.target === "stats";

  const eyebrow = dateLabel ? (
    <>
      {dateLabel}
      {gridNumber !== null && (
        <span className="text-on-surface-variant/70 normal-case tracking-normal">{` · #${gridNumber}`}</span>
      )}
    </>
  ) : undefined;

  return (
    <header className="relative flex items-center justify-between pb-4">
      <DisplayHeader
        as="h1"
        size="md"
        leftIcon={<AppMark />}
        title={t("ui.appName")}
        eyebrow={eyebrow}
        accentBar={eyebrow !== undefined}
      />

      <div className="flex items-center gap-3">
        <LivesMeter lives={lives} />
        {/* « Mes stats » (#155) : la même entrée pour tous, connecté ou non. */}
        <ChangelogSpotlight target="stats" spotlight={spotlight}>
          <Link
            to={localizedPath("/stats")}
            aria-label={t("stats.iconLabel")}
            title={t("stats.iconLabel")}
            onClick={
              statsSpotlit ? () => spotlight?.onDismiss("target") : undefined
            }
            className={cn(
              "-mr-1.5 inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-surface/20",
              statsSpotlit
                ? "size-9 rounded-full bg-surface-lowest text-brand ring-4 ring-brand/15 shadow-editorial"
                : "rounded-md p-1.5 text-on-surface-variant hover:text-on-surface",
            )}
          >
            <ChartColumnBig className="size-5" aria-hidden />
          </Link>
        </ChangelogSpotlight>
      </div>
    </header>
  );
}
