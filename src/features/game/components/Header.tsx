import { ChartColumnBig } from "lucide-react";
import { Link } from "react-router";
import { AppMark } from "@/components/AppMark";
import { DisplayHeader } from "@/components/editorial/DisplayHeader";
import { formatGridDateLabel } from "@/features/game/logic/gridDateLabel";
import type { LivesState } from "@/features/game/types";
import { useLocale, useT } from "@/i18n/LocaleContext";
import { LivesMeter } from "./LivesMeter";

type Props = {
  lives: LivesState;
  date: string; // "YYYY-MM-DD"
  gridNumber: number | null;
};

export function Header({ lives, date, gridNumber }: Props) {
  const { locale, localizedPath } = useLocale();
  const t = useT();

  const dateLabel = formatGridDateLabel(date, locale);

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
        <Link
          to={localizedPath("/stats")}
          aria-label={t("stats.iconLabel")}
          title={t("stats.iconLabel")}
          className="-mr-1.5 rounded-md p-1.5 text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-surface/20"
        >
          <ChartColumnBig className="size-5" aria-hidden />
        </Link>
      </div>
    </header>
  );
}
