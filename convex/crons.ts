import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every day at 12:00 UTC — ensure today's and tomorrow's grids exist (scheduler pool).
// 12h de marge avant le rollover UTC à 00:00 pour absorber un échec/retry.
crons.daily(
  "ensure tomorrow grid",
  { hourUTC: 12, minuteUTC: 0 },
  internal.grids.ensureTomorrowGrid,
  {},
);

// Every Sunday at 04:00 UTC — refill the pool if it falls below threshold
crons.weekly(
  "auto refill pool",
  { dayOfWeek: "sunday", hourUTC: 4, minuteUTC: 0 },
  internal.grids.autoRefillPool,
  {},
);

export default crons;
