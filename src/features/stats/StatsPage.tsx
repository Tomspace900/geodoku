import { useMemo, useState } from "react";
import AppFooter from "@/app/AppFooter";
import { BackLink } from "@/components/editorial/BackLink";
import { DisplayHeader } from "@/components/editorial/DisplayHeader";
import { Button } from "@/components/ui/button";
import { isDailyGameFinished } from "@/features/archive/logic/dailyGate";
import { loadHistory } from "@/features/game/logic/history";
import { loadPersistedGame } from "@/features/game/logic/persistence";
import { useLocale } from "@/i18n/LocaleContext";
import { DayDrawer } from "./components/DayDrawer";
import { EmptyStats } from "./components/EmptyStats";
import { InviteCard } from "./components/InviteCard";
import { PaletteBar } from "./components/PaletteBar";
import { RecentDaysChart } from "./components/RecentDaysChart";
import { StatsSection } from "./components/StatsSection";
import { StatTiles } from "./components/StatTiles";
import { ThemeSummary } from "./components/ThemeSummary";
import { ThemesDrawer } from "./components/ThemesDrawer";
import { useStatsResults } from "./hooks/useStatsResults";
import {
  computeMyStats,
  type DayResult,
  type PlayedGame,
  recentDays,
} from "./logic/myStats";

function StatsSkeleton() {
  const { t } = useLocale();
  return (
    <output aria-busy="true" className="grid grid-cols-2 gap-2">
      <span className="sr-only">{t("ui.loading")}</span>
      {Array.from({ length: 4 }, (_, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: quatre cases fixes
          key={index}
          className="h-[84px] animate-pulse rounded-xl bg-surface-low"
        />
      ))}
    </output>
  );
}

function StatsBody({
  games,
  onOpenAccount,
}: {
  games: readonly PlayedGame[] | undefined;
  onOpenAccount: () => void;
}) {
  const { t } = useLocale();
  const data = useStatsResults(games);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [themesOpen, setThemesOpen] = useState(false);
  // Garde de l'archive : on ne propose de rejouer qu'une fois le jour fini.
  const replayAllowed = useMemo(
    () =>
      data.status === "ready" &&
      isDailyGameFinished(loadPersistedGame(), data.today),
    [data],
  );

  if (data.status === "loading") return <StatsSkeleton />;
  const stats = computeMyStats(data.results);
  if (stats.played === 0) {
    return (
      <div className="flex flex-col gap-8">
        <EmptyStats />
        <InviteCard onOpenAccount={onOpenAccount} />
      </div>
    );
  }
  const recent = recentDays(data.results, data.today);
  const byDate = new Map<string, DayResult>(
    data.results.map((result) => [result.date, result]),
  );
  const lastPlayed = [...recent.days]
    .reverse()
    .find((day) => day.kind !== "none")?.date;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-12">
        <div className="flex flex-col gap-8">
          <StatTiles stats={stats} />
          <StatsSection title={t("stats.palette")}>
            <PaletteBar stats={stats} />
          </StatsSection>
        </div>
        <div className="flex flex-col gap-8">
          <StatsSection
            title={t("stats.recent")}
            onOpen={lastPlayed ? () => setSelectedDay(lastPlayed) : undefined}
          >
            <RecentDaysChart
              recent={recent}
              selected={null}
              onSelect={setSelectedDay}
            />
          </StatsSection>
          <ThemeSummary
            themes={stats.themes}
            onOpen={() => setThemesOpen(true)}
          />
        </div>
      </div>
      <InviteCard onOpenAccount={onOpenAccount} />
      <DayDrawer
        open={selectedDay !== null}
        recent={recent}
        results={byDate}
        selected={selectedDay}
        onSelect={setSelectedDay}
        onClose={() => setSelectedDay(null)}
        today={data.today}
        replayAllowed={replayAllowed}
      />
      <ThemesDrawer
        open={themesOpen}
        themes={stats.themes}
        onClose={() => setThemesOpen(false)}
      />
    </div>
  );
}

/**
 * « Mes stats » (#155) : une page à part, avec son adresse. Sans compte,
 * calculée sur le journal de l'appareil (« Sur cet appareil »).
 */
export function StatsPage() {
  const { t, localizedPath } = useLocale();
  const games = useMemo(() => loadHistory(), []);
  const openAccount = () => {};

  return (
    <div className="flex min-h-svh flex-col items-center bg-surface px-4 py-6">
      <div className="flex w-full max-w-2xl flex-1 flex-col gap-8 lg:max-w-5xl">
        <header className="flex flex-col gap-5">
          <BackLink to={localizedPath("/")} label={t("stats.backToGrid")} />
          <DisplayHeader
            as="h1"
            size="lg"
            title={t("stats.title")}
            eyebrow={
              <span className="inline-flex flex-wrap items-center gap-x-1.5">
                {t("stats.onThisDevice")} ·
                <Button
                  type="button"
                  variant="ghost-label"
                  onClick={openAccount}
                  className="text-brand hover:text-brand"
                >
                  {t("stats.createAccountLink")}
                </Button>
              </span>
            }
          />
        </header>
        <StatsBody games={games} onOpenAccount={openAccount} />
      </div>
      <AppFooter className="mt-auto w-full shrink-0" />
    </div>
  );
}
