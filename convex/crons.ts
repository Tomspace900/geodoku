import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every day at 23:00 UTC — generate new grid candidates
crons.cron(
  "generate daily candidates",
  "0 23 * * *",
  internal.grids.generateDailyCandidates,
  {},
);

// Every day at 23:30 UTC — promote the oldest approved candidate to today's grid
crons.cron(
  "ensure today grid",
  "30 23 * * *",
  internal.grids.ensureTodayGrid,
  {},
);

export default crons;
