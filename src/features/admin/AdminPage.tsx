import AppFooter from "@/app/AppFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { AdminAuthBoundary } from "./components/AdminAuthBoundary";
import { DiversityMetricsPanel } from "./components/DiversityMetricsPanel";
import { GridDetail } from "./components/GridDetail";
import { PoolOverviewPanel } from "./components/PoolOverviewPanel";
import { ScheduleCalendar } from "./components/ScheduleCalendar";
import { UpcomingGridsPanel } from "./components/UpcomingGridsPanel";
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
    token ? { adminToken: token } : "skip",
  );

  const feedbackStats = useQuery(
    api.grids.getGridFeedbackStats,
    token ? { adminToken: token, limit: 60 } : "skip",
  );

  const scheduledDates = new Set<string>(
    (scheduledGrids ?? []).map((g) => g.date),
  );

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = dateToStr(tomorrow);

  const selectedGrid =
    selectedDate != null
      ? ((scheduledGrids ?? []).find((g) => g.date === selectedDate) ?? null)
      : null;

  // ── Écran de connexion ──────────────────────────────────────────────────────

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col bg-surface px-4 py-8">
        <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col gap-6">
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
        <AppFooter className="mt-auto shrink-0" />
      </div>
    );
  }

  // ── Page principale ─────────────────────────────────────────────────────────

  return (
    <AdminAuthBoundary onUnauthorized={clearToken}>
      <div className="flex min-h-screen flex-col bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
          <AdminHeader onLogout={clearToken} />

          <PoolOverviewPanel
            token={token}
            clearToken={clearToken}
            hasTomorrowGrid={
              scheduledGrids === undefined
                ? undefined
                : scheduledDates.has(tomorrowStr)
            }
          />

          <section className="rounded-2xl bg-surface-low p-4 md:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] font-semibold text-on-surface-variant tracking-widest uppercase">
                Planification
              </p>
            </div>
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
                  token={token}
                />
              </div>
            </div>
          </section>

          <UpcomingGridsPanel token={token} />

          <DiversityMetricsPanel
            feedbackStats={feedbackStats}
            scheduledGrids={scheduledGrids ?? []}
          />
        </div>
        <AppFooter className="mt-auto shrink-0 px-4 pb-6" />
      </div>
    </AdminAuthBoundary>
  );
}
