import { gridEaseScore100 } from "@/features/countries/lib/popularity";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  FAILED_ATTEMPTS_SINCE,
  STRUGGLE_MIN_ATTEMPTS,
  averageObservedSuccess100,
  hasStruggleData,
  struggleRate,
} from "../logic/analytics";
import { formatGridDateHeadingFr } from "../logic/display";
import { GridHeaderStatDelta, GridHeaderStatKind } from "./GridHeaderStat";
import { GridPreview, type ObservedCell } from "./GridPreview";
import { StatLegend } from "./StatGlyph";
import { StatusPill } from "./StatusPill";

/** Vue d'un jour sélectionné, calculée par AdminPage depuis les queries légères. */
export type DayView =
  | {
      kind: "observed";
      date: string;
      status: "active" | "past";
    }
  | {
      kind: "future";
      date: string;
      status: "scheduled" | "predicted";
      /** Renseigné pour les jours prédits (fetch lazy de la candidate). */
      candidateId: Id<"gridCandidates"> | null;
    }
  | { kind: "missing"; date: string };

type Props = {
  token: string;
  selectedDate: string | null;
  view: DayView | null;
};

// ─── Conteneurs ─────────────────────────────────────────────────────────────────

function DetailShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full overflow-hidden rounded-xl bg-surface-lowest shadow-editorial">
      {children}
    </div>
  );
}

function DetailMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 rounded-xl bg-surface-lowest p-6 shadow-editorial">
      <p className="text-center text-sm text-on-surface-variant">{children}</p>
    </div>
  );
}

function DayHeader({ date, pill }: { date: string; pill: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 className="font-serif text-xl font-medium capitalize text-on-surface">
        {formatGridDateHeadingFr(date)}
      </h2>
      {pill}
    </div>
  );
}

// ─── Vue observée (grille passée / active) ──────────────────────────────────────

function ObservedDetail({
  token,
  view,
}: {
  token: string;
  view: Extract<DayView, { kind: "observed" }>;
}) {
  const metrics = useQuery(api.grids.getGridCellMetrics, {
    adminToken: token,
    date: view.date,
  });

  if (metrics === undefined) {
    return (
      <DetailShell>
        <div className="px-4 py-4">
          <DayHeader
            date={view.date}
            pill={
              <StatusPill kind={view.status}>
                {view.status === "active" ? "active" : "passée"}
              </StatusPill>
            }
          />
          <p className="mt-2 animate-pulse text-sm text-on-surface-variant">
            Chargement des métriques…
          </p>
        </div>
      </DetailShell>
    );
  }

  if (metrics === null) {
    return (
      <DetailMessage>Aucune grille publiée pour cette date.</DetailMessage>
    );
  }

  const { playersEngaged, gamesFinished, wins } = metrics;
  const noData = playersEngaged === 0;
  const abandon = Math.max(0, playersEngaged - gamesFinished);
  const winRate =
    gamesFinished === 0 ? null : Math.round((wins / gamesFinished) * 100);
  const tracked = hasStruggleData(view.date);

  const validAnswers: Record<string, string[]> = {};
  const observed: Record<string, ObservedCell> = {};
  for (const [key, cell] of Object.entries(metrics.cells)) {
    validAnswers[key] = cell.validAnswers;
    const essais = cell.failedAttempts + cell.totalGuesses;
    const struggle =
      tracked && essais >= STRUGGLE_MIN_ATTEMPTS ? struggleRate(cell) : null;
    observed[key] = {
      reussite: struggle === null ? null : 1 - struggle,
      essais,
      picks: Object.fromEntries(
        cell.picks.map((p) => [p.countryCode, p.count]),
      ),
    };
  }

  const gridEase = gridEaseScore100(validAnswers);
  const gridObservedEase = averageObservedSuccess100(
    Object.values(observed).map((cell) => cell.reussite),
  );

  return (
    <DetailShell>
      <div className="space-y-3 px-4 pb-4 pt-4">
        <DayHeader
          date={view.date}
          pill={
            <StatusPill kind={view.status}>
              {view.status === "active" ? "active" : "passée"}
            </StatusPill>
          }
        />

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <GridHeaderStatKind
            kind="engages"
            value={noData ? "—" : playersEngaged}
          />
          <GridHeaderStatKind
            kind="terminees"
            value={noData ? "—" : gamesFinished}
          />
          <GridHeaderStatKind kind="abandon" value={noData ? "—" : abandon} />
          <GridHeaderStatKind
            kind="victoires"
            tone="text-warning"
            value={
              noData
                ? "—"
                : `${wins}${winRate === null ? "" : ` · ${winRate}%`}`
            }
          />
        </div>

        {(gridEase !== null || gridObservedEase !== null) && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {gridEase !== null && (
              <GridHeaderStatKind kind="faciliteEst" value={gridEase} />
            )}
            {gridObservedEase !== null && (
              <GridHeaderStatKind
                kind="reussiteObs"
                value={`${gridObservedEase}%`}
              />
            )}
            {gridEase !== null && gridObservedEase !== null && (
              <GridHeaderStatDelta
                predicted={gridEase}
                observed={gridObservedEase}
              />
            )}
          </div>
        )}

        {!tracked && (
          <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
            Struggle instrumenté depuis {FAILED_ATTEMPTS_SINCE} — réussite par
            case indisponible pour ce jour.
          </p>
        )}

        <GridPreview
          rows={metrics.rows}
          cols={metrics.cols}
          validAnswers={validAnswers}
          observed={observed}
        />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-on-surface-variant/70">
          <StatLegend
            kinds={["faciliteEst", "reussiteObs", "ecartDown", "essais"]}
          />
        </div>
      </div>
    </DetailShell>
  );
}

// ─── Vue future (grille planifiée / prédite) ────────────────────────────────────

function FutureDetail({
  token,
  view,
}: {
  token: string;
  view: Extract<DayView, { kind: "future" }>;
}) {
  const scheduledDetail = useQuery(
    api.grids.getScheduledGridPreviewDetail,
    view.status === "scheduled"
      ? { adminToken: token, date: view.date }
      : "skip",
  );
  const candidateDetail = useQuery(
    api.grids.getCandidatePreviewDetail,
    view.status === "predicted" && view.candidateId
      ? { adminToken: token, candidateId: view.candidateId }
      : "skip",
  );

  const detail =
    view.status === "scheduled" ? scheduledDetail : candidateDetail;
  const gridEase = detail ? gridEaseScore100(detail.validAnswers) : null;

  return (
    <DetailShell>
      <div className="space-y-3 px-4 pb-4 pt-4">
        <DayHeader
          date={view.date}
          pill={
            <StatusPill kind={view.status}>
              {view.status === "scheduled" ? "programmée" : "prédite"}
            </StatusPill>
          }
        />

        {gridEase !== null && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <GridHeaderStatKind kind="faciliteEst" value={gridEase} />
          </div>
        )}

        <div className="mx-auto w-full max-w-[860px]">
          {detail === undefined && (
            <p className="animate-pulse text-sm text-on-surface-variant">
              Chargement de la grille…
            </p>
          )}
          {detail === null && (
            <p className="text-sm text-on-surface-variant">
              Détail de grille indisponible.
            </p>
          )}
          {detail && (
            <GridPreview
              rows={detail.rows}
              cols={detail.cols}
              validAnswers={detail.validAnswers}
            />
          )}
        </div>
      </div>
    </DetailShell>
  );
}

// ─── Aiguillage ─────────────────────────────────────────────────────────────────

export function GridDayDetail({ token, selectedDate, view }: Props) {
  if (!selectedDate) {
    return (
      <DetailMessage>
        Cliquez sur un jour du calendrier pour voir la grille.
      </DetailMessage>
    );
  }

  if (!view || view.kind === "missing") {
    return (
      <DetailMessage>
        Aucune grille planifiée pour cette date (pool vide).
      </DetailMessage>
    );
  }

  if (view.kind === "observed") {
    return <ObservedDetail token={token} view={view} />;
  }

  return <FutureDetail token={token} view={view} />;
}
