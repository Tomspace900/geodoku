import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function QueueStats() {
  const stats = useQuery(api.grids.getQueueStats);

  if (!stats) {
    return (
      <div className="bg-surface-low rounded-xl p-4 text-sm text-on-surface-variant">
        Chargement des stats…
      </div>
    );
  }

  const runwayClass =
    stats.daysOfRunway > 7
      ? "bg-green-500/15 text-green-800"
      : stats.daysOfRunway >= 3
        ? "bg-orange-400/15 text-orange-800"
        : "bg-red-500/15 text-red-800";

  return (
    <div className="bg-surface-low rounded-xl p-4">
      <p className="text-[10px] font-semibold text-on-surface-variant tracking-widest uppercase mb-3">
        État de la queue
      </p>
      <div className="flex flex-wrap gap-2">
        {[
          `${stats.pending} en attente`,
          `${stats.approvedQueued} approuvés (queue)`,
          `${stats.scheduledFuture} programmés`,
        ].map((label) => (
          <span
            key={label}
            className="text-xs font-medium bg-surface-highest text-on-surface rounded-full px-3 py-1"
          >
            {label}
          </span>
        ))}
        <span
          className={cn(
            "text-xs font-semibold rounded-full px-3 py-1",
            runwayClass,
          )}
        >
          {stats.daysOfRunway} jour{stats.daysOfRunway !== 1 ? "s" : ""} de
          contenu
        </span>
      </div>
    </div>
  );
}
