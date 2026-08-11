import { useAction, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "../../../../convex/_generated/api";
import {
  type GenerationReport,
  POOL_LOW_THRESHOLD,
} from "../../../../convex/lib/gridConstants";
import type { PoolPostActivationWarning } from "../../../../convex/lib/poolReconciliation";
import { isUnauthorizedError } from "../logic/errors";
import { AlertBanner } from "./AlertBanner";
import { ConfirmDialog } from "./ConfirmDialog";
import { PanelCard } from "./PanelCard";
import { PanelHeader } from "./PanelHeader";

/** Au-dessus : pool sain. Entre les deux : en baisse (ambre). Sous le seuil bas : critique. */
const POOL_WARNING_THRESHOLD = POOL_LOW_THRESHOLD * 1.5;

function poolTone(available: number): "success" | "warning" | "error" {
  if (available < POOL_LOW_THRESHOLD) return "error";
  if (available < POOL_WARNING_THRESHOLD) return "warning";
  return "success";
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
  regenLoading,
  onRegen,
}: {
  available: number;
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
        {available} candidates actives en stock
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
    return (
      <AlertBanner tone="success">Grille de demain planifiée.</AlertBanner>
    );
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

type RefreshReport = GenerationReport & {
  deletedAvailable: number;
  warnings: PoolPostActivationWarning[];
};
type FinalizationResult = { warnings: PoolPostActivationWarning[] };

type CommandStatus<T = undefined> =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "error" }
  | { kind: "success"; result: T };

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
  const retryPoolFinalization = useAction(api.grids.retryPoolFinalization);
  const runEnsureTomorrow = useAction(api.grids.runEnsureTomorrow);

  const [refreshStatus, setRefreshStatus] = useState<
    CommandStatus<RefreshReport>
  >({ kind: "idle" });
  const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);
  const [finalizationStatus, setFinalizationStatus] = useState<
    CommandStatus<FinalizationResult>
  >({ kind: "idle" });
  const [ensureTomorrowStatus, setEnsureTomorrowStatus] =
    useState<CommandStatus>({ kind: "idle" });

  async function handleRefreshPool() {
    setRefreshStatus({ kind: "pending" });
    setFinalizationStatus({ kind: "idle" });
    try {
      const report = await refreshPool({ adminToken: token });
      setRefreshStatus({ kind: "success", result: report });
      setRefreshDialogOpen(false);
    } catch (err) {
      setRefreshDialogOpen(false);
      if (isUnauthorizedError(err)) {
        clearToken();
      } else {
        setRefreshStatus({ kind: "error" });
      }
    }
  }

  async function handleRetryFinalization() {
    setFinalizationStatus({ kind: "pending" });
    try {
      const result = await retryPoolFinalization({ adminToken: token });
      setFinalizationStatus({ kind: "success", result });
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearToken();
      } else {
        setFinalizationStatus({ kind: "error" });
      }
    }
  }

  async function handleEnsureTomorrow() {
    setEnsureTomorrowStatus({ kind: "pending" });
    try {
      await runEnsureTomorrow({ adminToken: token });
      setEnsureTomorrowStatus({ kind: "success", result: undefined });
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearToken();
      } else {
        setEnsureTomorrowStatus({ kind: "error" });
      }
    }
  }

  const finalizationWarnings =
    refreshStatus.kind === "success"
      ? finalizationStatus.kind === "success"
        ? finalizationStatus.result.warnings
        : refreshStatus.result.warnings
      : [];

  return (
    <PanelCard>
      <PanelHeader title="État du pool" className="mb-4" />

      <TomorrowGridBanner
        hasTomorrowGrid={hasTomorrowGrid}
        ensureLoading={ensureTomorrowStatus.kind === "pending"}
        ensureError={ensureTomorrowStatus.kind === "error"}
        onEnsureTomorrow={handleEnsureTomorrow}
      />

      {stats !== undefined && (
        <PoolHealthBanner
          available={stats.available}
          regenLoading={refreshStatus.kind === "pending"}
          onRegen={() => setRefreshDialogOpen(true)}
        />
      )}

      {refreshStatus.kind === "error" && (
        <AlertBanner
          tone="error"
          action={
            <Button
              type="button"
              size="sm"
              onClick={handleRetryFinalization}
              disabled={finalizationStatus.kind === "pending"}
            >
              {finalizationStatus.kind === "pending" && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {finalizationStatus.kind === "pending"
                ? "Finalisation…"
                : "Relancer les post-traitements"}
            </Button>
          }
        >
          <span className="block">
            Impossible de confirmer la régénération. Vérifie le stock actif
            avant de relancer une nouvelle génération.
          </span>
          {finalizationStatus.kind === "success" && (
            <span className="block text-xs text-on-surface-variant">
              Les post-traitements ont été rejoués ; le panneau de stock reste
              la source de vérité.
            </span>
          )}
          {finalizationStatus.kind === "error" && (
            <span className="block text-xs">
              Les post-traitements n'ont pas pu être rejoués.
            </span>
          )}
        </AlertBanner>
      )}

      {refreshStatus.kind === "success" && (
        <p className="text-xs text-on-surface-variant">
          {refreshStatus.result.totalGenerated} candidates activées en{" "}
          {refreshStatus.result.durationMs} ms. L'ancien lot est nettoyé en
          arrière-plan.
        </p>
      )}

      {finalizationWarnings.length > 0 && (
        <AlertBanner
          tone="warning"
          action={
            <Button
              type="button"
              size="sm"
              onClick={handleRetryFinalization}
              disabled={finalizationStatus.kind === "pending"}
            >
              {finalizationStatus.kind === "pending" && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {finalizationStatus.kind === "pending"
                ? "Finalisation…"
                : "Réessayer la finalisation"}
            </Button>
          }
        >
          <span className="block">
            Le nouveau pool est actif, mais certains post-traitements restent à
            terminer.
          </span>
          <span className="block text-xs text-on-surface-variant">
            {finalizationWarnings.includes("ensure_daily_grids_failed") &&
              "La planification immédiate a échoué. "}
            {finalizationWarnings.includes(
              "future_grid_reconciliation_failed",
            ) && "Le contrôle des grilles futures a échoué."}
            {finalizationStatus.kind === "error" &&
              " Le retry a échoué ; le nouveau pool reste actif."}
          </span>
        </AlertBanner>
      )}

      <ConfirmDialog
        open={refreshDialogOpen}
        onOpenChange={setRefreshDialogOpen}
        title="Regénérer le pool ?"
        description="Construit et valide un nouveau lot en arrière-plan, puis l'active d'un seul coup. Le pool actuel reste disponible si la génération échoue."
        busy={refreshStatus.kind === "pending"}
        onConfirm={handleRefreshPool}
      />
    </PanelCard>
  );
}
