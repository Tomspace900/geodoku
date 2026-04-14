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
import { GridPreview } from "./GridPreview";

// ─── Types ────────────────────────────────────────────────────────────────────

type Candidate = {
  _id: Id<"gridCandidates">;
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
  score: number;
  difficulty: number;
  metadata: {
    minCellSize: number;
    maxCellSize: number;
    avgCellSize: number;
    categoryCount: number;
    avgObscurity: number;
  };
  status: string;
  generatedAt: number;
};

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

// ─── Pill méta-donnée ─────────────────────────────────────────────────────────

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold bg-surface-highest text-on-surface-variant rounded-full px-2.5 py-1">
      {children}
    </span>
  );
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
      <div className="bg-surface-lowest rounded-xl shadow-editorial overflow-hidden">
        {/* Méta-données */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            <Pill>Score {candidate.score.toFixed(1)}</Pill>
            <Pill>{difficultyLabel(candidate.difficulty)}</Pill>
            <Pill>{candidate.metadata.categoryCount} catégories</Pill>
            <Pill>
              min {candidate.metadata.minCellSize} / moy{" "}
              {candidate.metadata.avgCellSize.toFixed(1)} pays/cellule
            </Pill>
          </div>
          <span className="text-xs text-on-surface-variant">
            {new Date(candidate.generatedAt).toLocaleDateString("fr-FR")}
          </span>
        </div>

        {/* Grille */}
        <div className="px-4 pb-4">
          <div className="mx-auto w-full max-w-[800px]">
            <GridPreview
              rows={candidate.rows}
              cols={candidate.cols}
              validAnswers={candidate.validAnswers}
              mode="detailed"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      {candidate.status === "pending" && (
        <div className="mt-3 flex items-center gap-2 px-1">
          <div className="inline-flex items-center overflow-hidden rounded-md bg-on-surface text-surface-lowest">
            <Button
              size="sm"
              onClick={() => handleApprove(nextAvailableDate)}
              disabled={loading}
              className="rounded-none bg-transparent hover:bg-on-surface/90"
            >
              Approuver
            </Button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  disabled={loading}
                  className="rounded-none border-l border-surface-lowest/20 bg-transparent px-2 hover:bg-on-surface/90"
                  aria-label="Choisir une date de programmation"
                >
                  <CalendarDays className="size-4" />
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
                      Approuver
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setRejectOpen(true)}
            disabled={loading}
          >
            Rejeter
          </Button>
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
