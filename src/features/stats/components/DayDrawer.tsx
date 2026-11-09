import { ChevronLeft, ChevronRight } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { SheetDrawer } from "@/components/SheetDrawer";
import { Button } from "@/components/ui/button";
import { ScoreDisplay } from "@/features/game/components/ScoreDisplay";
import { formatGridDateLabel } from "@/features/game/logic/gridDateLabel";
import { getGridNumberForDate } from "@/features/game/logic/gridIssue";
import { isReplayableDate } from "@/features/game/logic/replayWindow";
import { useLocale } from "@/i18n/LocaleContext";
import type { DayResult, RecentDays } from "../logic/myStats";
import { formatStatsDate } from "../logic/statsDates";
import { FrozenGrid } from "./FrozenGrid";
import { RecentDaysChart } from "./RecentDaysChart";

/** Laisse le défilement se poser avant de lire le jour affiché. */
const SCROLL_SETTLE_MS = 140;

type SlideProps = {
  result: DayResult;
  today: string;
  replayAllowed: boolean;
  previous: string | null;
  next: string | null;
  onGo: (date: string) => void;
};

/**
 * Un jour : mémorisé, pour que le suivi du doigt (un rendu du tiroir chaque
 * fois que la barre violette change de jour) ne redessine pas les grilles.
 */
const DaySlide = memo(function DaySlide({
  result,
  today,
  replayAllowed,
  previous,
  next,
  onGo,
}: SlideProps) {
  const { t, locale, localizedPath } = useLocale();
  const gridNumber = getGridNumberForDate(result.date);
  const replayable = replayAllowed && isReplayableDate(result.date, today);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => previous && onGo(previous)}
          disabled={previous === null}
          aria-label={t("stats.previousDay")}
          className="-ml-2 size-8"
        >
          <ChevronLeft aria-hidden />
        </Button>
        <h3 className="flex-1 text-center font-serif text-lg font-medium leading-snug text-on-surface first-letter:uppercase">
          {formatGridDateLabel(result.date, locale).toLocaleLowerCase(locale)}
          {gridNumber !== null && (
            <span className="font-sans text-xs font-normal text-on-surface-variant">{` · #${gridNumber}`}</span>
          )}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => next && onGo(next)}
          disabled={next === null}
          aria-label={t("stats.nextDay")}
          className="-mr-2 size-8"
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
        {result.finished ? (
          <div className="flex shrink-0 justify-center">
            {/* Figé : glisser d'un jour à l'autre ne relance ni comptage ni rebond. */}
            <ScoreDisplay breakdown={result.breakdown} still />
          </div>
        ) : (
          <p className="text-center text-xs text-on-surface-variant">
            {t("stats.unfinished")}
          </p>
        )}
        <div className="min-w-0 flex-1 sm:max-w-[420px]">
          <FrozenGrid
            result={result}
            ariaLabel={t("stats.dayGridAriaLabel", {
              date: formatStatsDate(result.date, locale, "long"),
            })}
          />
        </div>
      </div>
      {replayable && (
        <Link
          to={localizedPath(`/archive/${result.date}`)}
          className="mx-auto rounded-sm text-xs font-medium text-brand hover:text-brand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-surface/20"
        >
          {t("stats.replay")}
        </Link>
      )}
    </div>
  );
});

type Props = {
  open: boolean;
  recent: RecentDays;
  results: ReadonlyMap<string, DayResult>;
  selected: string | null;
  onSelect: (date: string) => void;
  onClose: () => void;
  today: string;
  /** La partie du jour est finie : l'entraînement est ouvert (garde de l'archive). */
  replayAllowed: boolean;
};

/**
 * Le détail d'un jour, en tiroir : les 30 barres en tête (la violette suit le
 * jour affiché), puis le jour, qu'on glisse d'une partie à l'autre. Les jours
 * non joués sont sautés.
 */
export function DayDrawer({
  open,
  recent,
  results,
  selected,
  onSelect,
  onClose,
  today,
  replayAllowed,
}: Props) {
  const { t } = useLocale();
  // Le tiroir monte son contenu après l'ouverture : la piste arrive en état,
  // pas dans une ref lue trop tôt.
  const [track, setTrack] = useState<HTMLDivElement | null>(null);
  const settleRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const instantRef = useRef(true);
  // Un glissement lancé par le tiroir (tap sur une barre, chevron, ouverture) :
  // la barre violette est déjà sur le jour visé, le défilement ne la déplace pas.
  const steeringRef = useRef(false);
  // Le jour sous le doigt, lu à chaque image : la barre violette le suit
  // pendant le glissement, `onSelect` n'arrive qu'au repos. Il ne vaut que
  // pour le jour choisi d'où il est parti (`from`) : un tap sur une barre
  // reprend la main dès le rendu qui suit.
  const [live, setLive] = useState<{
    at: number;
    from: string | null;
  } | null>(null);
  const dates = recent.days
    .filter((day) => day.kind !== "none" && results.has(day.date))
    .map((day) => day.date);
  const index = selected ? Math.max(0, dates.indexOf(selected)) : 0;
  const shown = live && live.from === selected ? live.at : index;

  // Un tap sur une barre fait glisser jusqu'au jour tapé ; à l'ouverture, le
  // jour s'affiche sans glissement.
  useEffect(() => {
    if (!open || !track) {
      instantRef.current = true;
      setLive(null);
      return;
    }
    const left = index * track.clientWidth;
    if (Math.abs(track.scrollLeft - left) < 2) return;
    steeringRef.current = true;
    track.scrollTo({
      left,
      behavior: instantRef.current ? "instant" : "smooth",
    });
    instantRef.current = false;
  }, [index, open, track]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (settleRef.current !== null) window.clearTimeout(settleRef.current);
    },
    [],
  );

  // Le doigt reprend la main sur un glissement lancé par le tiroir.
  function release() {
    steeringRef.current = false;
  }

  function handleScroll() {
    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        if (!track || track.clientWidth === 0) return;
        const at = Math.round(track.scrollLeft / track.clientWidth);
        if (steeringRef.current) {
          if (Math.abs(track.scrollLeft - index * track.clientWidth) < 2) {
            steeringRef.current = false;
          }
          return;
        }
        setLive((previous) =>
          previous?.at === at && previous.from === selected
            ? previous
            : { at, from: selected },
        );
      });
    }
    if (settleRef.current !== null) window.clearTimeout(settleRef.current);
    settleRef.current = window.setTimeout(() => {
      // Le tiroir conduit déjà vers le jour choisi : un défilement lent (onglet
      // en arrière-plan, téléphone chargé) ne doit pas le ramener en route.
      if (steeringRef.current || !track || track.clientWidth === 0) return;
      const next = dates[Math.round(track.scrollLeft / track.clientWidth)];
      if (next && next !== selected) onSelect(next);
    }, SCROLL_SETTLE_MS);
  }

  return (
    <SheetDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t("stats.recent")}
      hideTitle
      closeLabel={t("stats.closeDrawer")}
      width="lg"
    >
      <div className="flex flex-col gap-5 pt-2">
        <RecentDaysChart
          recent={recent}
          selected={dates[shown] ?? selected}
          onSelect={onSelect}
          height={64}
        />
        <div
          ref={setTrack}
          onScroll={handleScroll}
          onPointerDown={release}
          onTouchStart={release}
          onWheel={release}
          className="-mx-5 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {dates.map((date, i) => {
            const result = results.get(date);
            // Montés : les voisins du jour choisi et de celui sous le doigt.
            const near = Math.abs(i - index) <= 1 || Math.abs(i - shown) <= 1;
            return (
              <section
                key={date}
                // Les jours voisins sont montés pour glisser, pas pour le
                // clavier ni les lecteurs d'écran (`inert`, absent des types
                // de React 18).
                {...(i === shown ? {} : { inert: "" })}
                className="w-full shrink-0 snap-start px-5"
              >
                {result && near && (
                  <DaySlide
                    result={result}
                    today={today}
                    replayAllowed={replayAllowed}
                    previous={dates[i - 1] ?? null}
                    next={dates[i + 1] ?? null}
                    onGo={onSelect}
                  />
                )}
              </section>
            );
          })}
        </div>
      </div>
    </SheetDrawer>
  );
}
