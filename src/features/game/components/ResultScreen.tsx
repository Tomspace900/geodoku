import { DisplayHeader } from "@/components/editorial/DisplayHeader";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { Button } from "@/components/ui/button";
import { SurveyCta } from "@/features/game/components/SurveyCta";
import { getOrCreateClientId } from "@/features/game/logic/clientId";
import {
  type ResultOutcome,
  resultTitleKeys,
} from "@/features/game/logic/resultTitle";
import {
  computeScore,
  computeScoreBreakdown,
} from "@/features/game/logic/scoreVariant";
import {
  canUseNativeShare,
  cellShareEmoji,
  shareGameResult,
} from "@/features/game/logic/share";
import type {
  CellGuessDistribution,
  CellKey,
  GameState,
} from "@/features/game/types";
import { useT } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { cn } from "@/lib/utils";
import { usePostHog } from "@posthog/react";
import { useMutation } from "convex/react";
import { Copy, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { ScoreDisplay } from "./ScoreDisplay";

const ROWS = [0, 1, 2] as const;
const COLS = [0, 1, 2] as const;

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
  gridNumber: number | null;
  distribution: Record<string, CellGuessDistribution> | undefined;
  onDismiss: () => void;
  onRated: () => void;
  onViewAnswers: (source: "view_answers_button" | "skip_feedback") => void;
};

export function ResultScreen({
  state,
  gridNumber,
  distribution,
  onDismiss,
  onRated,
  onViewAnswers,
}: Props) {
  const posthog = usePostHog();
  const [shareFeedback, setShareFeedback] = useState<
    "shared" | "copied" | null
  >(null);
  const shareFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const nativeShareAvailable = canUseNativeShare();
  const t = useT();
  // Snapshot à l'ouverture : si la grille était déjà notée (partie reprise),
  // on affiche directement « voir les réponses » plutôt que les boutons.
  const [hadFeedbackBeforeOpen] = useState(() => state.rated);
  const [feedbackThanksVisible, setFeedbackThanksVisible] = useState(false);
  const [ratingPending, setRatingPending] = useState(false);
  const scoreBreakdown = computeScoreBreakdown(state, distribution);
  const score = computeScore(scoreBreakdown);
  const scoreReady = scoreBreakdown.shares !== null;
  const isWon = state.status === "won";
  // Titre de fin pioché une fois (avec un peu d'aléatoire) selon l'issue : palier de
  // score en victoire, consolation en défaite par vies, libellé unique en cas de
  // blocage (rare). Le total est déjà chiffré à l'ouverture (rareté abonnée au
  // chargement de la grille) ; à défaut on retombe sur la part certaine grille + vies.
  const resultOutcome: ResultOutcome = isWon
    ? {
        status: "won",
        total: score.total ?? score.gridValue + score.livesValue,
      }
    : state.remainingLives > 0
      ? { status: "lostByBlock" }
      : { status: "lostByLives" };
  const [resultTitleKey] = useState<TKey>(() => {
    const keys = resultTitleKeys(resultOutcome);
    return keys[Math.floor(Math.random() * keys.length)];
  });
  const hasRated = hadFeedbackBeforeOpen || feedbackThanksVisible;
  const submitGridFeedback = useMutation(api.grids.submitGridFeedback);

  const viewedTrackedRef = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: une seule fois, dès que la rareté dynamique est résolue (sinon elle manquerait en analytics)
  useEffect(() => {
    if (viewedTrackedRef.current || !scoreReady) return;
    viewedTrackedRef.current = true;
    posthog?.capture("result_screen_viewed", {
      grid_date: state.date,
      grid_number: gridNumber,
      outcome: state.status,
      score_total: score.total,
      score_grid: score.gridValue,
      score_rarity: score.rarityValue,
      score_lives: score.livesValue,
      score_estimated: scoreBreakdown.estimated,
    });
  }, [scoreReady]);

  async function handleShare() {
    if (!scoreReady) return;
    const outcome = await shareGameResult(state, gridNumber, distribution);
    if (outcome === "cancelled" || outcome === "failed") return;

    setShareFeedback(outcome);
    if (shareFeedbackTimeoutRef.current) {
      clearTimeout(shareFeedbackTimeoutRef.current);
    }
    shareFeedbackTimeoutRef.current = setTimeout(() => {
      setShareFeedback(null);
      shareFeedbackTimeoutRef.current = null;
    }, 2000);
    posthog?.capture("result_shared", {
      grid_date: state.date,
      grid_number: gridNumber,
      outcome: state.status,
      score_total: score.total,
      score_grid: score.gridValue,
      score_rarity: score.rarityValue,
      score_lives: score.livesValue,
      share_method: outcome === "shared" ? "native" : "clipboard",
    });
  }

  useEffect(() => {
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onDismiss]);

  useEffect(() => {
    return () => {
      if (shareFeedbackTimeoutRef.current) {
        clearTimeout(shareFeedbackTimeoutRef.current);
      }
    };
  }, []);

  async function handleRateDifficulty(rating: DifficultyRating) {
    if (hadFeedbackBeforeOpen || feedbackThanksVisible || ratingPending) {
      return;
    }

    setRatingPending(true);
    try {
      await submitGridFeedback({
        date: state.date,
        rating,
        clientId: getOrCreateClientId(),
      });
      onRated();
      setFeedbackThanksVisible(true);
      posthog?.capture("difficulty_rated", {
        rating,
        grid_date: state.date,
        outcome: state.status,
      });
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
          "rounded-t-2xl sm:rounded-xl",
          "p-6 flex flex-col gap-5",
          "max-h-[90dvh] overflow-y-auto",
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

        <DisplayHeader
          as="h2"
          size="lg"
          centered
          title={<span id="result-screen-title">{t(resultTitleKey)}</span>}
        />

        <div className="flex justify-center">
          <ScoreDisplay breakdown={scoreBreakdown} />
        </div>

        <div className="flex flex-col items-center gap-1">
          {ROWS.map((row) => (
            <div key={row} className="flex gap-1">
              {COLS.map((col) => {
                const key = `${row},${col}` as CellKey;
                const emoji = cellShareEmoji(
                  state.cells[key],
                  distribution?.[key],
                );
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
            {`#GEODOKU${gridNumber !== null ? ` #${gridNumber}` : ""}`}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {hasRated ? (
            <Button
              onClick={() => onViewAnswers("view_answers_button")}
              variant="secondary"
              size="lg"
              className="w-full"
            >
              {t("ui.viewAnswers")}
            </Button>
          ) : (
            <>
              <Eyebrow className="text-center">
                {t("ui.feedbackQuestion")}
              </Eyebrow>
              <div className="grid grid-cols-3 gap-1.5">
                {DIFFICULTY_RATINGS.map(({ rating, labelKey }) => (
                  <Button
                    key={rating}
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={ratingPending}
                    className="h-auto min-h-9 whitespace-normal px-2 py-2 text-xs leading-tight"
                    onClick={() => handleRateDifficulty(rating)}
                  >
                    {t(labelKey)}
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                variant="link"
                onClick={() => onViewAnswers("skip_feedback")}
                className="self-center text-xs"
              >
                {t("ui.skipFeedback")}
              </Button>
            </>
          )}

          <Button
            onClick={handleShare}
            className="w-full"
            size="lg"
            disabled={!scoreReady}
          >
            {nativeShareAvailable ? <Share2 size={16} /> : <Copy size={16} />}
            {shareFeedback === "shared"
              ? t("ui.shareShared")
              : shareFeedback === "copied"
                ? t("ui.shareCopied")
                : t("ui.share")}
          </Button>

          <SurveyCta source="result_screen" />
        </div>

        <p className="text-center text-xs text-on-surface-variant italic">
          {t("ui.comeBackTomorrowGrid")}
        </p>
      </div>
    </dialog>
  );
}
