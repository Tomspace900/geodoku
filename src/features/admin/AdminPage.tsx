import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "convex/react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { GridDetail } from "./components/GridDetail";
import { ScheduleCalendar } from "./components/ScheduleCalendar";
import { useAdminToken } from "./hooks/useAdminToken";
import { dateToStr } from "./logic/scheduling";

// ─── Header ───────────────────────────────────────────────────────────────────

function AdminHeader({ onLogout }: { onLogout: () => void }) {
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
        <button
          type="button"
          onClick={onLogout}
          className="text-[10px] font-semibold text-on-surface-variant tracking-widest uppercase transition-colors hover:text-on-surface"
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}

// ─── AdminPage ────────────────────────────────────────────────────────────────

export function AdminPage() {
  const [token, setToken, clearToken] = useAdminToken();
  const [tokenInput, setTokenInput] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(
    dateToStr(new Date()),
  );

  const scheduledGrids = useQuery(
    api.grids.getScheduledGrids,
    token ? {} : "skip",
  );

  const scheduledDates = new Set<string>(
    (scheduledGrids ?? []).map((g) => g.date),
  );

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = dateToStr(tomorrow);
  const hasTomorrowGrid = scheduledDates.has(tomorrowStr);

  const selectedGrid =
    selectedDate != null
      ? ((scheduledGrids ?? []).find((g) => g.date === selectedDate) ?? null)
      : null;

  // ── Écran de connexion ──────────────────────────────────────────────────────

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

  // ── Page principale ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <AdminHeader onLogout={clearToken} />

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
              <GridDetail grid={selectedGrid} selectedDate={selectedDate} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-surface-low p-4 md:p-5">
          <p className="text-[10px] font-semibold text-on-surface-variant tracking-widest uppercase mb-3">
            Pool de grilles
          </p>
          <p className="text-sm text-on-surface-variant">
            Interface de gestion du pool en cours de refactoring — disponible
            après validation des métriques de simulation.
          </p>
        </section>
      </div>
    </div>
  );
}
