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
  const { locale } = useLocale();
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

      <LivesMeter lives={lives} />
    </header>
  );
}
