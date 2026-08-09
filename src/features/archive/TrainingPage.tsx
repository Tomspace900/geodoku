import AppFooter from "@/app/AppFooter";
import { BackLink } from "@/components/editorial/BackLink";
import { Button } from "@/components/ui/button";
import { ErrorScreen } from "@/features/errors/components/ErrorScreen";
import { GameGrid } from "@/features/game/components/GameGrid";
import { GridSkeleton } from "@/features/game/components/GridSkeleton";
import { GuessModal } from "@/features/game/components/GuessModal";
import { Header } from "@/features/game/components/Header";
import { SolutionGrid } from "@/features/game/components/SolutionGrid";
import { getGridNumberForDate } from "@/features/game/logic/gridIssue";
import { loadPersistedGame } from "@/features/game/logic/persistence";
import { classifyReplayDate } from "@/features/game/logic/replayWindow";
import { useT } from "@/i18n/LocaleContext";
import { todayUTC } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { RotateCcw } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import { TrainingResultScreen } from "./components/TrainingResultScreen";
import { useTrainingGame } from "./hooks/useTrainingGame";
import { isDailyGameFinished } from "./logic/dailyGate";

function TrainingShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-svh bg-surface flex flex-col items-center px-4 py-6">
      <main
        className={cn(
          "w-full flex flex-col gap-5 flex-1",
          wide ? "max-w-2xl" : "max-w-[500px]",
        )}
      >
        {children}
      </main>
      <AppFooter className="mt-auto w-full shrink-0" />
    </div>
  );
}

function BackToArchive() {
  const t = useT();
  return <BackLink to="/archive" label={t("training.backToList")} />;
}

/**
 * Grille passée rejouée. Le garde de date est ici, dans le chunk lazy, et non
 * dans `App.tsx` : on classe l'URL **avant** de monter la requête, donc rien ne
 * part vers Convex pour une date future. Le refus qui compte reste celui du
 * serveur (`assertReplayableDate`) — celui-ci ne fait qu'éviter l'aller-retour
 * et offrir un écran parlant.
 */
export function TrainingPage() {
  const { date = "" } = useParams();
  const navigate = useNavigate();
  const today = todayUTC();
  const verdict = classifyReplayDate(date, today);

  // Décision synchrone, sur le seul stockage local : pas de flash de contenu
  // avant la redirection.
  const [dailyFinished] = useState(() =>
    isDailyGameFinished(loadPersistedGame(), today),
  );

  if (!dailyFinished) return <Navigate to="/" replace />;
  // Lien périmé ou mal formé : rien de malveillant, on ramène à l'archive.
  if (verdict === "too_old" || verdict === "malformed") {
    return <Navigate to="/archive" replace />;
  }
  if (verdict === "future") {
    return (
      <TrainingShell>
        <ErrorScreen
          variant="time-traveller"
          onBack={() => navigate("/archive", { replace: true })}
        />
      </TrainingShell>
    );
  }

  return <TrainingBoard date={date} />;
}

/**
 * Réutilise les composants de jeu du quotidien à l'identique : seul le compteur
 * d'en-tête change (essais au lieu de vies, porté par l'union `LivesState`).
 * Aucun envoi Convex — ni coup, ni fin de partie, ni notation de difficulté.
 *
 * Aucun event `cell_opened` non plus : il alimente le tunnel de la grille du
 * jour, et y verser des ouvertures d'entraînement fausserait ses comptages.
 * L'usage du mode se mesure via les events `training_*`, volontairement distincts.
 */
function TrainingBoard({ date }: { date: string }) {
  const t = useT();
  const {
    state,
    selectCell,
    submitGuess,
    restart,
    isLoading,
    hasGrid,
    validAnswers,
  } = useTrainingGame(date);

  // Rareté de la cohorte du jour concerné : complète et figée, donc le score
  // affiché est exact et stable (pas de marqueur « ≈ » qui bougerait).
  const distribution = useQuery(
    api.guesses.getGuessDistributionForDate,
    state.date ? { date: state.date } : "skip",
  );

  const [resultDismissed, setResultDismissed] = useState(false);
  useEffect(() => {
    if (state.status === "playing") setResultDismissed(false);
  }, [state.status]);

  const gridNumber = state.date ? getGridNumberForDate(state.date) : null;
  const isFinished = hasGrid && state.status !== "playing";

  function handleRestart() {
    setResultDismissed(false);
    restart();
  }

  return (
    <TrainingShell wide={isFinished}>
      <BackToArchive />
      <Header lives={state.lives} date={state.date} gridNumber={gridNumber} />

      {isLoading ? (
        <GridSkeleton />
      ) : hasGrid ? (
        <div className="flex flex-col gap-5">
          {isFinished ? (
            <SolutionGrid
              rows={state.rows}
              cols={state.cols}
              validAnswers={validAnswers}
              distribution={distribution ?? undefined}
              cells={state.cells}
              mode="training"
            />
          ) : (
            <GameGrid
              state={state}
              distribution={distribution ?? undefined}
              onCellClick={selectCell}
            />
          )}

          {/* Même disposition que la vue solution du quotidien : surface de
              lecture, donc aucun primaire — un secondaire pour l'action de la
              page, puis un renvoi tertiaire. Largeur bornée (un bouton qui court
              sur 672 px se lit mal). Pas de « Autre grille » ici : le retour aux
              archives est déjà en permanence en haut de page. */}
          {isFinished && resultDismissed && (
            <div className="mx-auto flex w-full max-w-md flex-col gap-2">
              <Button
                onClick={handleRestart}
                variant="secondary"
                size="lg"
                className="w-full"
              >
                <RotateCcw size={16} />
                {t("training.restart")}
              </Button>
              <Button
                type="button"
                variant="link"
                onClick={() => setResultDismissed(false)}
                className="w-full justify-center text-xs mt-2"
              >
                {t("ui.viewMyResult")}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-on-surface-variant">
          {t("training.noResult")}
        </p>
      )}

      {state.selectedCell !== null && (
        <GuessModal
          cell={state.selectedCell}
          state={state}
          validAnswers={validAnswers}
          onClose={() => selectCell(null)}
          onSubmit={submitGuess}
        />
      )}

      {isFinished && !resultDismissed && (
        <TrainingResultScreen
          state={state}
          gridNumber={gridNumber}
          distribution={distribution ?? undefined}
          onDismiss={() => setResultDismissed(true)}
          onRestart={handleRestart}
          onViewAnswers={() => setResultDismissed(true)}
        />
      )}
    </TrainingShell>
  );
}
