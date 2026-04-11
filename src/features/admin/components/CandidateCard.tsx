import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { CONSTRAINTS } from "../../../features/game/logic/constraints";

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
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONSTRAINT_MAP = new Map(CONSTRAINTS.map((c) => [c.id, c]));

function difficultyStars(difficulty: number): string {
  const stars = Math.round((difficulty / 100) * 5);
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

// ─── Mini grid preview ────────────────────────────────────────────────────────

function GridPreview({
  candidate,
}: {
  candidate: Candidate;
}) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-1 text-left text-muted-foreground" />
            {candidate.cols.map((colId) => (
              <th
                key={colId}
                className="p-1 text-center font-medium border border-border bg-muted max-w-[120px]"
              >
                {CONSTRAINT_MAP.get(colId)?.label ?? colId}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {candidate.rows.map((rowId, r) => (
            <tr key={rowId}>
              <th className="p-1 text-left font-medium border border-border bg-muted max-w-[120px] whitespace-nowrap">
                {CONSTRAINT_MAP.get(rowId)?.label ?? rowId}
              </th>
              {candidate.cols.map((_, c) => {
                const key = `${r},${c}`;
                const codes = candidate.validAnswers[key] ?? [];
                const preview = codes.slice(0, 3);
                const rest = codes.length - preview.length;
                return (
                  <td key={key} className="p-1 border border-border align-top">
                    <div className="font-semibold text-center">
                      {codes.length}
                    </div>
                    <div className="text-muted-foreground space-y-0.5">
                      {preview.map((code) => (
                        <div key={code} className="truncate">
                          {code}
                        </div>
                      ))}
                      {rest > 0 && (
                        <div className="text-muted-foreground/60">
                          +{rest} autres
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CandidateCard({
  candidate,
  adminToken,
  onUnauthorized,
}: Props) {
  const approve = useMutation(api.grids.approveCandidate);
  const reject = useMutation(api.grids.rejectCandidate);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleApprove(scheduledDate?: string) {
    setLoading(true);
    try {
      await approve({
        candidateId: candidate._id,
        scheduledDate,
        adminToken,
      });
      setScheduleOpen(false);
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
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">
                Score {candidate.score.toFixed(1)}
              </Badge>
              <Badge variant="outline">
                {difficultyStars(candidate.difficulty)}
              </Badge>
              <Badge variant="outline">
                {candidate.metadata.categoryCount} catégories
              </Badge>
              <Badge variant="outline">
                min {candidate.metadata.minCellSize} / moy{" "}
                {candidate.metadata.avgCellSize.toFixed(1)} pays/cellule
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(candidate.generatedAt).toLocaleDateString("fr-FR")}
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <GridPreview candidate={candidate} />
        </CardContent>

        {candidate.status === "pending" && (
          <>
            <Separator />
            <CardFooter className="pt-4 flex gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => handleApprove()}
                disabled={loading}
              >
                Approuver
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setScheduleOpen(true)}
                disabled={loading}
              >
                Approuver &amp; programmer
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setRejectOpen(true)}
                disabled={loading}
              >
                Rejeter
              </Button>
            </CardFooter>
          </>
        )}
      </Card>

      {/* Schedule dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Programmer pour une date</DialogTitle>
          </DialogHeader>
          <Input
            type="date"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => handleApprove(scheduleDate)}
              disabled={!scheduleDate || loading}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raison du rejet</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Pourquoi rejeter cette grille ?"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
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
