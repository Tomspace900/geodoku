import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAction, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import {
  type GenerationReport,
  POOL_LOW_THRESHOLD,
} from "../../../../convex/lib/gridConstants";
import { AlertBanner } from "./AlertBanner";
import { PanelCard } from "./PanelCard";
import { PanelHeader } from "./PanelHeader";

/** Au-dessus : pool sain. Entre les deux : en baisse (ambre). Sous le seuil bas : critique. */
const POOL_WARNING_THRESHOLD = POOL_LOW_THRESHOLD * 1.5;

function poolTone(available: number): "brand" | "warning" | "error" {
  if (available < POOL_LOW_THRESHOLD) return "error";
  if (available < POOL_WARNING_THRESHOLD) return "warning";
  return "brand";
}

function poolStatus(available: number): string {
  if (available < POOL_LOW_THRESHOLD)
    return `Stock critique (< ${POOL_LOW_THRESHOLD}) — regénère le pool.`;
  if (available < POOL_WARNING_THRESHOLD)
    return "Stock en baisse — regénère bientôt.";
  return "Pool sain.";
}

/**
 * Bandeau de santé du pool : statut coloré + données inline + action
 * « Regénérer » à droite. Élément unifié de l'état pool (via `AlertBanner`).
 */
function PoolHealthBanner({
  available,
  used,
  total,
  regenLoading,
  onRegen,
}: {
  available: number;
  used: number;
  total: number;
  regenLoading: boolean;
  onRegen: () => void;
}) {
  return (
    <AlertBanner
      tone={poolTone(available)}
      action={
        <Button
          type="button"
          size="sm"
          onClick={onRegen}
          disabled={regenLoading}
          className="shrink-0"
        >
          {regenLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          {regenLoading ? "Regénération…" : "Regénérer le pool"}
        </Button>
      }
    >
      <span className="block">{poolStatus(available)}</span>
      <span className="block text-xs text-on-surface-variant">
        {available} en stock · {used} utilisées · {total} au total
      </span>
    </AlertBanner>
  );
}

function TomorrowGridBanner({
  hasTomorrowGrid,
  ensureLoading,
  ensureError,
  onEnsureTomorrow,
}: {
  hasTomorrowGrid: boolean | undefined;
  ensureLoading: boolean;
  ensureError: boolean;
  onEnsureTomorrow: () => void;
}) {
  if (hasTomorrowGrid === undefined) return null;

  if (hasTomorrowGrid) {
    return <AlertBanner tone="brand">Grille de demain planifiée.</AlertBanner>;
  }

  return (
    <AlertBanner
      tone="error"
      action={
        <Button
          type="button"
          size="sm"
          onClick={onEnsureTomorrow}
          disabled={ensureLoading}
          className="shrink-0"
        >
          {ensureLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          {ensureLoading ? "Planification…" : "Planifier maintenant"}
        </Button>
      }
    >
      <span className="block">Aucune grille planifiée pour demain.</span>
      {ensureError && (
        <span className="block text-xs">Erreur lors de la planification.</span>
      )}
    </AlertBanner>
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

  return (
    <PanelCard>
      <PanelHeader title="État du pool" className="mb-4" />

      <TomorrowGridBanner
        hasTomorrowGrid={hasTomorrowGrid}
        ensureLoading={ensureTomorrowStatus === "loading"}
        ensureError={ensureTomorrowStatus === "error"}
        onEnsureTomorrow={handleEnsureTomorrow}
      />

      {stats !== undefined && (
        <PoolHealthBanner
          available={stats.available}
          used={stats.used}
          total={stats.total}
          regenLoading={refreshStatus === "loading"}
          onRegen={() => setRefreshDialogOpen(true)}
        />
      )}

      {typeof refreshStatus === "object" && (
        <p className="text-xs text-on-surface-variant">
          {refreshStatus.deletedAvailable} supprimée
          {refreshStatus.deletedAvailable !== 1 ? "s" : ""},{" "}
          {refreshStatus.totalGenerated} ajoutée
          {refreshStatus.totalGenerated !== 1 ? "s" : ""} en{" "}
          {refreshStatus.durationMs} ms
        </p>
      )}

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
    </PanelCard>
  );
}
