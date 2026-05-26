import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  constraintLabel,
  difficultyStars,
  formatGridDateHeadingFr,
} from "@/features/admin/logic/display";
import { useAction, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { GridPreview } from "./GridPreview";
import { PanelCard } from "./PanelCard";
import { PanelHeader } from "./PanelHeader";
import { StatusPill } from "./StatusPill";
import { TagPill } from "./TagPill";

const UPCOMING_DAYS = 7;

type Props = { token: string };

type ScheduleStatus = "idle" | "loading" | "error";

type UpcomingDay =
  | {
      date: string;
      kind: "scheduled" | "predicted";
      rows: string[];
      cols: string[];
      difficulty: number;
      cellDifficulties: number[] | null;
      candidateId: Id<"gridCandidates"> | null;
    }
  | { date: string; kind: "missing" };

function ScheduleButton({
  date,
  token,
  label,
}: {
  date: string;
  token: string;
  label: string;
}) {
  const scheduleGrid = useAction(api.grids.scheduleGridForDate);
  const [status, setStatus] = useState<ScheduleStatus>("idle");

  async function handleClick() {
    setStatus("loading");
    try {
      await scheduleGrid({ adminToken: token, date });
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        size="sm"
      >
        {status === "loading" && <Loader2 className="h-3 w-3 animate-spin" />}
        {status === "loading" ? "Planification…" : label}
      </Button>
      {status === "error" && (
        <p className="text-[10px] text-error">
          Erreur lors de la planification.
        </p>
      )}
    </div>
  );
}

function LazyGridPreview({
  token,
  day,
  isOpen,
}: {
  token: string;
  day: Extract<UpcomingDay, { kind: "scheduled" | "predicted" }>;
  isOpen: boolean;
}) {
  const scheduledDetail = useQuery(
    api.grids.getScheduledGridPreviewDetail,
    isOpen && day.kind === "scheduled"
      ? { adminToken: token, date: day.date }
      : "skip",
  );
  const candidateDetail = useQuery(
    api.grids.getCandidatePreviewDetail,
    isOpen && day.kind === "predicted" && day.candidateId
      ? { adminToken: token, candidateId: day.candidateId }
      : "skip",
  );

  if (!isOpen) {
    return (
      <p className="text-xs text-on-surface-variant">
        Ouvrez pour afficher la grille détaillée.
      </p>
    );
  }

  const detail = day.kind === "scheduled" ? scheduledDetail : candidateDetail;

  if (detail === undefined) {
    return (
      <p className="text-sm text-on-surface-variant animate-pulse">
        Chargement de la grille…
      </p>
    );
  }

  if (detail === null) {
    return (
      <p className="text-sm text-on-surface-variant">
        Détail de grille indisponible.
      </p>
    );
  }

  return (
    <GridPreview
      cellDifficulties={
        day.kind === "scheduled"
          ? day.cellDifficulties
          : (candidateDetail?.cellDifficulties ?? day.cellDifficulties)
      }
      cols={detail.cols}
      rows={detail.rows}
      validAnswers={detail.validAnswers}
    />
  );
}

export function UpcomingGridsPanel({ token }: Props) {
  const upcoming = useQuery(api.grids.getUpcomingScheduledPreview, {
    adminToken: token,
    days: UPCOMING_DAYS,
  });
  const [openDate, setOpenDate] = useState<string | null>(null);

  return (
    <PanelCard>
      <PanelHeader title={`Prochaines grilles (${UPCOMING_DAYS} jours)`} />

      {upcoming === undefined && (
        <p className="text-sm text-on-surface-variant">Chargement…</p>
      )}

      {upcoming !== undefined && upcoming.length === 0 && (
        <p className="text-sm text-on-surface-variant">
          Aucune prévision disponible.
        </p>
      )}

      {upcoming !== undefined && upcoming.length > 0 && (
        <Accordion
          className="flex w-full flex-col gap-1.5"
          type="single"
          collapsible
          value={openDate ?? ""}
          onValueChange={(value) => setOpenDate(value || null)}
        >
          {upcoming.map((day) => {
            if (day.kind === "missing") {
              return (
                <AccordionItem
                  className="rounded-xl bg-error/10 px-4 py-4"
                  key={day.date}
                  value={day.date}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1 text-left">
                      <h3 className="font-serif text-xl font-medium capitalize text-on-surface">
                        {formatGridDateHeadingFr(day.date)}
                      </h3>
                      <p className="text-sm font-medium text-error">
                        Pool vide — fallback d'urgence à la génération
                      </p>
                    </div>
                    <ScheduleButton
                      date={day.date}
                      token={token}
                      label="Planifier"
                    />
                  </div>
                </AccordionItem>
              );
            }

            const allConstraints = [...day.rows, ...day.cols];
            const isScheduled = day.kind === "scheduled";
            const isOpen = openDate === day.date;

            return (
              <AccordionItem
                className="overflow-hidden rounded-xl bg-surface-lowest shadow-editorial"
                key={day.date}
                value={day.date}
              >
                <AccordionTrigger className="items-start gap-3 px-4 pt-4 pb-3 hover:no-underline [&>svg]:shrink-0 [&>svg]:translate-y-0.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-3 text-left">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <h3 className="font-serif text-xl font-medium capitalize text-on-surface">
                          {formatGridDateHeadingFr(day.date)}
                        </h3>
                        {isScheduled ? (
                          <StatusPill kind="scheduled">programmée</StatusPill>
                        ) : (
                          <StatusPill kind="predicted">prédite</StatusPill>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-surface-highest px-2.5 py-1 text-xs font-semibold text-on-surface">
                          {difficultyStars(day.difficulty)}
                        </span>
                        <span className="text-xs tabular-nums text-on-surface-variant">
                          difficulté {day.difficulty}/100
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {allConstraints.map((id) => (
                        <TagPill key={`${day.date}-${id}`}>
                          {constraintLabel(id)}
                        </TagPill>
                      ))}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="mx-auto max-w-[700px] overflow-x-auto pb-3">
                    <LazyGridPreview token={token} day={day} isOpen={isOpen} />
                  </div>
                  {!isScheduled && (
                    <div className="flex justify-end pt-1">
                      <ScheduleButton
                        date={day.date}
                        token={token}
                        label="Valider cette grille"
                      />
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </PanelCard>
  );
}
