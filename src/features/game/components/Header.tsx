import { useLocale } from "@/i18n/LocaleContext";
import { Heart } from "lucide-react";
import { STARTING_LIVES } from "../logic/constants";

type Props = {
  remainingLives: number;
  date: string; // "YYYY-MM-DD"
};

export function Header({ remainingLives, date }: Props) {
  const { locale } = useLocale();

  const localeTag = locale === "fr" ? "fr-FR" : "en-GB";
  const dateLabel = date
    ? new Intl.DateTimeFormat(localeTag, {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
        .format(new Date(`${date}T12:00:00`))
        .toUpperCase()
    : "";

  return (
    <header className="relative flex items-center justify-between py-2">
      <div className="flex flex-col">
        <h1 className="font-serif text-2xl font-medium italic text-on-surface leading-none">
          Geodoku
        </h1>
        {dateLabel && (
          <>
            <div
              className="mt-2 h-1 w-12 shrink-0 rounded-full bg-brand"
              aria-hidden
            />
            <p className="mt-1 text-[10px] tracking-widest text-on-surface-variant uppercase">
              {dateLabel}
            </p>
          </>
        )}
      </div>

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
