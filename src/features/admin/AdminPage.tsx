import AppFooter from "@/app/AppFooter";
import { AppMark } from "@/components/AppMark";
import { DisplayHeader } from "@/components/editorial/DisplayHeader";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { todayUTC, tomorrowUTC } from "@/lib/dates";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import { AdminAuthBoundary } from "./components/AdminAuthBoundary";
import { GameCalendar } from "./components/GameCalendar";
import { GameHealthPanel } from "./components/GameHealthPanel";
import { type DayView, GridDayDetail } from "./components/GridDayDetail";
import { PanelCard } from "./components/PanelCard";
import { PanelHeader } from "./components/PanelHeader";
import { PoolOverviewPanel } from "./components/PoolOverviewPanel";
import { useAdminToken } from "./hooks/useAdminToken";
import { buildCalendarMarkers } from "./logic/analytics";

const UPCOMING_DAYS = 14;

// ─── Header ───────────────────────────────────────────────────────────────────

const backLinkClassName =
  "inline-flex w-fit items-center gap-1.5 rounded-sm font-sans text-xs text-on-surface-variant underline-offset-2 transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-surface/20 focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

function AdminHeader({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <Link to="/" className={backLinkClassName}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Retour au jeu
        </Link>

        <Button
          type="button"
          variant="ghost"
          onClick={onLogout}
          className={backLinkClassName}
        >
          Déconnexion
        </Button>
      </div>

      <DisplayHeader
        as="h1"
        size="lg"
        leftIcon={<AppMark />}
        title="Geodoku"
        eyebrow="Dashboard admin"
      />
    </header>
  );
}

// ─── AdminPage ────────────────────────────────────────────────────────────────

export function AdminPage() {
  const [token, setToken, clearToken] = useAdminToken();
  const [tokenInput, setTokenInput] = useState("");

  // ── Écran de connexion ──────────────────────────────────────────────────────

  if (!token) {
    return (
      <div className="flex min-h-svh flex-col items-center bg-surface px-4 py-6">
        <div className="flex w-full max-w-[460px] flex-1 flex-col gap-8">
          <header className="flex flex-col gap-5">
            <Link to="/" className={backLinkClassName}>
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Retour au jeu
            </Link>

            <DisplayHeader
              as="h1"
              size="lg"
              leftIcon={<AppMark />}
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
        <AppFooter className="mt-auto w-full shrink-0" />
      </div>
    );
  }

  // ── Page principale ─────────────────────────────────────────────────────────

  return (
    <AdminAuthBoundary onUnauthorized={clearToken}>
      <AuthenticatedAdminDashboard token={token} clearToken={clearToken} />
    </AdminAuthBoundary>
  );
}

type AuthenticatedAdminDashboardProps = {
  token: string;
  clearToken: () => void;
};

/**
 * Toutes les queries protégées vivent sous `AdminAuthBoundary`. Une erreur
 * d'authentification peut ainsi vider le token sans tomber sur l'écran de crash.
 */
function AuthenticatedAdminDashboard({
  token,
  clearToken,
}: AuthenticatedAdminDashboardProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(todayUTC());
  const scheduledGrids = useQuery(api.grids.getScheduledGrids, {
    adminToken: token,
  });
  const feedbackStats = useQuery(api.grids.getGridFeedbackStats, {
    adminToken: token,
    limit: 60,
  });
  const upcoming = useQuery(api.grids.getUpcomingScheduledPreview, {
    adminToken: token,
    days: UPCOMING_DAYS,
  });

  const today = todayUTC();
  const tomorrowStr = tomorrowUTC();
  const scheduledByDate = new Map(
    (scheduledGrids ?? []).map((grid) => [grid.date, grid]),
  );
  const upcomingByDate = new Map(
    (upcoming ?? []).map((day) => [day.date, day]),
  );
  const winRateByDate = new Map(
    (feedbackStats ?? []).map((feedback) => [feedback.date, feedback.winRate]),
  );
  const markers = buildCalendarMarkers({
    today,
    scheduled: (scheduledGrids ?? []).map((grid) => ({
      date: grid.date,
      gridPopTop3: grid.gridPopTop3,
    })),
    winRateByDate,
    upcoming: (upcoming ?? []).map((day) => ({
      date: day.date,
      kind: day.kind,
      gridPopTop3: day.kind === "missing" ? undefined : day.gridPopTop3,
    })),
  });

  function computeDayView(): DayView | null {
    if (!selectedDate) return null;

    const grid = scheduledByDate.get(selectedDate);
    if (grid) {
      if (selectedDate <= today) {
        return {
          kind: "observed",
          date: selectedDate,
          status: selectedDate === today ? "active" : "past",
        };
      }
      return {
        kind: "future",
        status: "scheduled",
        date: selectedDate,
        candidateId: null,
      };
    }

    const day = upcomingByDate.get(selectedDate);
    if (day && day.kind !== "missing") {
      return {
        kind: "future",
        status: day.kind === "predicted" ? "predicted" : "scheduled",
        date: selectedDate,
        candidateId: day.kind === "predicted" ? day.candidateId : null,
      };
    }
    if (day?.kind === "missing") return { kind: "missing", date: selectedDate };
    return null;
  }

  const selectedView = computeDayView();
  const hasTomorrowGrid =
    scheduledGrids === undefined ? undefined : scheduledByDate.has(tomorrowStr);

  return (
    <div className="flex min-h-svh flex-col items-center bg-surface px-4 py-6">
      <main className="flex w-full max-w-6xl flex-1 flex-col gap-8">
        <AdminHeader onLogout={clearToken} />

        <PoolOverviewPanel
          token={token}
          clearToken={clearToken}
          hasTomorrowGrid={hasTomorrowGrid}
        />

        <PanelCard>
          <PanelHeader title="Planification" />
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-5">
            <div className="col-span-1 h-full md:col-span-2">
              <GameCalendar
                markers={markers}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </div>
            <div className="col-span-1 h-full md:col-span-3">
              <GridDayDetail
                token={token}
                clearToken={clearToken}
                selectedDate={selectedDate}
                view={selectedView}
              />
            </div>
          </div>
        </PanelCard>

        <GameHealthPanel feedbackStats={feedbackStats} />
      </main>
      <AppFooter className="mt-auto w-full shrink-0" />
    </div>
  );
}
