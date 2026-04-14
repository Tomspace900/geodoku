import { Heart } from "lucide-react";
import { STARTING_LIVES } from "../logic/constants";

type Props = {
  remainingLives: number;
  date: string; // "YYYY-MM-DD"
};

export function Header({ remainingLives, date }: Props) {
  const dateLabel = date
    ? new Intl.DateTimeFormat("fr-FR", {
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
          <p className="text-[10px] text-on-surface-variant tracking-widest mt-1">
            {dateLabel}
          </p>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        {Array.from({ length: STARTING_LIVES }, (_, i) => (
          <Heart
            key={`heart-${i + 1}`}
            size={18}
            className={
              i < remainingLives
                ? "text-red-500 fill-red-500"
                : "text-on-surface-variant"
            }
          />
        ))}
      </div>
    </header>
  );
}
