import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { todayUTC } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { DayButton } from "react-day-picker";
import { difficultySolidDotClass } from "../logic/display";
import { dateToStr, strToCalendarDate } from "../logic/scheduling";
import { PanelHeader } from "./PanelHeader";

type ScheduledGrid = {
  date: string;
  difficulty: number;
};

type Props = {
  scheduledGrids: ScheduledGrid[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
};

export function ScheduleCalendar({
  scheduledGrids,
  selectedDate,
  onSelectDate,
}: Props) {
  const gridByDate = new Map(scheduledGrids.map((g) => [g.date, g]));
  const selected = selectedDate ? strToCalendarDate(selectedDate) : undefined;
  const today = strToCalendarDate(todayUTC());

  function handleSelect(date: Date | undefined) {
    if (!date) {
      onSelectDate(null);
      return;
    }
    const str = dateToStr(date);
    onSelectDate(str);
  }

  function ScheduleDayButton({
    children,
    day,
    modifiers,
    className,
    ...rest
  }: React.ComponentProps<typeof DayButton>) {
    const dateStr = dateToStr(day.date);
    const grid = gridByDate.get(dateStr);

    return (
      <CalendarDayButton
        day={day}
        modifiers={modifiers}
        className={className}
        {...rest}
      >
        {children}
        {grid && (
          <span
            aria-hidden="true"
            className={cn(
              "mx-auto block h-1 w-1 rounded-full !opacity-100",
              difficultySolidDotClass(grid.difficulty),
            )}
          />
        )}
      </CalendarDayButton>
    );
  }

  return (
    <div className="bg-surface-lowest rounded-xl p-4 shadow-editorial w-full h-full">
      <PanelHeader title="Calendrier de planification" />
      <Calendar
        mode="single"
        selected={selected}
        today={today}
        onSelect={handleSelect}
        components={{ DayButton: ScheduleDayButton }}
        className="w-full bg-transparent p-0"
        classNames={{
          today:
            "bg-surface-highest text-on-surface rounded-md data-[selected=true]:rounded-none",
        }}
      />
      <div className="flex gap-3 mt-3 pt-3 border-t border-outline-variant/15">
        {(
          [
            { label: "Facile", cls: difficultySolidDotClass(0) },
            { label: "Moyen", cls: difficultySolidDotClass(50) },
            { label: "Difficile", cls: difficultySolidDotClass(100) },
          ] as const
        ).map(({ label, cls }) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-[10px] text-on-surface-variant"
          >
            <span className={cn("h-2 w-2 rounded-full", cls)} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
