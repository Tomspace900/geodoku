import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Hourly — ensure today's and tomorrow's grids exist. Idempotent (early-return
// if already present), so this doubles as a self-heal with no extra cost.
crons.interval(
  "ensure grids",
  { hours: 1 },
  internal.scheduling.ensureDailyGrids,
  {},
);

// Daily at 03:00 UTC — replace the active pool if it falls below threshold,
// then immediately re-run today/tomorrow scheduling after activation.
crons.cron(
  "reconcile pool and schedule",
  "0 3 * * *",
  internal.grids.reconcilePoolAndSchedule,
  {},
);

// Hourly at :05 — `server_health_hourly` to PostHog for the hour just closed.
crons.cron(
  "server health hourly",
  "5 * * * *",
  internal.health.reportHourlyHealth,
  {},
);

// Daily at 03:30 UTC — the rate limiter component never deletes its rows.
crons.cron(
  "purge rate limits",
  "30 3 * * *",
  internal.health.purgeRateLimits,
  {},
);

export default crons;
