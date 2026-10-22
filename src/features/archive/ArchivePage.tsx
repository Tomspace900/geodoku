import { usePostHog } from "@posthog/react";
import { useQuery } from "convex/react";
import { Check, ChevronRight, Flag } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import AppFooter from "@/app/AppFooter";
import { AppMark } from "@/components/AppMark";
import { BackLink } from "@/components/editorial/BackLink";
import { DisplayHeader } from "@/components/editorial/DisplayHeader";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import {
  CONSTRAINT_BY_ID,
  type ConstraintId,
} from "@/features/game/logic/constraints";
import { formatGridDateLabel } from "@/features/game/logic/gridDateLabel";
import { getGridNumberForDate } from "@/features/game/logic/gridIssue";
import { loadPersistedGame } from "@/features/game/logic/persistence";
import { REPLAY_WINDOW_DAYS } from "@/features/game/logic/replayWindow";
import { useLocale, useT } from "@/i18n/LocaleContext";
import { todayUTC } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import { isDailyGameFinished } from "./logic/dailyGate";
import { type RowOutcome, rowOutcome } from "./logic/rowOutcome";
import {
  loadTrainingGames,
  type PersistedTrainingGame,
} from "./logic/trainingPersistence";

/**
 * Forme attendue d'une ligne d'archive. Volontairement non appliquée au résultat
 * de `useQuery` : c'est le passage à `ArchiveRow` qui confronte le type inféré du
 * serveur à celui-ci, donc une dérive du endpoint casse le typecheck.
 */
type ReplayableGrid = {
  date: string;
  rows: string[];
  cols: string[];
};

export function ArchivePage() {
  const t = useT();
  const posthog = usePostHog();
  const { locale, localizedPath } = useLocale();
  const today = todayUTC();

  const [dailyFinished] = useState(() =>
    isDailyGameFinished(loadPersistedGame(), today),
  );
  const [trainingGames] = useState<PersistedTrainingGame[]>(() =>
    dailyFinished ? loadTrainingGames(today) : [],
  );

  const grids = useQuery(
    api.grids.getReplayableGrids,
    dailyFinished ? {} : "skip",
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: posthog is a stable ref
  useEffect(() => {
    if (dailyFinished) posthog?.capture("archive_opened");
  }, [dailyFinished]);

  // L'archive n'ouvre qu'une fois la grille du jour terminée.
  if (!dailyFinished) return <Navigate to={localizedPath("/")} replace />;

  return (
    <div className="min-h-svh bg-surface flex flex-col items-center px-4 py-6">
      <main className="w-full max-w-2xl flex flex-col gap-8 flex-1">
        {/* Même en-tête que les pages éditoriales (`LegalLayout`) : lien retour,
            marque, titre et eyebrow : l'entraînement est une page à part entière. */}
        <header className="flex flex-col gap-5">
          <BackLink to={localizedPath("/")} label={t("archive.backToGame")} />

          <DisplayHeader
            as="h1"
            size="lg"
            leftIcon={<AppMark />}
            title={t("archive.title")}
            eyebrow={t("archive.eyebrow")}
          />
          <p className="font-sans text-sm text-on-surface-variant">
            {t("archive.subtitle", { days: REPLAY_WINDOW_DAYS })}
          </p>
        </header>

        {grids === undefined ? (
          <output aria-live="polite" className="sr-only">
            {t("ui.loading")}
          </output>
        ) : grids.length === 0 ? (
          <p className="py-8 text-center text-sm text-on-surface-variant">
            {t("archive.empty")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {grids.map((grid) => (
              <ArchiveRow
                key={grid.date}
                grid={grid}
                dateLabel={formatGridDateLabel(grid.date, locale)}
                outcome={rowOutcome(
                  trainingGames.find((game) => game.date === grid.date),
                )}
              />
            ))}
          </ul>
        )}
      </main>

      <AppFooter className="mt-auto w-full shrink-0" />
    </div>
  );
}

function ArchiveRow({
  grid,
  dateLabel,
  outcome,
}: {
  grid: ReplayableGrid;
  dateLabel: string;
  outcome: RowOutcome;
}) {
  const t = useT();
  const { localizedPath } = useLocale();
  const gridNumber = getGridNumberForDate(grid.date);
  // Les contraintes archivées restent résolvables (`CONSTRAINT_BY_ID` les couvre),
  // ce qui garantit un libellé lisible même pour une contrainte retirée depuis.
  const constraintLabels = [...grid.rows, ...grid.cols]
    .map((id) => CONSTRAINT_BY_ID.get(id as ConstraintId))
    .filter((constraint) => constraint !== undefined)
    .map((constraint) => t(constraint.labelKey));

  return (
    <li>
      <Link
        to={localizedPath(`/archive/${grid.date}`)}
        className="flex items-center gap-3 rounded-xl bg-surface-low px-4 py-3 shadow-editorial transition-colors hover:bg-surface-high"
      >
        {/* Pastille d'accent sur les grilles encore à faire : signale ce qui
            reste à jouer sans ajouter de ligne de texte à chaque entrée. Le
            libellé équivalent reste lu par les lecteurs d'écran. */}
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            outcome.kind === "unfinished" ? "bg-brand" : "bg-transparent",
          )}
          aria-hidden
        />
        {outcome.kind === "unfinished" && (
          <span className="sr-only">{t("archive.notPlayed")}</span>
        )}

        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <Eyebrow as="span">
            {dateLabel}
            {gridNumber !== null && (
              <span className="normal-case tracking-normal text-on-surface-variant/70">
                {` · #${gridNumber}`}
              </span>
            )}
          </Eyebrow>
          <p className="truncate font-serif text-sm text-on-surface">
            {constraintLabels.join(" · ")}
          </p>
          {outcome.kind === "completed" && (
            <span className="flex items-center gap-1 text-xs text-on-surface-variant">
              <Check size={12} className="text-brand" aria-hidden />
              {t("archive.completed", { attempts: outcome.attempts })}
            </span>
          )}
          {outcome.kind === "givenUp" && (
            <span className="flex items-center gap-1 text-xs text-on-surface-variant">
              <Flag size={12} aria-hidden />
              {t("archive.givenUp")}
            </span>
          )}
        </div>
        <ChevronRight
          size={18}
          className="shrink-0 text-on-surface-variant"
          aria-hidden
        />
      </Link>
    </li>
  );
}
