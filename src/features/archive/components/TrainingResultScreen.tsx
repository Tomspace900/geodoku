import { usePostHog } from "@posthog/react";
import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AccentBar } from "@/components/editorial/AccentBar";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScoreDisplay } from "@/features/game/components/ScoreDisplay";
import { ShareEmojiGrid } from "@/features/game/components/ShareEmojiGrid";
import { failedAttemptCount } from "@/features/game/logic/lives";
import {
  type ResultOutcome,
  resultTitleKeys,
} from "@/features/game/logic/resultTitle";
import {
  computeScore,
  computeScoreBreakdown,
} from "@/features/game/logic/scoreVariant";
import type { CellGuessDistribution, GameState } from "@/features/game/types";
import { useT } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";

type Props = {
  state: GameState;
  gridNumber: number | null;
  distribution: Record<string, CellGuessDistribution> | undefined;
  onDismiss: () => void;
  onRestart: () => void;
  onViewAnswers: () => void;
};

/**
 * Écran de fin d'entraînement. Volontairement distinct de celui du jour : pas de
 * partage (les emojis n'ont de sens comparés que le même jour), pas de notation
 * de difficulté (retour réservé à la grille du jour), pas de « revenez demain ».
 * Le score est sur 900 — la part vies est neutralisée — et les essais ratés sont
 * affichés à part, comme mesure de la performance.
 */
export function TrainingResultScreen({
  state,
  gridNumber,
  distribution,
  onDismiss,
  onRestart,
  onViewAnswers,
}: Props) {
  const t = useT();
  const posthog = usePostHog();
  const scoreBreakdown = computeScoreBreakdown(state, distribution);
  const score = computeScore(scoreBreakdown);
  const scoreReady = scoreBreakdown.shares !== null;
  const attempts = failedAttemptCount(state.lives);
  const [attemptsBefore, attemptsAfter = ""] =
    t("training.attempts").split("{count}");

  const [titleRoll] = useState(Math.random);
  const [titleTotal, setTitleTotal] = useState<number | null>(
    () => score.total,
  );
  useEffect(() => {
    if (titleTotal === null && score.total !== null) {
      setTitleTotal(score.total);
    }
  }, [score.total, titleTotal]);

  // Mêmes banques de titres que la grille du jour. Les paliers sont calibrés sur
  // /1000 alors que l'entraînement plafonne à 900 : le haut du barème sort donc
  // plus rarement, c'est assumé. `lostByLives` est inatteignable (essais illimités).
  const resultOutcome: ResultOutcome =
    state.status === "won"
      ? { status: "won", total: titleTotal ?? score.gridValue }
      : { status: "lostByBlock" };
  const titleKeys = resultTitleKeys(resultOutcome);
  const resultTitleKey = titleKeys[Math.floor(titleRoll * titleKeys.length)];

  const viewedTrackedRef = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: une seule fois, dès que la rareté est résolue
  useEffect(() => {
    if (viewedTrackedRef.current || !scoreReady) return;
    viewedTrackedRef.current = true;
    // Pas de `grid_number` : il se déduit de `grid_date` (cf. `getGridNumberForDate`),
    // et le catalogue proscrit les propriétés dérivées.
    posthog?.capture("training_result_viewed", {
      grid_date: state.date,
      outcome: state.status,
      score_total: score.total,
      score_grid: score.gridValue,
      score_rarity: score.rarityValue,
      failed_attempts: attempts,
    });
  }, [scoreReady]);

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
          <Eyebrow>{t("training.eyebrow")}</Eyebrow>
          <DialogTitle className="mt-1 font-serif text-3xl font-medium italic leading-none tracking-normal text-on-surface">
            {t(resultTitleKey)}
          </DialogTitle>
          <AccentBar className="mt-1" />
          <DialogDescription className="sr-only">
            {t("training.resultDialogDescription")}
          </DialogDescription>
        </div>

        <div className="flex justify-center">
          <ScoreDisplay breakdown={scoreBreakdown} scale="training" />
        </div>

        {/* Le nombre est mis en avant sans découper la phrase à la main : on
            scinde la traduction sur son repère `{count}`, comme l'intro du
            barème le fait sur `{max}`. Pas de `toLowerCase()` sur du texte
            traduit — toutes les langues ne l'admettent pas. */}
        <p className="text-center text-sm text-on-surface-variant">
          {attemptsBefore}
          <span className="font-semibold tabular-nums text-on-surface">
            {attempts}
          </span>
          {attemptsAfter}
        </p>

        <ShareEmojiGrid
          cells={state.cells}
          distribution={distribution}
          caption={gridNumber !== null ? `#${gridNumber}` : undefined}
          mode="training"
        />

        {/* Un seul primaire, et c'est « Recommencer » : refaire la grille pour
            améliorer son score est la raison d'être du mode, et c'est la seule
            action qu'on ne peut déclencher que d'ici. Aller à une autre grille
            n'est pas proposé ici — le lien « Retour à la liste » est déjà
            présent en permanence en haut de page, le redoubler en primaire
            créerait deux libellés pour une même destination. */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={onViewAnswers}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            {t("ui.viewAnswers")}
          </Button>

          <Button onClick={onRestart} size="lg" className="w-full">
            <RotateCcw size={16} />
            {t("training.restart")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
