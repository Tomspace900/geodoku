import AppFooter from "@/app/AppFooter";
import { AppMark } from "@/components/AppMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DisplayHeader } from "@/components/editorial/DisplayHeader";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { todayUTC, tomorrowUTC } from "@/lib/dates";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { AdminAuthBoundary } from "./components/AdminAuthBoundary";
import { DiversityMetricsPanel } from "./components/DiversityMetricsPanel";
import { GridDetail } from "./components/GridDetail";
import { PanelCard } from "./components/PanelCard";
import { PanelHeader } from "./components/PanelHeader";
import { PoolOverviewPanel } from "./components/PoolOverviewPanel";
import { ScheduleCalendar } from "./components/ScheduleCalendar";
import { UpcomingGridsPanel } from "./components/UpcomingGridsPanel";
import { useAdminToken } from "./hooks/useAdminToken";

// ─── Header ───────────────────────────────────────────────────────────────────

function AdminHeader({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="rounded-lg bg-surface-low p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <DisplayHeader
          as="h1"
          size="lg"
          leftIcon={<AppMark className="h-8 w-8" />}
          title="Geodoku"
          eyebrow="Dashboard administration"
        />
        <Button type="button" variant="ghost-label" onClick={onLogout}>
          Déconnexion
        </Button>
      </div>
    </header>
  );
}

// ─── AdminPage ────────────────────────────────────────────────────────────────

export function AdminPage() {
  const [token, setToken, clearToken] = useAdminToken();
  const [tokenInput, setTokenInput] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(todayUTC());

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

  const tomorrowStr = tomorrowUTC();

  const selectedGrid =
    selectedDate != null
      ? ((scheduledGrids ?? []).find((g) => g.date === selectedDate) ?? null)
      : null;

  // ── Écran de connexion ──────────────────────────────────────────────────────

  if (!token) {
    return (
      <div className="flex min-h-svh flex-col bg-surface px-4 py-8">
        <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col gap-6">
          <header className="rounded-lg bg-surface-low p-6">
            <DisplayHeader
              as="h1"
              size="lg"
              leftIcon={<AppMark className="h-8 w-8" />}
              title="Geodoku"
              eyebrow="Administration"
            />
          </header>

          <div className="rounded-lg bg-surface-lowest p-6 shadow-editorial">
            <Eyebrow className="mb-4 font-semibold">Accès sécurisé</Eyebrow>
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
              className="mt-4"
            />
            <Button
              onClick={() => setToken(tokenInput)}
              disabled={!tokenInput}
              className="mt-5"
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
      <div className="flex min-h-svh flex-col bg-surface">
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

          <PanelCard>
            <PanelHeader title="Planification" />
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
                  token={token}
                  grid={selectedGrid}
                  selectedDate={selectedDate}
                />
              </div>
            </div>
          </PanelCard>

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
