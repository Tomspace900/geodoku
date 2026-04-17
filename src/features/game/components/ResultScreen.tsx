import { Button } from "@/components/ui/button";
import {
  MAX_SCORE,
  SHARE_EMOJIS,
  STARTING_LIVES,
} from "@/features/game/logic/constants";
import { computeScore } from "@/features/game/logic/rarity";
import {
  copyShareToClipboard,
  formatShareString,
} from "@/features/game/logic/share";
import type { CellKey, GameState } from "@/features/game/types";
import { useT } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { Copy, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { AchievementCard } from "./AchievementCard";

const ROWS = [0, 1, 2] as const;
const COLS = [0, 1, 2] as const;
const FEEDBACK_STORAGE_PREFIX = "geodoku:rated:";

type DifficultyRating = "too_easy" | "balanced" | "too_hard";

type Props = {
  state: GameState;
  gridNumber: number;
  onDismiss: () => void;
  onViewAnswers: () => void;
};

export function ResultScreen({
  state,
  gridNumber,
  onDismiss,
  onViewAnswers,
}: Props) {
  const [copied, setCopied] = useState(false);
  const t = useT();
  const [hasRated, setHasRated] = useState(() => {
    if (!state.date) return false;
    return (
      localStorage.getItem(`${FEEDBACK_STORAGE_PREFIX}${state.date}`) === "1"
    );
  });
  const [ratingPending, setRatingPending] = useState(false);
  const score = computeScore(state);
  const isWon = state.status === "won";
  const submitGridFeedback = useMutation(api.grids.submitGridFeedback);

  async function handleShare() {
    const text = formatShareString(state, gridNumber);
    const ok = await copyShareToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  useEffect(() => {
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onDismiss]);

  async function handleRateDifficulty(rating: DifficultyRating) {
    if (hasRated || ratingPending) return;

    const filledCells = Object.values(state.cells).filter(
      (cell) => cell.status === "filled",
    ).length;
    const failedGuesses = STARTING_LIVES - state.remainingLives;

    setRatingPending(true);
    try {
      await submitGridFeedback({
        date: state.date,
        rating,
        won: state.status === "won",
        livesLeft: state.remainingLives,
        filledCells,
        guessesSubmitted: filledCells + failedGuesses,
      });
      localStorage.setItem(`${FEEDBACK_STORAGE_PREFIX}${state.date}`, "1");
      setHasRated(true);
    } finally {
      setRatingPending(false);
    }
  }

  return (
    <dialog
      open
      aria-labelledby="result-screen-title"
      className={cn(
        "fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none flex-col items-center justify-end bg-transparent p-0 outline-none border-0",
        "sm:justify-center",
      )}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: fermeture au clic sur le voile (Escape géré par useEffect) */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onDismiss}
        aria-hidden
      />
      <div
        className={cn(
          "relative z-10 bg-surface-lowest w-full max-w-[500px] shadow-editorial",
          "rounded-t-2xl sm:rounded-2xl",
          "p-6 flex flex-col gap-5",
          "animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300",
        )}
      >
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 rounded-md p-1.5 text-on-surface-variant hover:bg-surface-low hover:text-on-surface"
          aria-label={t("ui.closeResult")}
        >
          <X size={20} strokeWidth={1.75} />
        </button>

        {/* Title */}
        <div className="flex flex-col items-center gap-2 text-center pr-8">
          <h2
            id="result-screen-title"
            className="font-serif text-3xl italic text-on-surface"
          >
            {isWon ? t("ui.magnificent") : t("ui.tooBad")}
          </h2>
          <div className="w-12 h-1 bg-brand rounded-full" />
          <p className="text-[10px] tracking-widest text-on-surface-variant uppercase mt-1">
            {t("ui.finalResult")}
          </p>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center gap-1">
          <span className="font-serif text-5xl font-medium text-brand">
            {score.percent}%
          </span>
          <span className="text-xs text-on-surface-variant">
            {t("ui.rarityScore", { raw: score.raw, max: MAX_SCORE })}
          </span>
        </div>

        {/* Emoji grid */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] tracking-widest text-on-surface-variant uppercase mb-1">
            {t("ui.yourGrid")}
          </p>
          {ROWS.map((row) => (
            <div key={row} className="flex gap-1">
              {COLS.map((col) => {
                const cell = state.cells[`${row},${col}` as CellKey];
                const emoji =
                  cell.status === "filled"
                    ? SHARE_EMOJIS[cell.rarityTier]
                    : SHARE_EMOJIS.failed;
                return (
                  <span
                    key={col}
                    className="text-2xl leading-none w-9 h-9 flex items-center justify-center"
                  >
                    {emoji}
                  </span>
                );
              })}
            </div>
          ))}
          <p className="text-xs text-on-surface-variant mt-1">
            #GEODOKU #{gridNumber}
          </p>
        </div>

        {/* Achievement */}
        <AchievementCard state={state} />

        {/* Feedback */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] tracking-widest text-on-surface-variant uppercase text-center">
            {t("ui.feedbackQuestion")}
          </p>
          {hasRated ? (
            <p className="text-center text-xs text-on-surface-variant">
              {t("ui.feedbackThanks")}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button
                type="button"
                variant="secondary"
                disabled={ratingPending}
                className="bg-surface-highest text-on-surface hover:bg-surface-highest/80"
                onClick={() => handleRateDifficulty("too_easy")}
              >
                {t("ui.feedbackTooEasy")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={ratingPending}
                className="bg-surface-highest text-on-surface hover:bg-surface-highest/80"
                onClick={() => handleRateDifficulty("balanced")}
              >
                {t("ui.feedbackBalanced")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={ratingPending}
                className="bg-surface-highest text-on-surface hover:bg-surface-highest/80"
                onClick={() => handleRateDifficulty("too_hard")}
              >
                {t("ui.feedbackTooHard")}
              </Button>
            </div>
          )}
        </div>

        {/* Share button */}
        <Button
          onClick={handleShare}
          className="w-full bg-on-surface text-surface-lowest hover:bg-on-surface/90 gap-2"
          size="lg"
        >
          <Copy size={16} />
          {copied ? t("ui.shareCopied") : t("ui.share")}
        </Button>

        <button
          type="button"
          onClick={onViewAnswers}
          className="text-center text-xs text-on-surface-variant underline underline-offset-2 decoration-outline-variant/40 hover:text-on-surface"
        >
          {t("ui.viewAnswers")}
        </button>

        {/* Footer */}
        <p className="text-center text-xs text-on-surface-variant italic">
          {t("ui.comeBackTomorrowGrid")}
        </p>
      </div>
    </dialog>
  );
}
