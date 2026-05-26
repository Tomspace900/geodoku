import { AppMark } from "@/components/AppMark";
import { useLocale, useT } from "@/i18n/LocaleContext";
import { Heart } from "lucide-react";
import { STARTING_LIVES } from "../logic/constants";
import { DisplayHeader } from "@/components/editorial/DisplayHeader";

type Props = {
  remainingLives: number;
  date: string; // "YYYY-MM-DD"
  gridNumber: number | null;
};

export function Header({ remainingLives, date, gridNumber }: Props) {
  const { locale } = useLocale();
  const t = useT();

  const localeTag = locale === "fr" ? "fr-FR" : "en-US";
  const dateLabel = date
    ? new Intl.DateTimeFormat(localeTag, {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
        .format(new Date(`${date}T12:00:00`))
        .toUpperCase()
        .replace(/,\s*/g, " ")
    : "";

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

      <div className="flex items-center gap-0.5">
        {Array.from({ length: STARTING_LIVES }, (_, i) => (
          <Heart
            key={`heart-${i + 1}`}
            size={18}
            className={
              i < remainingLives
                ? "text-rarity-ultra fill-rarity-ultra"
                : "text-on-surface-variant"
            }
          />
        ))}
      </div>
    </header>
  );
}
