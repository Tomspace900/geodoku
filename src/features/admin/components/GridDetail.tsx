import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { AdvancedMetricsPanel } from "./AdvancedMetricsPanel";
import { CellMetricsMap } from "./CellMetricsMap";
import { GridPreview } from "./GridPreview";

const FINAL_SCORE_QUALITY_WEIGHT = 0.45;
const FINAL_SCORE_CONTEXT_WEIGHT = 0.3;
const FINAL_SCORE_TARGET_WEIGHT = 0.25;
const FINAL_SCORE_DIFFICULTY_TARGET = 40;

function computeTargetProximity(difficulty: number): number {
  const distance = Math.abs(difficulty - FINAL_SCORE_DIFFICULTY_TARGET);
  const maxDistance = Math.max(
    FINAL_SCORE_DIFFICULTY_TARGET,
    100 - FINAL_SCORE_DIFFICULTY_TARGET,
  );
  return maxDistance === 0 ? 1 : Math.max(0, 1 - distance / maxDistance);
}

type ScheduledGrid = {
  date: string;
  difficulty: number;
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
};

type Props = {
  grid: ScheduledGrid | null;
  selectedDate: string | null;
  adminToken: string;
  onUnauthorized: () => void;
  onUnscheduled: () => void;
  /** Si true, affiche le breakdown quality/difficulty détaillé. */
  advanced: boolean;
};

function difficultyLabel(difficulty: number): string {
  const stars = Math.round((difficulty / 100) * 5);
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

function formatDateFr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(y as number, (m as number) - 1, d as number));
}

export function GridDetail({
  grid,
  selectedDate,
  adminToken,
  onUnauthorized,
  onUnscheduled,
  advanced,
}: Props) {
  const unschedule = useMutation(api.grids.unscheduleGrid);
  const detail = useQuery(
    api.grids.getGridDetailByDate,
    grid ? { date: grid.date } : "skip",
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleUnschedule() {
    if (!selectedDate) return;
    setLoading(true);
    try {
      await unschedule({ date: selectedDate, adminToken });
      setConfirmOpen(false);
      onUnscheduled();
    } catch (err) {
      if (
        err instanceof ConvexError &&
        String(err.message).includes("Unauthorized")
      ) {
        onUnauthorized();
      }
    } finally {
      setLoading(false);
    }
  }

  if (!selectedDate) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 rounded-xl bg-surface-lowest p-6 shadow-editorial">
        <p className="text-sm text-on-surface-variant text-center">
          Cliquez sur un jour du calendrier pour voir la grille planifiée.
        </p>
      </div>
    );
  }

  if (!grid) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 rounded-xl bg-surface-lowest p-6 shadow-editorial">
        <p className="text-sm text-on-surface-variant text-center">
          Aucune grille planifiée pour cette date.
        </p>
      </div>
    );
  }

  const qualityScore = detail?.qualityScore ?? null;
  const contextScore = detail?.contextScore ?? null;
  const finalScore =
    qualityScore != null && contextScore != null
      ? Math.round(
          FINAL_SCORE_QUALITY_WEIGHT * qualityScore +
            FINAL_SCORE_CONTEXT_WEIGHT * contextScore +
            FINAL_SCORE_TARGET_WEIGHT *
              computeTargetProximity(grid.difficulty) *
              100,
        )
      : null;

  const todayIso = new Date().toISOString().slice(0, 10);
  const showUnscheduleButton =
    grid.date > todayIso || (import.meta.env.DEV && grid.date === todayIso);

  return (
    <>
      <div className="h-full overflow-hidden rounded-xl bg-surface-lowest shadow-editorial">
        <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold tracking-widest text-on-surface-variant uppercase">
              Grille du
            </p>
            <h2 className="font-serif text-xl font-medium text-on-surface capitalize">
              {formatDateFr(grid.date)}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-surface-highest px-2.5 py-1 text-xs font-semibold text-on-surface">
                {difficultyLabel(grid.difficulty)}
              </span>
              <span className="text-xs text-on-surface-variant">
                difficulté {grid.difficulty}/100
              </span>
            </div>
          </div>
          {/* Futur : toujours. Aujourd’hui : uniquement en dev local (aligné avec ALLOW_UNSCHEDULE_CURRENT_DAY côté Convex). */}
          {showUnscheduleButton && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmOpen(true)}
              className="mt-1 shrink-0 text-on-surface-variant hover:bg-surface-highest hover:text-on-surface"
            >
              Déprogrammer
            </Button>
          )}
        </div>
        {detail?.metadata && (
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2 px-4 pb-3">
            {finalScore != null && (
              <div>
                <p className="font-serif text-3xl font-medium text-brand leading-none">
                  {finalScore}
                </p>
                <p className="mt-1 text-[10px] tracking-widest text-on-surface-variant uppercase">
                  Final score
                </p>
              </div>
            )}
            {qualityScore != null && (
              <div>
                <p className="font-serif text-xl font-medium text-on-surface leading-none">
                  {qualityScore}
                </p>
                <p className="mt-1 text-[10px] tracking-widest text-on-surface-variant uppercase">
                  Quality
                </p>
              </div>
            )}
            <div>
              <p className="font-serif text-xl font-medium text-on-surface leading-none">
                {contextScore ?? "—"}
              </p>
              <p className="mt-1 text-[10px] tracking-widest text-on-surface-variant uppercase">
                Context
              </p>
            </div>
            <p className="text-xs text-on-surface-variant">
              <span className="font-semibold text-on-surface">
                {detail.metadata.obviousCellCount}/9
              </span>{" "}
              évidentes
              {9 - detail.metadata.obviousCellCount > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-rarity-ultra">
                    {9 - detail.metadata.obviousCellCount} trou
                    {9 - detail.metadata.obviousCellCount > 1 ? "s" : ""}
                  </span>
                </>
              )}
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 px-4 pb-4 lg:grid-cols-[2fr_1fr]">
          <div className="mx-auto w-full max-w-[860px]">
            <GridPreview
              rows={grid.rows}
              cols={grid.cols}
              validAnswers={grid.validAnswers}
              mode="compact"
            />
          </div>
          {detail?.metadata && (
            <CellMetricsMap cellMetrics={detail.metadata.cellMetrics} />
          )}
        </div>
        {advanced && detail?.metadata && (
          <div className="px-4 pb-4">
            <AdvancedMetricsPanel metadata={detail.metadata} />
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              Déprogrammer cette grille ?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-on-surface-variant">
            La grille du{" "}
            <span className="font-semibold text-on-surface">
              {formatDateFr(grid.date)}
            </span>{" "}
            sera supprimée du planning et le candidat sera remis en file
            d'attente approuvée.
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              className="text-on-surface-variant"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnschedule}
              disabled={loading}
            >
              Déprogrammer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
