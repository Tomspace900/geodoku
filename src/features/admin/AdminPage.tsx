import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { CandidateCard } from "./components/CandidateCard";
import { GridDetail } from "./components/GridDetail";
import { QueueStats } from "./components/QueueStats";
import { ScheduleCalendar } from "./components/ScheduleCalendar";
import { useAdminToken } from "./hooks/useAdminToken";
import { dateToStr, getNextAvailableDate } from "./logic/scheduling";

type Tab = "pending" | "approved" | "rejected";

const TAB_LABELS: Record<Tab, string> = {
  pending: "En attente",
  approved: "Approuvés",
  rejected: "Rejetés",
};

// ─── Header ───────────────────────────────────────────────────────────────────

function AdminHeader({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="flex items-center justify-between py-2">
      <div className="flex flex-col">
        <h1 className="font-serif text-2xl font-medium italic text-on-surface leading-none">
          Geodoku
        </h1>
        <p className="text-[10px] text-on-surface-variant tracking-widest mt-1 uppercase">
          Administration
        </p>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="text-[10px] font-semibold text-on-surface-variant tracking-widest uppercase hover:text-on-surface transition-colors"
      >
        Déconnexion
      </button>
    </header>
  );
}

// ─── AdminPage ────────────────────────────────────────────────────────────────

export function AdminPage() {
  const [token, setToken, clearToken] = useAdminToken();
  const [tokenInput, setTokenInput] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [selectedDate, setSelectedDate] = useState<string | null>(
    dateToStr(new Date()),
  );

  const scheduledGrids = useQuery(
    api.grids.getScheduledGrids,
    token ? {} : "skip",
  );

  const candidates = useQuery(
    api.grids.getCandidates,
    token
      ? {
          status: activeTab,
          limit: 20,
          sortBy: activeTab === "pending" ? "score" : "date",
        }
      : "skip",
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

  // ── Écran de connexion ────────────────────────────────────────────────────

  if (!token) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center px-4 py-6">
        <div className="w-full max-w-[400px] flex flex-col gap-8">
          <header className="py-2">
            <h1 className="font-serif text-2xl font-medium italic text-on-surface leading-none">
              Geodoku
            </h1>
            <p className="text-[10px] text-on-surface-variant tracking-widest mt-1 uppercase">
              Administration
            </p>
          </header>

          <div className="flex flex-col gap-4">
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
              className="border-0 border-b border-outline-variant/40 rounded-none px-0 focus-visible:ring-0 bg-transparent"
            />
            <Button
              onClick={() => setToken(tokenInput)}
              disabled={!tokenInput}
              className="bg-on-surface text-surface-lowest hover:bg-on-surface/90 self-start"
            >
              Connexion
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Page principale ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
        <AdminHeader onLogout={clearToken} />

        {/* Alerte si aucune grille pour demain */}
        {!hasTomorrowGrid && scheduledGrids !== undefined && (
          <div className="bg-red-500/10 text-red-800 rounded-xl px-4 py-3 text-sm font-medium">
            Aucune grille planifiée pour demain ({tomorrowStr}) !
          </div>
        )}

        <QueueStats />

        <div className="h-px bg-surface-highest" />

        {/* Calendrier + détail de la grille sélectionnée */}
        <div className="grid grid-cols-1 gap-4 items-stretch md:grid-cols-5">
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
            />
          </div>
        </div>

        <div className="h-px bg-surface-highest" />

        {/* Tabs */}
        <div className="flex gap-1.5">
          {(["pending", "approved", "rejected"] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors",
                activeTab === tab
                  ? "bg-on-surface text-surface-lowest"
                  : "text-on-surface-variant hover:bg-surface-highest",
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Liste des candidats */}
        {candidates === undefined ? (
          <p className="text-sm text-on-surface-variant">Chargement…</p>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            Aucune grille dans l'onglet «{TAB_LABELS[activeTab]}».
          </p>
        ) : (
          <div className="flex flex-col">
            {candidates.map((candidate, index) => (
              <div key={candidate._id} className="py-4 first:pt-0 last:pb-0">
                <CandidateCard
                  candidate={candidate}
                  adminToken={token}
                  onUnauthorized={clearToken}
                  nextAvailableDate={nextAvailableDate}
                  scheduledDates={scheduledDates}
                />
                {index < candidates.length - 1 && (
                  <div className="mt-4 h-px bg-surface-highest" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
