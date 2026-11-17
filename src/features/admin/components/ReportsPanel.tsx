import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";
import {
  formatReportSentAt,
  type GridConstraints,
  REPORT_CATEGORY_LABEL,
  REPORT_STATUS_LABEL,
  type ReportStatus,
  reportGridLine,
  reportTargetLabel,
} from "../logic/reports";
import { PanelCard } from "./PanelCard";
import { PanelHeader } from "./PanelHeader";
import { TagPill } from "./TagPill";

type Report = FunctionReturnType<
  typeof api.reports.listReports
>["page"][number];

const PAGE_SIZE = 20;
const FILTERS: ReadonlyArray<ReportStatus | null> = [
  "new",
  "resolved",
  "dismissed",
  null,
];
const LOCALE_LABEL = { fr: "FR", en: "EN" } as const;

function ReportRow({
  report,
  grid,
  onStatus,
  onOpenDay,
}: {
  report: Report;
  grid: GridConstraints | undefined;
  onStatus: (status: ReportStatus) => void;
  onOpenDay: (date: string) => void;
}) {
  const target = report.target;
  const gridLine = reportGridLine(target);
  return (
    <li className="flex flex-col gap-2 rounded-lg bg-surface-lowest p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <TagPill>{REPORT_CATEGORY_LABEL[report.category]}</TagPill>
        <span className="text-sm font-medium text-on-surface">
          {reportTargetLabel(target, grid)}
        </span>
        <span className="ml-auto text-xs text-on-surface-variant">
          {formatReportSentAt(report._creationTime)} ·{" "}
          {LOCALE_LABEL[report.locale]}
        </span>
      </div>
      {gridLine && (
        <p className="text-xs text-on-surface-variant">{gridLine}</p>
      )}
      {/* Texte brut, jamais interprété : aucun lien ni balise rendus. */}
      <p className="whitespace-pre-wrap break-words text-sm text-on-surface">
        {report.message}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {report.status === "new" ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onStatus("resolved")}
            >
              Traité
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onStatus("dismissed")}
            >
              Rejeté
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onStatus("new")}
          >
            Rouvrir
          </Button>
        )}
        {target.kind !== "general" && (
          <Button
            type="button"
            variant="link"
            onClick={() => onOpenDay(target.date)}
            className="ml-auto text-xs"
          >
            Voir le jour
          </Button>
        )}
      </div>
    </li>
  );
}

/**
 * Signalements des joueurs (#127) : les nouveaux d'abord, un filtre par
 * statut, « Traité » ou « Rejeté ». Chaque signalement est aussi arrivé par
 * e-mail ; le statut sert à l'effacement (un an après traitement).
 */
export function ReportsPanel({
  token,
  gridsByDate,
  onOpenDay,
}: {
  token: string;
  gridsByDate: ReadonlyMap<string, GridConstraints>;
  onOpenDay: (date: string) => void;
}) {
  const [status, setStatus] = useState<ReportStatus | null>("new");
  const newCount = useQuery(api.reports.countNewReports, {
    adminToken: token,
  });
  const {
    results,
    status: loading,
    loadMore,
  } = usePaginatedQuery(
    api.reports.listReports,
    { adminToken: token, status },
    { initialNumItems: PAGE_SIZE },
  );
  const setReportStatus = useMutation(api.reports.setReportStatus);

  return (
    <PanelCard>
      <PanelHeader title="Signalements">
        {newCount && newCount.count > 0 && (
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
            {newCount.capped ? `${newCount.count - 1}+` : newCount.count}{" "}
            {newCount.count > 1 ? "nouveaux" : "nouveau"}
          </span>
        )}
        <div className="ml-auto flex flex-wrap gap-1">
          {FILTERS.map((filter) => (
            <Button
              key={filter ?? "all"}
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={status === filter}
              onClick={() => setStatus(filter)}
              className={cn(
                "h-8 px-2.5 text-xs",
                status === filter && "bg-surface-lowest text-on-surface",
              )}
            >
              {filter ? REPORT_STATUS_LABEL[filter] : "Tous"}
            </Button>
          ))}
        </div>
      </PanelHeader>

      {loading === "LoadingFirstPage" ? (
        <p className="text-sm text-on-surface-variant">Chargement…</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Aucun signalement.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {results.map((report) => (
            <ReportRow
              key={report._id}
              report={report}
              grid={
                report.target.kind === "general"
                  ? undefined
                  : gridsByDate.get(report.target.date)
              }
              onStatus={(next) =>
                void setReportStatus({
                  adminToken: token,
                  id: report._id,
                  status: next,
                })
              }
              onOpenDay={onOpenDay}
            />
          ))}
        </ul>
      )}
      {loading === "CanLoadMore" && (
        <Button
          type="button"
          variant="link"
          onClick={() => loadMore(PAGE_SIZE)}
          className="mt-3 text-xs"
        >
          Charger plus
        </Button>
      )}
    </PanelCard>
  );
}
