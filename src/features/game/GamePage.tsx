import { usePostHog } from "@posthog/react";
import { useQuery } from "convex/react";
import { History } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import AppFooter from "@/app/AppFooter";
import { Button } from "@/components/ui/button";
import { ErrorScreen } from "@/features/errors/components/ErrorScreen";
import { useBackendDownTimeout } from "@/features/errors/hooks/useBackendDownTimeout";
import { useConstraintSourceToast } from "@/features/game/hooks/useConstraintSourceToast";
import { useGameState } from "@/features/game/hooks/useGameState";
import { useSolutionDrawer } from "@/features/game/hooks/useSolutionDrawer";
import {
  getGridNumberForDate,
  getGridNumberForTodayUtc,
} from "@/features/game/logic/gridIssue";
import { useLocale, useT } from "@/i18n/LocaleContext";
import { focusWithoutVisibleRing } from "@/lib/focus";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import { ConstraintSourceToast } from "./components/ConstraintSourceToast";
import { GameGrid } from "./components/GameGrid";
import { GridSkeleton } from "./components/GridSkeleton";
import { GuessModal } from "./components/GuessModal";
import { Header } from "./components/Header";
import { HowToPlayLink } from "./components/HowToPlayLink";
import { RarityHint } from "./components/RarityHint";
import { ResultScreen } from "./components/ResultScreen";
import { SolutionDrawer } from "./components/SolutionDrawer";
import { SolutionGrid } from "./components/SolutionGrid";
import { SurveyCta } from "./components/SurveyCta";

export function GamePage() {
  const posthog = usePostHog();
  const t = useT();
  const { localizedPath } = useLocale();
  const {
    state,
    selectCell,
    submitGuess,
    markRated,
    isLoading,
    hasGrid,
    validAnswers,
  } = useGameState();
  const isBackendDown = useBackendDownTimeout(isLoading);
  const gridNumber = state.date
    ? getGridNumberForDate(state.date)
    : getGridNumberForTodayUtc();

  // Abonnée dès le chargement de la grille, partie en cours incluse : les badges
  // de rareté sont dynamiques pendant le jeu comme sur l'écran de fin.
  const guessDistribution = useQuery(
    api.guesses.getTodayGuessDistribution,
    state.date ? {} : "skip",
  );

  const [resultModalDismissed, setResultModalDismissed] = useState(false);
  const resultTriggerRef = useRef<HTMLButtonElement>(null);
  const prevStatusRef = useRef(state.status);
  const sourceToast = useConstraintSourceToast({
    gridDate: state.date,
    mode: state.mode,
    selectedCell: state.selectedCell,
  });
  const solutionDrawer = useSolutionDrawer({
    gridDate: state.date,
    mode: state.mode,
    // La grille solution est montée sous la modale de résultat : elle n'est
    // vraiment à l'écran qu'une fois celle-ci fermée.
    visible: state.status !== "playing" && resultModalDismissed,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: réinitialiser modale / vue lorsque la date de grille change (jour suivant)
  useEffect(() => {
    setResultModalDismissed(false);
  }, [state.date]);

  useEffect(() => {
    if (state.status === "playing") {
      setResultModalDismissed(false);
    } else if (prevStatusRef.current === "playing") {
      setResultModalDismissed(false);
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  const showResultModal = state.status !== "playing" && !resultModalDismissed;

  useEffect(() => {
    if (state.status === "playing" || !resultModalDismissed) return;
    const timer = window.setTimeout(
      () => focusWithoutVisibleRing(resultTriggerRef.current),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [resultModalDismissed, state.status]);

  function dismissResultModal(
    source:
      | "dismiss_modal"
      | "view_answers_button"
      | "skip_feedback" = "dismiss_modal",
  ) {
    if (showResultModal) {
      posthog?.capture("solution_viewed", {
        grid_date: state.date,
        outcome: state.status,
        source,
      });
    }
    setResultModalDismissed(true);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: posthog is a stable ref
  useEffect(() => {
    if (isBackendDown) {
      posthog?.capture("backend_timeout_shown");
    }
  }, [isBackendDown]);

  const contentMaxWidth =
    state.status !== "playing" ? "max-w-2xl" : "max-w-[500px]";
  const isSolutionView = hasGrid && state.status !== "playing";

  return (
    <div className="min-h-svh bg-surface flex flex-col items-center px-4 py-6">
      <main
        className={cn("w-full flex flex-col gap-5 flex-1", contentMaxWidth)}
      >
        <Header lives={state.lives} date={state.date} gridNumber={gridNumber} />

        {isBackendDown ? (
          <ErrorScreen variant="backend-down" />
        ) : isLoading ? (
          <GridSkeleton />
        ) : hasGrid ? (
          state.status !== "playing" ? (
            <div className="flex flex-col gap-5">
              <SolutionGrid
                rows={state.rows}
                cols={state.cols}
                validAnswers={validAnswers}
                distribution={guessDistribution ?? undefined}
                cells={state.cells}
                onHeaderClick={solutionDrawer.openConstraint}
                onCellClick={solutionDrawer.openCell}
              />

              <RarityHint />

              {/* Gaté sur la fermeture de la modale de résultat : évite un second
                  CTA sondage monté en même temps que celui de ResultScreen (état
                  `done` désynchronisé) et le rend visible seulement une fois la
                  grille solution réellement à l'écran. */}
              {/* Le retour au résultat est l'action inverse de « Voir les
                  réponses » : même niveau qu'elle (secondary), pour que
                  l'aller-retour soit symétrique. */}
              {resultModalDismissed && (
                <div className="flex flex-col gap-2">
                  <SurveyCta source="solution_screen" />
                  {/* Un secondaire pour revenir au score, puis l'entraînement au
                      même gabarit en primaire : c'est la suite naturelle une fois
                      la grille du jour lue, et un lien de footer passait
                      inaperçu (#148). Largeur bornée : un bouton étiré sur toute
                      la colonne se lit mal. */}
                  <div className="mx-auto flex w-full max-w-md flex-col gap-2">
                    <Button
                      ref={resultTriggerRef}
                      type="button"
                      variant="secondary"
                      size="lg"
                      onClick={() => setResultModalDismissed(false)}
                      className="w-full"
                    >
                      {t("ui.viewMyResult")}
                    </Button>
                    <Button asChild size="lg" className="w-full">
                      <Link to={localizedPath("/archive")}>
                        <History aria-hidden="true" />
                        {t("ui.replayPastGrids")}
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <GameGrid
                state={state}
                distribution={guessDistribution ?? undefined}
                onCellClick={(cell) => {
                  posthog?.capture("cell_opened", {
                    grid_date: state.date,
                    cell: `${cell.row},${cell.col}`,
                  });
                  selectCell(cell);
                }}
                onHeaderClick={(id) => sourceToast.onHeaderClick(id)}
                onBlockedCellClick={sourceToast.onBlockedCellClick}
              />

              <RarityHint />
            </div>
          )
        ) : (
          <ErrorScreen variant="no-grid-today" />
        )}

        {!isSolutionView && <HowToPlayLink />}
      </main>

      <AppFooter className="mt-auto w-full shrink-0" />

      {state.selectedCell !== null && (
        <GuessModal
          cell={state.selectedCell}
          state={state}
          validAnswers={validAnswers}
          onClose={() => selectCell(null)}
          onSubmit={submitGuess}
        />
      )}

      {showResultModal && (
        <ResultScreen
          state={state}
          gridNumber={gridNumber}
          distribution={guessDistribution ?? undefined}
          onDismiss={() => dismissResultModal("dismiss_modal")}
          onRated={(rating) => markRated(state.date, rating)}
          onViewAnswers={(source) => dismissResultModal(source)}
        />
      )}

      <ConstraintSourceToast toast={sourceToast} />

      {solutionDrawer.target !== null && (
        <SolutionDrawer
          state={state}
          validAnswers={validAnswers}
          distribution={guessDistribution ?? undefined}
          drawer={solutionDrawer}
        />
      )}
    </div>
  );
}
