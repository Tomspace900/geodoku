import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { todayUTC } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { DayButton } from "react-day-picker";
import type { CalendarMarker } from "../logic/analytics";
import { difficultyPillClass, popularityPillClass } from "../logic/display";
import { dateToStr, strToCalendarDate } from "../logic/scheduling";
import { PanelHeader } from "./PanelHeader";

const calendarMarkerBadgeClass =
  "mx-auto inline-flex min-w-0 shrink-0 items-center justify-center rounded-full px-1 text-[6px] font-medium leading-none tabular-nums opacity-100";

const legendBadgeClass =
  "inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 py-0.5 text-[10px] font-semibold leading-none tabular-nums";

function neutralMarkerBadgeClass(): string {
  return "bg-surface-low text-on-surface-variant";
}

function markerBadgeLook(marker: CalendarMarker): {
  label: string;
  pillClass: string;
} {
  if (marker.kind === "observed") {
    return {
      label:
        marker.winRate === null ? "—" : `${Math.round(marker.winRate * 100)}`,
      pillClass:
        marker.winRate === null
          ? neutralMarkerBadgeClass()
          : difficultyPillClass((1 - marker.winRate) * 100),
    };
  }

  if (marker.kind === "scheduled" || marker.kind === "predicted") {
    return {
      label: marker.popScore === null ? "—" : String(marker.popScore),
      pillClass:
        marker.kind === "predicted"
          ? "bg-brand/10 text-brand"
          : marker.popScore === null
            ? neutralMarkerBadgeClass()
            : popularityPillClass(marker.popScore),
    };
  }

  return { label: "!", pillClass: "bg-error/10 text-error" };
}

function MarkerBadge({ marker }: { marker: CalendarMarker }) {
  const { label, pillClass } = markerBadgeLook(marker);
  return (
    <span
      aria-hidden="true"
      className={cn(calendarMarkerBadgeClass, pillClass)}
    >
      {label}
    </span>
  );
}

function LegendBadge({
  children,
  pillClass,
}: {
  children: React.ReactNode;
  pillClass: string;
}) {
  return <span className={cn(legendBadgeClass, pillClass)}>{children}</span>;
}

type Props = {
  markers: Map<string, CalendarMarker>;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
};

export function GameCalendar({ markers, selectedDate, onSelectDate }: Props) {
  const selected = selectedDate ? strToCalendarDate(selectedDate) : undefined;
  const today = strToCalendarDate(todayUTC());

  function handleSelect(date: Date | undefined) {
    onSelectDate(date ? dateToStr(date) : null);
  }

  function GameDayButton({
    children,
    day,
    modifiers,
    className,
    ...rest
  }: React.ComponentProps<typeof DayButton>) {
    const marker = markers.get(dateToStr(day.date));

    return (
      <CalendarDayButton
        day={day}
        modifiers={modifiers}
        className={className}
        {...rest}
      >
        {children}
        {marker && <MarkerBadge marker={marker} />}
      </CalendarDayButton>
    );
  }

  return (
    <div className="bg-surface-lowest rounded-xl p-4 shadow-editorial w-full h-full">
      <PanelHeader title="Calendrier de jeu" />
      <Calendar
        mode="single"
        selected={selected}
        today={today}
        onSelect={handleSelect}
        components={{ DayButton: GameDayButton }}
        className="w-full bg-transparent p-0"
        classNames={{
          today:
            "bg-surface-highest text-on-surface rounded-md data-[selected=true]:rounded-none",
        }}
      />

      <div className="mt-3 space-y-1.5 border-t border-outline-variant/15 pt-3">
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-on-surface-variant/60">
          <span className="w-12 shrink-0 uppercase tracking-widest">passé</span>
          <LegendBadge pillClass="bg-success/15 text-success">72</LegendBadge>
          <LegendBadge pillClass="bg-warning/15 text-warning">45</LegendBadge>
          <LegendBadge pillClass="bg-error/15 text-error">18</LegendBadge>
          <span>% victoires</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-on-surface-variant/60">
          <span className="w-12 shrink-0 uppercase tracking-widest">futur</span>
          <LegendBadge pillClass="bg-success/15 text-success">78</LegendBadge>
          <LegendBadge pillClass="bg-warning/15 text-warning">52</LegendBadge>
          <LegendBadge pillClass="bg-error/15 text-error">24</LegendBadge>
          <span>facilité est.</span>
          <LegendBadge pillClass="bg-brand/10 text-brand">65</LegendBadge>
          <span>prédit</span>
          <LegendBadge pillClass="bg-error/10 text-error">!</LegendBadge>
          <span>manquant</span>
        </div>
      </div>
    </div>
  );
}
