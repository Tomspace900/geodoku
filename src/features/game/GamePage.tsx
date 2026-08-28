import { usePostHog } from "@posthog/react";
import { useQuery } from "convex/react";
import { History } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import AppFooter from "@/app/AppFooter";
import { Button } from "@/components/ui/button";
import { ErrorScreen } from "@/features/errors/components/ErrorScreen";
import { useBackendDownTimeout } from "@/features/errors/hooks/useBackendDownTimeout";
import { useGameState } from "@/features/game/hooks/useGameState";
import {
  getGridNumberForDate,
  getGridNumberForTodayUtc,
} from "@/features/game/logic/gridIssue";
import { useT } from "@/i18n/LocaleContext";
import { focusWithoutVisibleRing } from "@/lib/focus";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import { GameGrid } from "./components/GameGrid";
import { GridSkeleton } from "./components/GridSkeleton";
import { GuessModal } from "./components/GuessModal";
import { Header } from "./components/Header";
import { HowToPlayLink } from "./components/HowToPlayLink";
import { RarityHint } from "./components/RarityHint";
import { ResultScreen } from "./components/ResultScreen";
import { SolutionGrid } from "./components/SolutionGrid";
import { SurveyCta } from "./components/SurveyCta";

export function GamePage() {
  const posthog = usePostHog();
  const t = useT();
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
              />

              <RarityHint />

              {/* Gaté sur la fermeture de la modale de résultat : évite un second
                  CTA sondage monté en même temps que celui de ResultScreen (état
                  `done` désynchronisé) et le rend visible seulement une fois la
                  grille solution réellement à l'écran. */}
              {/* Surface de lecture : aucun primaire ici. Le retour au résultat
                  est l'action inverse de « Voir les réponses » — même niveau
                  qu'elle (secondary), pour que l'aller-retour soit symétrique. */}
              {resultModalDismissed && (
                <div className="flex flex-col gap-2">
                  <SurveyCta source="solution_screen" />
                  {/* Surface de lecture : aucun primaire. Un secondaire pour
                      revenir au score, puis un renvoi tertiaire vers l'archive —
                      `variant="link"` porte exactement le style des liens du
                      footer, l'icône reprend leur taille. Largeur bornée : un
                      bouton étiré sur toute la colonne se lit mal. */}
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
                    <Button
                      asChild
                      variant="link"
                      className="w-full justify-center text-xs mt-2"
                    >
                      <Link to="/archive">
                        <History
                          className="size-3 sm:size-3.5"
                          aria-hidden="true"
                        />
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
          onRated={() => markRated(state.date)}
          onViewAnswers={(source) => dismissResultModal(source)}
        />
      )}
    </div>
  );
}
