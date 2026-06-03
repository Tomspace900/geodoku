import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { todayUTC } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { DayButton } from "react-day-picker";
import { type CalendarMarker, winRateDotClass } from "../logic/analytics";
import { difficultySolidDotClass } from "../logic/display";
import { dateToStr, strToCalendarDate } from "../logic/scheduling";
import { PanelHeader } from "./PanelHeader";

type Props = {
  markers: Map<string, CalendarMarker>;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
};

function MarkerIndicator({ marker }: { marker: CalendarMarker }) {
  const dotClass =
    marker.kind === "predicted"
      ? "bg-brand"
      : marker.kind === "observed"
        ? winRateDotClass(marker.winRate)
        : marker.kind === "estimated"
          ? difficultySolidDotClass(marker.difficulty)
          : "bg-error"; // missing

  return (
    <span
      aria-hidden="true"
      className={cn(
        "mx-auto block h-1 w-1 rounded-full !opacity-100",
        dotClass,
      )}
    />
  );
}

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
        {marker && <MarkerIndicator marker={marker} />}
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
        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant/60">
          <span className="w-12 shrink-0 uppercase tracking-widest">passé</span>
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
          <span className="h-1.5 w-1.5 rounded-full bg-error" />
          <span>win rate observé</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant/60">
          <span className="w-12 shrink-0 uppercase tracking-widest">futur</span>
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
          <span className="h-1.5 w-1.5 rounded-full bg-error" />
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          <span>difficulté estimée · prédite</span>
        </div>
      </div>
    </div>
  );
}
