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
import { Calendar, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { GridPreview } from "./GridPreview";

const UPCOMING_DAYS = 7;

type Props = { token: string };

type ScheduleStatus = "idle" | "loading" | "error";

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
        className="bg-on-surface text-surface-lowest hover:bg-on-surface/90 gap-2"
      >
        {status === "loading" && <Loader2 className="h-3 w-3 animate-spin" />}
        {status === "loading" ? "Planification…" : label}
      </Button>
      {status === "error" && (
        <p className="text-[10px] text-rarity-ultra">
          Erreur lors de la planification.
        </p>
      )}
    </div>
  );
}

export function UpcomingGridsPanel({ token }: Props) {
  const upcoming = useQuery(api.grids.getUpcomingScheduledPreview, {
    adminToken: token,
    days: UPCOMING_DAYS,
  });

  return (
    <section className="rounded-2xl bg-surface-low p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <p className="text-[10px] font-semibold text-on-surface-variant tracking-widest uppercase">
          Prochaines grilles ({UPCOMING_DAYS} jours)
        </p>
      </div>

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
        >
          {upcoming.map((day) => {
            if (day.kind === "missing") {
              return (
                <AccordionItem
                  className="rounded-xl bg-rarity-ultra/10 px-4 py-4"
                  key={day.date}
                  value={day.date}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1 text-left">
                      <h3 className="font-serif text-xl font-medium capitalize text-on-surface">
                        {formatGridDateHeadingFr(day.date)}
                      </h3>
                      <p className="text-sm font-medium text-rarity-ultra">
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
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface-highest px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
                            <Calendar className="h-3 w-3 shrink-0" />
                            programmée
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
                            <Sparkles className="h-3 w-3 shrink-0" />
                            prédite
                          </span>
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
                        <span
                          className="rounded-full bg-surface-low px-2 py-0.5 text-[10px] text-on-surface-variant"
                          key={`${day.date}-${id}`}
                        >
                          {constraintLabel(id)}
                        </span>
                      ))}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="mx-auto max-w-[700px] overflow-x-auto pb-3">
                    <GridPreview
                      cellDifficulties={day.cellDifficulties}
                      cols={day.cols}
                      rows={day.rows}
                      validAnswers={day.validAnswers}
                    />
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
    </section>
  );
}
