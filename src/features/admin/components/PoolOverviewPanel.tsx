import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { constraintLabel } from "@/features/admin/logic/display";
import { getCountryByCode } from "@/features/countries/lib/search";
import { useAction, useQuery } from "convex/react";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { GenerationReport } from "../../../../convex/lib/gridConstants";
import { ExposureBar } from "./ExposureBar";
import { PanelCard } from "./PanelCard";
import { PanelHeader } from "./PanelHeader";
import { StatBlock } from "./StatBlock";

function getCountryLabel(code: string): string {
  const country = getCountryByCode(code);
  if (!country) return code;
  return `${country.flagEmoji} ${country.names.fr}`;
}

const EXPOSURE_LIST_LIMIT = 15;

type ExposureRow = { label: string; pastCount: number; upcomingCount: number };

function ExposureList({
  title,
  rows,
  pastGridCount,
  upcomingGridCount,
}: {
  title: string;
  rows: ExposureRow[];
  pastGridCount: number;
  upcomingGridCount: number;
}) {
  if (rows.length === 0 || pastGridCount === 0) {
    return (
      <div>
        <PanelHeader title={title} className="mb-2" />
        <p className="text-xs text-on-surface-variant">
          Aucune donnée historique.
        </p>
      </div>
    );
  }

  const sorted = [...rows]
    .sort((a, b) => b.pastCount - a.pastCount)
    .slice(0, EXPOSURE_LIST_LIMIT);

  const globalMax = Math.max(
    ...sorted.map((r) => r.pastCount / pastGridCount),
    upcomingGridCount > 0
      ? Math.max(...sorted.map((r) => r.upcomingCount / upcomingGridCount))
      : 0,
    0.01,
  );

  return (
    <div className="min-w-0">
      <PanelHeader title={title} className="mb-2" />
      <div className="mb-1.5 flex items-center gap-2">
        <span className="w-28 shrink-0" />
        <span className="flex-1 text-center text-[9px] uppercase tracking-widest text-on-surface-variant/60">
          ← {pastGridCount}j passés
        </span>
        <span className="w-5 shrink-0" />
        <span className="flex-1 text-center text-[9px] uppercase tracking-widest text-on-surface-variant/60">
          {upcomingGridCount > 0
            ? `${upcomingGridCount}j planifiés →`
            : "— planifiés →"}
        </span>
        <span className="w-5 shrink-0" />
      </div>
      <ul className="flex flex-col gap-1.5">
        {sorted.map(({ label, pastCount, upcomingCount }) => {
          const pastRate = pastCount / pastGridCount;
          const upcomingRate =
            upcomingGridCount > 0 ? upcomingCount / upcomingGridCount : 0;
          const pastPct = Math.max(2, Math.round((pastRate / globalMax) * 100));
          const upcomingPct =
            upcomingGridCount > 0 && upcomingCount > 0
              ? Math.max(2, Math.round((upcomingRate / globalMax) * 100))
              : 0;
          return (
            <ExposureBar
              key={label}
              label={label}
              pastCount={pastCount}
              upcomingCount={upcomingCount}
              pastPct={pastPct}
              upcomingPct={upcomingPct}
              pastHighlighted={pastRate >= 1 / 3}
            />
          );
        })}
      </ul>
    </div>
  );
}

type Props = {
  token: string;
  clearToken: () => void;
  hasTomorrowGrid: boolean | undefined;
};

type RefreshReport = GenerationReport & { deletedAvailable: number };

type RefreshStatus = "idle" | "loading" | RefreshReport;

function isUnauthorizedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("Unauthorized");
}

export function PoolOverviewPanel({
  token,
  clearToken,
  hasTomorrowGrid,
}: Props) {
  const stats = useQuery(
    api.grids.getPoolStats,
    token ? { adminToken: token } : "skip",
  );
  const exposure = useQuery(
    api.grids.getExposureStats,
    token ? { adminToken: token } : "skip",
  );
  const refreshPool = useAction(api.grids.refreshPool);
  const runEnsureTomorrow = useAction(api.grids.runEnsureTomorrow);

  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>("idle");
  const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);
  const [ensureTomorrowStatus, setEnsureTomorrowStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");

  async function handleRefreshPool() {
    setRefreshStatus("loading");
    try {
      const report = await refreshPool({ adminToken: token });
      setRefreshStatus(report);
      setRefreshDialogOpen(false);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearToken();
      } else {
        setRefreshStatus("idle");
      }
    }
  }

  async function handleEnsureTomorrow() {
    setEnsureTomorrowStatus("loading");
    try {
      await runEnsureTomorrow({ adminToken: token });
      setEnsureTomorrowStatus("idle");
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearToken();
      } else {
        setEnsureTomorrowStatus("error");
      }
    }
  }

  const constraintRows: ExposureRow[] = exposure
    ? (() => {
        const allIds = new Set([
          ...Object.keys(exposure.past.constraintCounts),
          ...Object.keys(exposure.upcoming.constraintCounts),
        ]);
        return [...allIds].map((id) => ({
          label: constraintLabel(id),
          pastCount: exposure.past.constraintCounts[id] ?? 0,
          upcomingCount: exposure.upcoming.constraintCounts[id] ?? 0,
        }));
      })()
    : [];

  const countryRows: ExposureRow[] = exposure
    ? (() => {
        const allCodes = new Set([
          ...Object.keys(exposure.past.countryCounts),
          ...Object.keys(exposure.upcoming.countryCounts),
        ]);
        return [...allCodes].map((code) => ({
          label: getCountryLabel(code),
          pastCount: exposure.past.countryCounts[code] ?? 0,
          upcomingCount: exposure.upcoming.countryCounts[code] ?? 0,
        }));
      })()
    : [];

  return (
    <PanelCard>
      <PanelHeader title="État du pool" className="mb-4" />

      <div className="mb-5 flex flex-wrap justify-around gap-4">
        <StatBlock label="en stock" value={stats?.available ?? "—"} accent />
        <StatBlock label="générées au total" value={stats?.total ?? "—"} />
      </div>

      {hasTomorrowGrid === false && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg bg-error/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-error">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Aucune grille planifiée pour demain.
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleEnsureTomorrow}
            disabled={ensureTomorrowStatus === "loading"}
            className="shrink-0"
          >
            {ensureTomorrowStatus === "loading" && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {ensureTomorrowStatus === "loading"
              ? "Planification…"
              : "Planifier maintenant"}
          </Button>
          {ensureTomorrowStatus === "error" && (
            <p className="text-xs text-error sm:basis-full">
              Erreur lors de la planification.
            </p>
          )}
        </div>
      )}
      {hasTomorrowGrid === true && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Grille de demain planifiée.
        </div>
      )}

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => setRefreshDialogOpen(true)}
            disabled={refreshStatus === "loading"}
          >
            {refreshStatus === "loading" && (
              <Loader2 className="animate-spin" />
            )}
            {refreshStatus === "loading"
              ? "Regénération…"
              : "Regénérer le pool"}
          </Button>
          {typeof refreshStatus === "object" && (
            <span className="text-xs text-on-surface-variant">
              {refreshStatus.deletedAvailable} supprimée
              {refreshStatus.deletedAvailable !== 1 ? "s" : ""},{" "}
              {refreshStatus.totalGenerated} ajoutée
              {refreshStatus.totalGenerated !== 1 ? "s" : ""} en{" "}
              {refreshStatus.durationMs} ms
            </span>
          )}
        </div>
      </div>

      <Dialog open={refreshDialogOpen} onOpenChange={setRefreshDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regénérer le pool ?</DialogTitle>
            <DialogDescription className="text-on-surface-variant">
              Supprime toutes les grilles candidates en stock (available) puis
              génère un nouveau lot. Les grilles déjà planifiées et publiées ne
              seront pas modifiées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRefreshDialogOpen(false)}
              disabled={refreshStatus === "loading"}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => {
                setRefreshDialogOpen(false);
                handleRefreshPool();
              }}
              disabled={refreshStatus === "loading"}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {exposure && (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <ExposureList
            title="Exposition des contraintes"
            rows={constraintRows}
            pastGridCount={exposure.pastGridCount}
            upcomingGridCount={exposure.upcomingGridCount}
          />
          <ExposureList
            title="Exposition des pays"
            rows={countryRows}
            pastGridCount={exposure.pastGridCount}
            upcomingGridCount={exposure.upcomingGridCount}
          />
        </div>
      )}
    </PanelCard>
  );
}
