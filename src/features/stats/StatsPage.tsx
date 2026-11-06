import { usePostHog } from "@posthog/react";
import { useMutation, useQuery } from "convex/react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import AppFooter from "@/app/AppFooter";
import { BackLink } from "@/components/editorial/BackLink";
import { DisplayHeader } from "@/components/editorial/DisplayHeader";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/features/account/AccountContext";
import { AccountDialog } from "@/features/account/components/AccountDialog";
import { AccountDrawer } from "@/features/account/components/AccountDrawer";
import { CountryDrawer } from "@/features/account/components/CountryDrawer";
import { NameDrawer } from "@/features/account/components/NameDrawer";
import { isDailyGameFinished } from "@/features/archive/logic/dailyGate";
import { loadHistory } from "@/features/game/logic/history";
import { loadPersistedGame } from "@/features/game/logic/persistence";
import { useLocale } from "@/i18n/LocaleContext";
import { api } from "../../../convex/_generated/api";
import { AccountLine } from "./components/AccountLine";
import { AccountTitle } from "./components/AccountTitle";
import { DayDrawer } from "./components/DayDrawer";
import { EmptyStats } from "./components/EmptyStats";
import { InviteCard } from "./components/InviteCard";
import { LeaguesTeaser } from "./components/LeaguesTeaser";
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

/** Retour de Google annulé : la fenêtre du compte se rouvre au choix. */
const ACCOUNT_PARAM = "compte";

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
  footer,
}: {
  games: readonly PlayedGame[] | undefined;
  footer: ReactNode;
}) {
  const { t } = useLocale();
  const posthog = usePostHog();
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
        {footer}
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
  const openDay = (date: string) => {
    if (selectedDay === null) {
      posthog?.capture("stats_detail_opened", { detail: "day" });
    }
    setSelectedDay(date);
  };
  const openThemes = () => {
    posthog?.capture("stats_detail_opened", { detail: "themes" });
    setThemesOpen(true);
  };

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
            onOpen={lastPlayed ? () => openDay(lastPlayed) : undefined}
          >
            <RecentDaysChart
              recent={recent}
              selected={null}
              onSelect={openDay}
            />
          </StatsSection>
          <ThemeSummary themes={stats.themes} onOpen={openThemes} />
        </div>
      </div>
      {footer}
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
 * calculée sur le journal de l'appareil (« Sur cet appareil »), avec
 * l'invitation ; connecté, sur les parties du compte, avec le joueur en titre.
 */
export function StatsPage() {
  const { t, localizedPath } = useLocale();
  const posthog = usePostHog();
  const account = useAccount();
  const [params, setParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawer, setDrawer] = useState<"name" | "country" | "account" | null>(
    null,
  );
  const updateProfile = useMutation(api.account.updateProfile);
  const signedIn = account.status === "signedIn";
  const accountGames = useQuery(api.account.myGames, signedIn ? {} : "skip");
  // Relu à chaque passage sans compte : une déconnexion ramène au journal.
  // biome-ignore lint/correctness/useExhaustiveDependencies: le statut déclenche la relecture
  const deviceGames = useMemo(() => loadHistory(), [account.status]);
  const games =
    account.status === "loading"
      ? undefined
      : signedIn
        ? (accountGames ?? undefined)
        : deviceGames;
  const profile = account.profile;

  useEffect(() => {
    posthog?.capture("stats_page_viewed", { signed_in: signedIn });
  }, [posthog, signedIn]);

  // Google annulé : retour au choix, sans message.
  useEffect(() => {
    if (params.get(ACCOUNT_PARAM) === null) return;
    setDialogOpen(true);
    setParams(
      (current) => {
        current.delete(ACCOUNT_PARAM);
        return current;
      },
      { replace: true },
    );
  }, [params, setParams]);

  const openAccount = (source: "title_link" | "invite_card") => {
    posthog?.capture("account_dialog_opened", { source });
    setDialogOpen(true);
  };

  const footer =
    signedIn && profile ? (
      <div className="flex flex-col gap-8">
        <LeaguesTeaser />
        <AccountLine
          email={profile.email}
          onOpen={() => setDrawer("account")}
        />
      </div>
    ) : account.status === "anonymous" ? (
      <InviteCard onOpenAccount={() => openAccount("invite_card")} />
    ) : null;

  return (
    <div className="flex min-h-svh flex-col items-center bg-surface px-4 py-6">
      <div className="flex w-full max-w-2xl flex-1 flex-col gap-8 lg:max-w-5xl">
        <header className="flex flex-col gap-5">
          <BackLink to={localizedPath("/")} label={t("stats.backToGrid")} />
          {signedIn && profile?.pseudo ? (
            <AccountTitle
              pseudo={profile.pseudo}
              country={profile.country}
              onEditName={() => setDrawer("name")}
              onEditCountry={() => setDrawer("country")}
            />
          ) : (
            <DisplayHeader
              as="h1"
              size="lg"
              title={t("stats.title")}
              eyebrow={
                <span className="inline-flex flex-wrap items-center gap-x-1.5">
                  {t("stats.onThisDevice")}
                  {account.status === "anonymous" && (
                    <>
                      {" ·"}
                      <Button
                        type="button"
                        variant="ghost-label"
                        onClick={() => openAccount("title_link")}
                        className="text-brand hover:text-brand"
                      >
                        {t("stats.createAccountLink")}
                      </Button>
                    </>
                  )}
                </span>
              }
            />
          )}
        </header>
        <StatsBody games={games} footer={footer} />
      </div>
      <AppFooter className="mt-auto w-full shrink-0" />

      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      {signedIn && profile && (
        <>
          <NameDrawer
            open={drawer === "name"}
            current={profile.pseudo ?? ""}
            onClose={() => setDrawer(null)}
          />
          <CountryDrawer
            open={drawer === "country"}
            current={profile.country}
            onChoose={(country) => {
              void updateProfile({ country });
              setDrawer(null);
            }}
            onClose={() => setDrawer(null)}
          />
          <AccountDrawer
            open={drawer === "account"}
            email={profile.email}
            gamesCount={accountGames?.length ?? 0}
            onClose={() => setDrawer(null)}
          />
        </>
      )}
    </div>
  );
}
