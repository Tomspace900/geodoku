import { AccentBar } from "@/components/editorial/AccentBar";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SurveyCta } from "@/features/game/components/SurveyCta";
import { getOrCreateClientId } from "@/features/game/logic/clientId";
import {
  clearPendingOperationId,
  getOrCreatePendingOperationId,
} from "@/features/game/logic/operationIds";
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
import { cn } from "@/lib/utils";
import { usePostHog } from "@posthog/react";
import { useMutation } from "convex/react";
import { Copy, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { ScoreDisplay } from "./ScoreDisplay";

const ROWS = [0, 1, 2] as const;
const COLS = [0, 1, 2] as const;

type DifficultyRating = "too_easy" | "balanced" | "too_hard";

type RatingSubmissionState =
  | { status: "idle" }
  | { status: "pending"; rating: DifficultyRating }
  | { status: "error"; rating: DifficultyRating }
  | { status: "success"; rating: DifficultyRating };

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
  const [ratingSubmission, setRatingSubmission] =
    useState<RatingSubmissionState>({ status: "idle" });
  const scoreBreakdown = computeScoreBreakdown(state, distribution);
  const score = computeScore(scoreBreakdown);
  const scoreReady = scoreBreakdown.shares !== null;
  const isWon = state.status === "won";
  const [titleRoll] = useState(Math.random);
  const [titleTotal, setTitleTotal] = useState<number | null>(
    () => score.total,
  );

  // En victoire, le palier se fige au premier score complet : le fallback permet
  // d'afficher immédiatement le titre si la rareté charge encore, puis le corrige
  // une seule fois. Le même tirage est réutilisé entre banques et ne reroule pas.
  useEffect(() => {
    if (titleTotal === null && score.total !== null) {
      setTitleTotal(score.total);
    }
  }, [score.total, titleTotal]);

  const resultOutcome: ResultOutcome = isWon
    ? {
        status: "won",
        total: titleTotal ?? score.gridValue + score.livesValue,
      }
    : state.remainingLives > 0
      ? { status: "lostByBlock" }
      : { status: "lostByLives" };
  const resultTitleKeysForOutcome = resultTitleKeys(resultOutcome);
  const resultTitleKey =
    resultTitleKeysForOutcome[
      Math.floor(titleRoll * resultTitleKeysForOutcome.length)
    ];
  const hasRated =
    hadFeedbackBeforeOpen || ratingSubmission.status === "success";
  const submitGridFeedback = useMutation(api.grids.submitTodayGridFeedback);

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
    return () => {
      if (shareFeedbackTimeoutRef.current) {
        clearTimeout(shareFeedbackTimeoutRef.current);
      }
    };
  }, []);

  async function handleRateDifficulty(rating: DifficultyRating) {
    if (
      hadFeedbackBeforeOpen ||
      ratingSubmission.status === "pending" ||
      ratingSubmission.status === "success"
    ) {
      return;
    }

    const operationSlot = `grid-feedback:${state.date}`;
    const operationId = getOrCreatePendingOperationId(operationSlot);
    setRatingSubmission({ status: "pending", rating });
    try {
      await submitGridFeedback({
        operationId,
        rating,
        clientId: getOrCreateClientId(),
      });
      clearPendingOperationId(operationSlot, operationId);
      onRated();
      setRatingSubmission({ status: "success", rating });
      posthog?.capture("difficulty_rated", {
        $insert_id: operationId,
        rating,
        grid_date: state.date,
        outcome: state.status,
      });
    } catch {
      setRatingSubmission({ status: "error", rating });
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <DialogContent
        placement="bottom-sheet"
        closeLabel={t("ui.closeResult")}
        className={cn(
          "max-h-[90dvh] overflow-y-auto sm:max-w-[500px]",
          "flex flex-col gap-5",
        )}
      >
        <div className="flex flex-col items-center text-center">
          <DialogTitle className="font-serif text-3xl font-medium italic leading-none tracking-normal text-on-surface">
            {t(resultTitleKey)}
          </DialogTitle>
          <AccentBar className="mt-1" />
          <DialogDescription className="sr-only">
            {t("ui.resultDialogDescription")}
          </DialogDescription>
        </div>

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
                    disabled={ratingSubmission.status !== "idle"}
                    className="h-auto min-h-9 whitespace-normal px-2 py-2 text-xs leading-tight"
                    onClick={() => handleRateDifficulty(rating)}
                  >
                    {t(labelKey)}
                  </Button>
                ))}
              </div>
              {ratingSubmission.status === "error" && (
                <div
                  role="alert"
                  className="rounded-lg bg-error/10 px-3 py-2 text-center text-xs text-error"
                >
                  <p>{t("ui.feedbackError")}</p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="mt-1 text-error"
                    onClick={() =>
                      handleRateDifficulty(ratingSubmission.rating)
                    }
                  >
                    {t("ui.feedbackRetry")}
                  </Button>
                </div>
              )}
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
      </DialogContent>
    </Dialog>
  );
}
