import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { dateToStr } from "../logic/scheduling";
import { CellMetricsMap } from "./CellMetricsMap";
import { GridPreview } from "./GridPreview";

// ─── Types ────────────────────────────────────────────────────────────────────

type CellMetric = {
  cellKey: string;
  solutionCount: number;
  popularCount: number;
  maxPopularity: number;
  avgPopularity: number;
  entropy: number;
  hasObviousAnswer: boolean;
};

type Candidate = {
  _id: Id<"gridCandidates">;
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
  score: number;
  difficulty: number;
  contextScore?: number;
  metadata: {
    minCellSize: number;
    maxCellSize: number;
    avgCellSize: number;
    categoryCount: number;
    avgNotoriety: number;
    obviousCellCount: number;
    cellsWithNoObvious: number;
    difficultyVariance: number;
    criteriaOverlapScore: number;
    difficultyMixNorm: number;
    cellMetrics: CellMetric[];
  };
  status: string;
  generatedAt: number;
};

const FINAL_SCORE_QUALITY_WEIGHT = 0.6;

function computeFinalScore(quality: number, context?: number): number | null {
  if (context == null) return null;
  return Math.round(
    FINAL_SCORE_QUALITY_WEIGHT * quality +
      (1 - FINAL_SCORE_QUALITY_WEIGHT) * context,
  );
}

type Props = {
  candidate: Candidate;
  adminToken: string;
  onUnauthorized: () => void;
  /** Prochain jour sans grille planifiée, calculé dans AdminPage. */
  nextAvailableDate: string;
  /** Dates déjà planifiées, pour désactiver les jours dans le picker. */
  scheduledDates: ReadonlySet<string>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function difficultyLabel(difficulty: number): string {
  const stars = Math.round((difficulty / 100) * 5);
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function CandidateCard({
  candidate,
  adminToken,
  onUnauthorized,
  nextAvailableDate,
  scheduledDates,
}: Props) {
  const approve = useMutation(api.grids.approveCandidate);
  const reject = useMutation(api.grids.rejectCandidate);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  const todayStr = dateToStr(new Date());
  const finalScore = computeFinalScore(candidate.score, candidate.contextScore);

  async function handleApprove(scheduledDate?: string) {
    setLoading(true);
    try {
      await approve({ candidateId: candidate._id, scheduledDate, adminToken });
      setCalendarOpen(false);
      setScheduleDate(undefined);
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

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setLoading(true);
    try {
      await reject({
        candidateId: candidate._id,
        reason: rejectReason,
        adminToken,
      });
      setRejectOpen(false);
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

  return (
    <>
      <div className="overflow-hidden rounded-xl bg-surface-lowest shadow-editorial">
        {/* Méta-données */}
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-3 pt-4">
          <div className="flex-1 min-w-0">
            <p className="mb-3 text-[10px] font-semibold tracking-widest text-on-surface-variant uppercase">
              Candidate {candidate._id}
            </p>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
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
              <div>
                <p className="font-serif text-xl font-medium text-on-surface leading-none">
                  {candidate.score}
                </p>
                <p className="mt-1 text-[10px] tracking-widest text-on-surface-variant uppercase">
                  Quality
                </p>
              </div>
              <div>
                <p className="font-serif text-xl font-medium text-on-surface leading-none">
                  {candidate.contextScore ?? "—"}
                </p>
                <p className="mt-1 text-[10px] tracking-widest text-on-surface-variant uppercase">
                  Context
                </p>
              </div>
              <div>
                <p className="font-serif text-xl font-medium text-on-surface leading-none">
                  {difficultyLabel(candidate.difficulty)}
                </p>
                <p className="mt-1 text-[10px] tracking-widest text-on-surface-variant uppercase">
                  Difficulté {candidate.difficulty}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
              <p>
                <span className="font-semibold text-on-surface">
                  {candidate.metadata.obviousCellCount}/9
                </span>{" "}
                évidentes
                {candidate.metadata.cellsWithNoObvious > 0 && (
                  <>
                    {" · "}
                    <span className="font-semibold text-rarity-ultra">
                      {candidate.metadata.cellsWithNoObvious} trou
                      {candidate.metadata.cellsWithNoObvious > 1 ? "s" : ""}
                    </span>
                  </>
                )}
              </p>
              <p>
                Catégories{" "}
                <span className="font-semibold text-on-surface">
                  {candidate.metadata.categoryCount}
                </span>
              </p>
              <p>
                Cellules{" "}
                <span className="font-semibold text-on-surface">
                  {candidate.metadata.minCellSize}–
                  {candidate.metadata.maxCellSize} (moy{" "}
                  {candidate.metadata.avgCellSize.toFixed(1)})
                </span>
              </p>
              <p>
                Overlap{" "}
                <span className="font-semibold text-on-surface">
                  {(candidate.metadata.criteriaOverlapScore * 100).toFixed(0)}%
                </span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] tracking-widest text-on-surface-variant uppercase">
              Générée le
            </p>
            <p className="text-xs text-on-surface">
              {new Date(candidate.generatedAt).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>

        {/* Grille + mini-carte cellule */}
        <div className="grid grid-cols-1 gap-4 px-4 pb-4 lg:grid-cols-[2fr_1fr]">
          <div className="mx-auto w-full max-w-[800px]">
            <GridPreview
              rows={candidate.rows}
              cols={candidate.cols}
              validAnswers={candidate.validAnswers}
              mode="detailed"
            />
          </div>
          <CellMetricsMap cellMetrics={candidate.metadata.cellMetrics} />
        </div>
        {/* Actions */}
        {candidate.status === "pending" && (
          <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant/15 px-4 py-3">
            <div className="inline-flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleApprove(nextAvailableDate)}
                disabled={loading}
                className="bg-on-surface text-surface-lowest hover:bg-on-surface/90"
              >
                Approuver maintenant
              </Button>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={loading}
                    className="bg-surface-highest text-on-surface hover:bg-surface-highest/80"
                    aria-label="Choisir une date de programmation"
                  >
                    <CalendarDays className="mr-1 size-4" />
                    Choisir une date
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="space-y-2 p-2">
                    <Calendar
                      mode="single"
                      selected={scheduleDate}
                      onSelect={setScheduleDate}
                      disabled={(date) =>
                        dateToStr(date) <= todayStr ||
                        scheduledDates.has(dateToStr(date))
                      }
                      autoFocus
                    />
                    <div className="px-1 pb-1">
                      <Button
                        size="sm"
                        className="w-full bg-on-surface text-surface-lowest hover:bg-on-surface/90"
                        disabled={!scheduleDate || loading}
                        onClick={() =>
                          scheduleDate && handleApprove(dateToStr(scheduleDate))
                        }
                      >
                        Approuver à cette date
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setRejectOpen(true)}
                disabled={loading}
              >
                Rejeter
              </Button>
            </div>
            <span className="ml-auto text-[10px] text-on-surface-variant">
              Prochain slot libre :{" "}
              <span className="font-semibold text-on-surface">
                {new Date(
                  Number(nextAvailableDate.split("-")[0]),
                  Number(nextAvailableDate.split("-")[1]) - 1,
                  Number(nextAvailableDate.split("-")[2]),
                ).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Dialog — rejeter */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              Raison du rejet
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Pourquoi rejeter cette grille ?"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRejectOpen(false)}
              className="text-on-surface-variant"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || loading}
            >
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
