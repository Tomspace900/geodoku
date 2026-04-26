import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every day at 23:30 UTC — assign tomorrow's grid from the pool
crons.daily(
  "ensure tomorrow grid",
  { hourUTC: 23, minuteUTC: 30 },
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
