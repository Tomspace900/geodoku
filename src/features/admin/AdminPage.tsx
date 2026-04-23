import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorScreen } from "@/features/errors/components/ErrorScreen";
import { useBackendDownTimeout } from "@/features/errors/hooks/useBackendDownTimeout";
import { cn } from "@/lib/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { CandidateCard } from "./components/CandidateCard";
import { GridDetail } from "./components/GridDetail";
import { ScheduleCalendar } from "./components/ScheduleCalendar";
import { TuningConstantsPanel } from "./components/TuningConstantsPanel";
import { useAdminToken } from "./hooks/useAdminToken";
import { useAdvancedMode } from "./hooks/useAdvancedMode";
import { dateToStr, getNextAvailableDate } from "./logic/scheduling";

type Tab = "pending" | "approved" | "rejected";

const TAB_LABELS: Record<Tab, string> = {
  pending: "En attente",
  approved: "Approuvés",
  rejected: "Rejetés",
};

// ─── Header ───────────────────────────────────────────────────────────────────

function AdminHeader({
  onLogout,
  advanced,
  onToggleAdvanced,
}: {
  onLogout: () => void;
  advanced: boolean;
  onToggleAdvanced: (value: boolean) => void;
}) {
  return (
    <header className="rounded-2xl bg-surface-low p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-3xl font-medium italic text-on-surface leading-none">
            Geodoku
          </h1>
          <div className="h-1 w-12 rounded-full bg-brand" />
          <p className="text-[10px] text-on-surface-variant tracking-widest uppercase">
            Dashboard administration
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => onToggleAdvanced(!advanced)}
            className={cn(
              "text-[10px] font-semibold tracking-widest uppercase transition-colors",
              advanced
                ? "text-brand hover:text-brand/80"
                : "text-on-surface-variant hover:text-on-surface",
            )}
            aria-pressed={advanced}
          >
            {advanced ? "● Advanced" : "○ Advanced"}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="text-[10px] font-semibold text-on-surface-variant tracking-widest uppercase transition-colors hover:text-on-surface"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── AdminPage ────────────────────────────────────────────────────────────────

export function AdminPage() {
  const [token, setToken, clearToken] = useAdminToken();
  const [advanced, setAdvanced] = useAdvancedMode();
  const [tokenInput, setTokenInput] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [candidateLimit, setCandidateLimit] = useState(12);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    dateToStr(new Date()),
  );
  const [isPurgingCandidates, setIsPurgingCandidates] = useState(false);
  const [isGeneratingCandidates, setIsGeneratingCandidates] = useState(false);
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);
  const [generationMessage, setGenerationMessage] = useState<string | null>(
    null,
  );

  const purgeAllPendingCandidates = useMutation(
    api.grids.purgeAllPendingCandidates,
  );
  const triggerGeneration = useAction(api.grids.triggerGeneration);

  const scheduledGrids = useQuery(
    api.grids.getScheduledGrids,
    token ? {} : "skip",
  );

  const candidates = useQuery(
    api.grids.getCandidates,
    token
      ? {
          status: activeTab,
          limit: candidateLimit,
          sortBy: activeTab === "pending" ? "score" : "date",
        }
      : "skip",
  );

  const isBackendDown = useBackendDownTimeout(
    Boolean(token) && scheduledGrids === undefined,
  );

  // Dériver les données de planification depuis scheduledGrids
  const scheduledDates = new Set<string>(
    (scheduledGrids ?? []).map((g) => g.date),
  );
  const nextAvailableDate = getNextAvailableDate(scheduledDates);

  // Alerte si aucune grille n'est planifiée pour demain
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = dateToStr(tomorrow);
  const hasTomorrowGrid = scheduledDates.has(tomorrowStr);

  // Grille correspondant à la date sélectionnée dans le calendrier
  const selectedGrid =
    selectedDate != null
      ? ((scheduledGrids ?? []).find((g) => g.date === selectedDate) ?? null)
      : null;

  async function handlePurgePendingCandidates() {
    if (!token) return;
    const confirmed = window.confirm(
      "Supprimer toutes les candidates en attente (pending) ? Les approuvées et rejetées ne sont pas touchées.",
    );
    if (!confirmed) return;

    setIsPurgingCandidates(true);
    setPurgeMessage(null);
    try {
      const result = await purgeAllPendingCandidates({ adminToken: token });
      setPurgeMessage(
        `${result.deleted} candidat${result.deleted === 1 ? "" : "s"} pending supprimé${result.deleted === 1 ? "" : "s"}.`,
      );
    } catch (err) {
      if (
        err instanceof ConvexError &&
        String(err.message).includes("Unauthorized")
      ) {
        clearToken();
        return;
      }
      setPurgeMessage("Impossible de purger les candidates pour le moment.");
    } finally {
      setIsPurgingCandidates(false);
    }
  }

  async function handleTriggerGeneration() {
    if (!token) return;
    setIsGeneratingCandidates(true);
    setGenerationMessage(null);
    try {
      await triggerGeneration({ adminToken: token });
      setGenerationMessage("Génération lancée avec succès.");
    } catch (err) {
      if (
        err instanceof ConvexError &&
        String(err.message).includes("Unauthorized")
      ) {
        clearToken();
        return;
      }
      setGenerationMessage(
        "Impossible de lancer la génération pour le moment.",
      );
    } finally {
      setIsGeneratingCandidates(false);
    }
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setCandidateLimit(12);
  }

  // ── Écran de connexion ────────────────────────────────────────────────────

  if (!token) {
    return (
      <div className="min-h-screen bg-surface px-4 py-8">
        <div className="mx-auto flex w-full max-w-[460px] flex-col gap-6">
          <header className="rounded-2xl bg-surface-low p-6">
            <h1 className="font-serif text-3xl font-medium italic text-on-surface leading-none">
              Geodoku
            </h1>
            <div className="mt-2 h-1 w-12 rounded-full bg-brand" />
            <p className="mt-2 text-[10px] text-on-surface-variant tracking-widest uppercase">
              Administration
            </p>
          </header>

          <div className="rounded-2xl bg-surface-lowest p-6 shadow-editorial">
            <p className="mb-4 text-[10px] font-semibold text-on-surface-variant tracking-widest uppercase">
              Accès sécurisé
            </p>
            <p className="text-sm text-on-surface-variant">
              Saisissez votre token pour accéder au panneau d'administration.
            </p>
            <Input
              type="password"
              placeholder="Token d'administration"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tokenInput) setToken(tokenInput);
              }}
              className="mt-4 rounded-none border-0 border-b border-outline-variant/40 bg-transparent px-0 focus-visible:ring-0"
            />
            <Button
              onClick={() => setToken(tokenInput)}
              disabled={!tokenInput}
              className="mt-5 bg-on-surface text-surface-lowest hover:bg-on-surface/90"
            >
              Connexion
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Backend injoignable (timeout > 8s après login) ────────────────────────

  if (isBackendDown) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-surface px-4 py-8">
        <div className="flex w-full max-w-[500px] flex-col gap-6">
          <AdminHeader onLogout={clearToken} advanced={false} onToggleAdvanced={() => {}} />
          <ErrorScreen variant="backend-down" />
        </div>
      </div>
    );
  }

  // ── Page principale ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <AdminHeader
          onLogout={clearToken}
          advanced={advanced}
          onToggleAdvanced={setAdvanced}
        />

        {advanced && <TuningConstantsPanel />}

        <section className="rounded-2xl bg-surface-low p-4 md:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-semibold text-on-surface-variant tracking-widest uppercase">
              Planification
            </p>
          </div>
          {!hasTomorrowGrid && scheduledGrids !== undefined ? (
            <div className="mb-3 rounded-lg bg-rarity-ultra/10 px-3 py-2 text-sm text-rarity-ultra flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Aucune grille planifiée pour demain ({tomorrowStr}).
            </div>
          ) : (
            <div className="mb-3 rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Il y a bien une grille planifiée pour demain ({tomorrowStr}).
            </div>
          )}
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-5">
            <div className="col-span-1 h-full md:col-span-2">
              <ScheduleCalendar
                scheduledGrids={scheduledGrids ?? []}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </div>
            <div className="col-span-1 h-full md:col-span-3">
              <GridDetail
                grid={selectedGrid}
                selectedDate={selectedDate}
                adminToken={token}
                onUnauthorized={clearToken}
                onUnscheduled={() => setSelectedDate(null)}
                advanced={advanced}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-surface-low p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-semibold text-on-surface-variant tracking-widest uppercase">
              Revue des candidates
            </p>
            <div className="inline-flex rounded-lg bg-surface-highest p-1">
              {(["pending", "approved", "rejected"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabChange(tab)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors",
                    activeTab === tab
                      ? "bg-on-surface text-surface-lowest"
                      : "text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 rounded-xl bg-surface-lowest p-3">
            <p className="mb-2 text-[10px] font-semibold text-on-surface-variant tracking-widest uppercase">
              Actions maintenance
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handlePurgePendingCandidates}
                disabled={isPurgingCandidates}
                className="bg-surface-highest text-on-surface hover:bg-surface-highest/80"
              >
                {isPurgingCandidates
                  ? "Purge en cours…"
                  : "Purger la file pending"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleTriggerGeneration}
                disabled={isGeneratingCandidates}
                className="bg-surface-highest text-on-surface hover:bg-surface-highest/80"
              >
                {isGeneratingCandidates
                  ? "Génération en cours…"
                  : "Générer des candidates"}
              </Button>
            </div>
            {(purgeMessage || generationMessage) && (
              <div className="mt-2 space-y-1">
                {purgeMessage && (
                  <p className="text-xs text-on-surface-variant">
                    {purgeMessage}
                  </p>
                )}
                {generationMessage && (
                  <p className="text-xs text-on-surface-variant">
                    {generationMessage}
                  </p>
                )}
              </div>
            )}
          </div>

          {candidates === undefined ? (
            <p className="text-sm text-on-surface-variant">Chargement…</p>
          ) : candidates.length === 0 ? (
            <div className="rounded-xl bg-surface-lowest p-5 text-sm text-on-surface-variant">
              Aucune grille dans l'onglet «{TAB_LABELS[activeTab]}».
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {candidates.map((candidate) => (
                  <CandidateCard
                    key={candidate._id}
                    candidate={candidate}
                    adminToken={token}
                    onUnauthorized={clearToken}
                    nextAvailableDate={nextAvailableDate}
                    scheduledDates={scheduledDates}
                    advanced={advanced}
                  />
                ))}
              </div>
              {candidateLimit < 50 && candidates.length >= candidateLimit && (
                <div className="mt-4 flex justify-center">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setCandidateLimit(50)}
                    className="bg-surface-highest text-on-surface hover:bg-surface-highest/80"
                  >
                    Afficher plus de candidates
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
