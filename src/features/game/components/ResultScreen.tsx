import { usePostHog } from "@posthog/react";
import { Copy, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AccentBar } from "@/components/editorial/AccentBar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SurveyCta } from "@/features/game/components/SurveyCta";
import {
  betterThanPercent,
  type Cohort,
  emptyCohort,
  isThinCohort,
} from "@/features/game/logic/cohort";
import { isOutOfLives } from "@/features/game/logic/lives";
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
  shareGameResult,
  shareSiteUrl,
} from "@/features/game/logic/share";
import type { CellGuessDistribution, GameState } from "@/features/game/types";
import { useLocale, useT } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { ResultSlides } from "./ResultSlides";
import { ScoreDisplay } from "./ScoreDisplay";
import { ScoreHistogram } from "./ScoreHistogram";
import { ShareEmojiGrid } from "./ShareEmojiGrid";
import { StandingPill } from "./StandingPill";

type Props = {
  state: GameState;
  gridNumber: number | null;
  distribution: Record<string, CellGuessDistribution> | undefined;
  /** « Toi et les autres » du jour ; `undefined` tant qu'il charge. */
  cohort: Cohort | null | undefined;
  onDismiss: () => void;
  onViewAnswers: () => void;
};

export function ResultScreen({
  state,
  gridNumber,
  distribution,
  cohort,
  onDismiss,
  onViewAnswers,
}: Props) {
  const posthog = usePostHog();
  const [shareFeedback, setShareFeedback] = useState<
    "shared" | "copied" | "failed" | null
  >(null);
  const shareFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const nativeShareAvailable = canUseNativeShare();
  const t = useT();
  const { locale } = useLocale();
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
    : isOutOfLives(state.lives)
      ? { status: "lostByLives" }
      : { status: "lostByBlock" };
  const resultTitleKeysForOutcome = resultTitleKeys(resultOutcome);
  const resultTitleKey =
    resultTitleKeysForOutcome[
      Math.floor(titleRoll * resultTitleKeysForOutcome.length)
    ];
  const histogram = cohort?.histogram ?? emptyCohort().histogram;
  const thinCohort = isThinCohort(histogram);
  const comparisonTrackedRef = useRef(false);

  function handleSlideChange(index: number, source: "swipe" | "dots" | "link") {
    if (index !== 1 || comparisonTrackedRef.current) return;
    comparisonTrackedRef.current = true;
    posthog?.capture("result_comparison_viewed", {
      grid_date: state.date,
      source: source === "link" ? "pill" : source,
      thin: thinCohort,
    });
  }

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
    const outcome = await shareGameResult(
      state,
      gridNumber,
      distribution,
      shareSiteUrl(locale),
    );
    // Une annulation est un choix du joueur : ni retour visuel, ni event.
    if (outcome === "cancelled") return;

    setShareFeedback(outcome);
    if (shareFeedbackTimeoutRef.current) {
      clearTimeout(shareFeedbackTimeoutRef.current);
    }
    shareFeedbackTimeoutRef.current = setTimeout(() => {
      setShareFeedback(null);
      shareFeedbackTimeoutRef.current = null;
    }, 2000);
    // Un échec presse-papiers (permission refusée, webview exotique) n'a rien
    // partagé : il se dit à l'écran, mais ne compte pas comme un partage.
    if (outcome === "failed") return;
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

        {/* Seule cette zone glisse (#70) : la grille d'emojis, puis les
            scores du jour. Hauteur fixe, pour que rien ne saute autour. La
            3ᵉ page reviendra aux ligues (#156). */}
        <ResultSlides
          onSlideChange={handleSlideChange}
          slides={(goTo) => [
            {
              id: "grid",
              label: t("ui.resultSlideGrid"),
              content: (
                <div className="flex h-[208px] flex-col items-center justify-center gap-3">
                  {cohort && scoreReady && score.total !== null && (
                    <StandingPill
                      percent={
                        thinCohort
                          ? null
                          : betterThanPercent(histogram, score.total)
                      }
                      onClick={() => goTo(1)}
                    />
                  )}
                  <ShareEmojiGrid
                    cells={state.cells}
                    distribution={distribution}
                    caption={`#GEODOKU${gridNumber !== null ? ` #${gridNumber}` : ""}`}
                  />
                </div>
              ),
            },
            {
              id: "others",
              label: t("ui.resultSlideOthers"),
              content: (
                <div className="h-[208px] px-1">
                  <ScoreHistogram histogram={histogram} score={score.total} />
                </div>
              ),
            },
          ]}
        />

        <div className="flex flex-col gap-3">
          {/* Plus de note de difficulté (#70) : le taux de victoire et les
              erreurs par case la disent mieux. Les réponses, puis le partage. */}
          <Button
            onClick={onViewAnswers}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            {t("ui.viewAnswers")}
          </Button>

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
                : shareFeedback === "failed"
                  ? t("ui.shareFailed")
                  : t("ui.share")}
          </Button>

          <SurveyCta source="result_screen" />
        </div>

        {/* Pas de renvoi vers l'archive ici : la modale sert le résultat du jour
            et son partage. L'accès aux grilles passées est proposé juste
            derrière, sur la vue solution, où le joueur atterrit en fermant. */}
        <p className="text-center text-xs text-on-surface-variant italic">
          {t("ui.comeBackTomorrowGrid")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
