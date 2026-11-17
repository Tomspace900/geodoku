import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Hourly on the hour — ensure today's and tomorrow's grids exist. Idempotent
// (early-return if already present), so this doubles as a self-heal with no
// extra cost. Pinned to :00 rather than an interval (whose minute depends on
// the deploy time): right after midnight UTC the new "tomorrow" has no grid
// yet, and `/health` answers 503 until this runs (#128).
crons.cron(
  "ensure grids",
  "0 * * * *",
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

// Hourly at :15, after "ensure grids" — email once per missing grid date
// (today or tomorrow) to ALERT_EMAIL_TO, set on prod only (#127, #128).
crons.cron(
  "missing grid alert",
  "15 * * * *",
  internal.alerts.checkMissingGrids,
  {},
);

// Daily at 03:30 UTC — the rate limiter component never deletes its rows.
crons.cron(
  "purge rate limits",
  "30 3 * * *",
  internal.health.purgeRateLimits,
  {},
);

// Weekly, Monday 04:00 UTC — accounts without a game for 3 years are erased
// (#155): same as a self-service deletion, their games stay, detached.
crons.cron(
  "purge inactive accounts",
  "0 4 * * 1",
  internal.account.purgeInactiveAccounts,
  { cursor: null },
);

// Weekly, Monday 04:30 UTC — player reports are erased one year after being
// handled, and three years after being sent at most (#127).
crons.cron("purge reports", "30 4 * * 1", internal.reports.purgeReports, {});

export default crons;
