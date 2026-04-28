import { Button } from "@/components/ui/button";
import { SHARE_EMOJIS, STARTING_LIVES } from "@/features/game/logic/constants";
import {
  computeGridScore,
  computeOriginalityScore,
} from "@/features/game/logic/rarity";
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

const DIFFICULTY_RATINGS: ReadonlyArray<{
  rating: DifficultyRating;
  labelKey: "ui.feedbackTooEasy" | "ui.feedbackBalanced" | "ui.feedbackTooHard";
}> = [
  { rating: "too_easy", labelKey: "ui.feedbackTooEasy" },
  { rating: "balanced", labelKey: "ui.feedbackBalanced" },
  { rating: "too_hard", labelKey: "ui.feedbackTooHard" },
];

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
  const [hadFeedbackBeforeOpen] = useState(() => {
    if (!state.date) return false;
    return (
      localStorage.getItem(`${FEEDBACK_STORAGE_PREFIX}${state.date}`) === "1"
    );
  });
  const [feedbackThanksVisible, setFeedbackThanksVisible] = useState(false);
  const [ratingPending, setRatingPending] = useState(false);
  const gridScore = computeGridScore(state);
  const originality = computeOriginalityScore(state);
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
    if (hadFeedbackBeforeOpen || feedbackThanksVisible || ratingPending) {
      return;
    }

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
      setFeedbackThanksVisible(true);
    } finally {
      setRatingPending(false);
    }
  }

  return (
    <dialog
      open
      aria-labelledby="result-screen-title"
      className={cn(
        "fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none flex-col items-center justify-end bg-transparent p-0 border-0 outline-none",
        "focus:outline-none focus-visible:outline-none",
        "sm:justify-center",
      )}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: fermeture au clic sur le voile (Escape géré par useEffect) */}
      <div
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
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
          className="absolute right-4 top-4 z-20 rounded-md p-1.5 text-on-surface-variant hover:bg-surface-low hover:text-on-surface"
          aria-label={t("ui.closeResult")}
        >
          <X size={20} strokeWidth={1.75} />
        </button>

        <div className="flex flex-col items-center gap-2 text-center">
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

        <div className="flex flex-col items-center gap-1">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center leading-none">
            <span className="font-serif text-5xl font-medium tracking-tight text-brand">
              {gridScore.percent}%
            </span>
            <span
              className="shrink-0 select-none self-center pb-0.5 text-lg leading-none tracking-[0.12em] text-on-surface-variant/40"
              aria-hidden
            >
              {"\u2014"}
            </span>
            <span className="font-serif text-5xl font-medium italic tracking-tight text-on-surface">
              {originality.grade}
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-0.5 text-center text-[10px] tracking-widest uppercase text-on-surface-variant">
            <span>{t("ui.gridScore")}</span>
            <span className="text-on-surface-variant/60" aria-hidden>
              ·
            </span>
            <span>{t("ui.originalityScore")}</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
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

        <AchievementCard state={state} />

        {!hadFeedbackBeforeOpen &&
          (feedbackThanksVisible ? (
            <p className="text-center text-xs text-on-surface-variant">
              {t("ui.feedbackThanks")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] tracking-widest text-on-surface-variant uppercase text-center">
                {t("ui.feedbackQuestion")}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {DIFFICULTY_RATINGS.map(({ rating, labelKey }) => (
                  <Button
                    key={rating}
                    type="button"
                    variant="secondary"
                    disabled={ratingPending}
                    className="bg-surface-highest text-on-surface hover:bg-surface-highest/80"
                    onClick={() => handleRateDifficulty(rating)}
                  >
                    {t(labelKey)}
                  </Button>
                ))}
              </div>
            </div>
          ))}

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
          className="w-full text-center text-xs text-on-surface-variant underline underline-offset-2 decoration-outline-variant/40 hover:text-on-surface"
        >
          {t("ui.viewAnswers")}
        </button>

        <p className="text-center text-xs text-on-surface-variant italic">
          {t("ui.comeBackTomorrowGrid")}
        </p>
      </div>
    </dialog>
  );
}
