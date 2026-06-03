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

// Daily at 03:00 UTC — refill the pool if it falls below threshold.
crons.cron("auto refill pool", "0 3 * * *", internal.grids.autoRefillPool, {});

export default crons;
