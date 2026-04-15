import { useGameState } from "@/features/game/hooks/useGameState";
import { useT } from "@/i18n/LocaleContext";
import { GameGrid } from "./GameGrid";
import { GuessModal } from "./GuessModal";
import { Header } from "./Header";
import { HowToPlayLink } from "./HowToPlayLink";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ResultScreen } from "./ResultScreen";

const LAUNCH_DATE_MS = new Date("2026-04-01T00:00:00Z").getTime();

function getGridNumber(): number {
  return Math.max(
    1,
    Math.floor((Date.now() - LAUNCH_DATE_MS) / 86_400_000) + 1,
  );
}

function LoadingSkeleton() {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: "minmax(0,1fr) repeat(3, minmax(0,1fr))" }}
    >
      {(
        [
          "r0c0",
          "r0c1",
          "r0c2",
          "r0c3",
          "r1c0",
          "r1c1",
          "r1c2",
          "r1c3",
          "r2c0",
          "r2c1",
          "r2c2",
          "r2c3",
          "r3c0",
          "r3c1",
          "r3c2",
          "r3c3",
        ] as const
      ).map((k) => (
        <div
          key={k}
          className="aspect-square rounded-xl bg-surface-highest animate-pulse"
        />
      ))}
    </div>
  );
}

export function GamePage() {
  const { state, selectCell, submitGuess, isLoading, hasGrid } = useGameState();
  const t = useT();
  const gridNumber = getGridNumber();

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-[500px] flex flex-col gap-5">
        <Header remainingLives={state.remainingLives} date={state.date} />

        {isLoading ? (
          <LoadingSkeleton />
        ) : hasGrid ? (
          <GameGrid state={state} onCellClick={(cell) => selectCell(cell)} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <p className="font-serif text-xl italic text-on-surface-variant">
              {t("ui.noGridToday")}
            </p>
            <p className="text-sm text-on-surface-variant">
              {t("ui.comeBackTomorrow")}
            </p>
          </div>
        )}

        <HowToPlayLink />
        <LocaleSwitcher />
      </div>

      {state.selectedCell !== null && (
        <GuessModal
          cell={state.selectedCell}
          state={state}
          onClose={() => selectCell(null)}
          onSubmit={submitGuess}
        />
      )}

      {state.status !== "playing" && (
        <ResultScreen state={state} gridNumber={gridNumber} />
      )}
    </div>
  );
}
