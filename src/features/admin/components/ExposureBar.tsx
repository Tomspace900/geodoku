import { cn } from "@/lib/utils";

type Props = {
  label: string;
  pastCount: number;
  upcomingCount: number;
  pastPct: number;
  upcomingPct: number;
  pastHighlighted: boolean;
};

export function ExposureBar({
  label,
  pastCount,
  upcomingCount,
  pastPct,
  upcomingPct,
  pastHighlighted,
}: Props) {
  return (
    <li className="flex items-center gap-2 min-w-0">
      <span className="w-28 shrink-0 truncate text-[10px] text-on-surface">
        {label}
      </span>
      <div className="flex flex-1 items-center gap-1">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-highest">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 rounded-full bg-on-surface-variant/50 transition-all"
            style={{ width: `${pastPct}%` }}
          />
        </div>
        <span
          className={cn(
            "w-5 shrink-0 text-right text-[10px] tabular-nums",
            pastHighlighted
              ? "font-semibold text-warning"
              : "text-on-surface-variant",
          )}
        >
          {pastCount}
        </span>
      </div>
      <div className="flex flex-1 items-center gap-1">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-highest">
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all",
              upcomingPct > 0 && "bg-brand/60",
            )}
            style={{ width: `${upcomingPct}%` }}
          />
        </div>
        <span className="w-5 shrink-0 text-right text-[10px] tabular-nums text-on-surface-variant">
          {upcomingCount}
        </span>
      </div>
    </li>
  );
}
