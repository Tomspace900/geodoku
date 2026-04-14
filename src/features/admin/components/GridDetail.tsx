import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { GridPreview } from "./GridPreview";

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
}: Props) {
  const unschedule = useMutation(api.grids.unscheduleGrid);
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
      <div className="bg-surface-lowest rounded-xl p-6 shadow-editorial flex h-full min-h-[300px] flex-col items-center justify-center gap-2">
        <p className="text-sm text-on-surface-variant text-center">
          Cliquez sur un jour du calendrier pour voir la grille planifiée.
        </p>
      </div>
    );
  }

  if (!grid) {
    return (
      <div className="bg-surface-lowest rounded-xl p-6 shadow-editorial flex h-full min-h-[300px] flex-col items-center justify-center gap-2">
        <p className="text-sm text-on-surface-variant text-center">
          Aucune grille planifiée pour cette date.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-surface-lowest rounded-xl shadow-editorial overflow-hidden h-full">
        <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold text-on-surface-variant tracking-widest uppercase mb-1">
              Grille du
            </p>
            <h2 className="font-serif text-lg font-medium text-on-surface capitalize">
              {formatDateFr(grid.date)}
            </h2>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {difficultyLabel(grid.difficulty)}
              <span className="ml-2 text-xs opacity-60">
                difficulté {grid.difficulty}/100
              </span>
            </p>
          </div>
          {/* Déprogrammer uniquement pour les dates futures */}
          {grid.date > new Date().toISOString().slice(0, 10) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmOpen(true)}
              className="text-red-700 hover:bg-red-500/10 hover:text-red-800 shrink-0 mt-1"
            >
              Déprogrammer
            </Button>
          )}
        </div>
        <div className="px-4 pb-4">
          <div className="mx-auto w-full max-w-[860px]">
            <GridPreview
              rows={grid.rows}
              cols={grid.cols}
              validAnswers={grid.validAnswers}
              mode="compact"
            />
          </div>
        </div>
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
