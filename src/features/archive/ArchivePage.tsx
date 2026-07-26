import AppFooter from "@/app/AppFooter";
import { AppMark } from "@/components/AppMark";
import { BackLink } from "@/components/editorial/BackLink";
import { DisplayHeader } from "@/components/editorial/DisplayHeader";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { hasEmptyCell } from "@/features/game/logic/blockedDetection";
import {
  CONSTRAINT_BY_ID,
  type ConstraintId,
} from "@/features/game/logic/constraints";
import { formatGridDateLabel } from "@/features/game/logic/gridDateLabel";
import { getGridNumberForDate } from "@/features/game/logic/gridIssue";
import { loadPersistedGame } from "@/features/game/logic/persistence";
import { useLocale, useT } from "@/i18n/LocaleContext";
import { todayUTC } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { usePostHog } from "@posthog/react";
import { useQuery } from "convex/react";
import { Check, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import { isDailyGameFinished } from "./logic/dailyGate";
import {
  type PersistedTrainingGame,
  loadTrainingGames,
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

/**
 * Nombre d'essais d'une partie d'entraînement terminée, lu dans le stockage local
 * (l'entraînement n'écrit rien côté serveur). `null` tant que la partie est
 * jouable — la liste ne signale que le terminé.
 *
 * Une partie est terminée quand il ne reste aucune case vide : soit la grille est
 * pleine, soit les cases restantes sont bloquées. Les vies n'entrent pas en jeu,
 * puisque les essais sont illimités — et comme la grille finit donc presque
 * toujours pleine, seul le nombre d'essais distingue vraiment deux parties.
 */
function completedAttempts(
  game: PersistedTrainingGame | undefined,
): number | null {
  if (!game) return null;
  if (hasEmptyCell(game.cells)) return null;
  return game.failedAttempts;
}

export function ArchivePage() {
  const t = useT();
  const posthog = usePostHog();
  const { locale } = useLocale();
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
  if (!dailyFinished) return <Navigate to="/" replace />;

  return (
    <div className="min-h-svh bg-surface flex flex-col items-center px-4 py-6">
      <main className="w-full max-w-2xl flex flex-col gap-8 flex-1">
        {/* Même en-tête que les pages éditoriales (`LegalLayout`) : lien retour,
            marque, titre et eyebrow — l'archive est une page à part entière. */}
        <header className="flex flex-col gap-5">
          <BackLink to="/" label={t("archive.backToGame")} />

          <DisplayHeader
            as="h1"
            size="lg"
            leftIcon={<AppMark />}
            title={t("archive.title")}
            eyebrow={t("archive.eyebrow")}
          />
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
                attempts={completedAttempts(
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
  attempts,
}: {
  grid: ReplayableGrid;
  dateLabel: string;
  /** Essais de la partie terminée, ou `null` si la grille n'a pas été bouclée. */
  attempts: number | null;
}) {
  const t = useT();
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
        to={`/archive/${grid.date}`}
        className="flex items-center gap-3 rounded-xl bg-surface-low px-4 py-3 shadow-editorial transition-colors hover:bg-surface-high"
      >
        {/* Pastille d'accent sur les grilles encore à faire : signale ce qui
            reste à jouer sans ajouter de ligne de texte à chaque entrée. Le
            libellé équivalent reste lu par les lecteurs d'écran. */}
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            attempts === null ? "bg-brand" : "bg-transparent",
          )}
          aria-hidden
        />
        {attempts === null && (
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
          {attempts !== null && (
            <span className="flex items-center gap-1 text-xs text-on-surface-variant">
              <Check size={12} className="text-brand" aria-hidden />
              {t("archive.completed", { attempts })}
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
