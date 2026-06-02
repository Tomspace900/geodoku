import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// `crons.cron` plutôt que les helpers `daily`/`weekly` (cf. guidelines Convex).

// Daily at 03:00 UTC — ensure today's and tomorrow's grids exist (off-peak).
crons.cron("ensure grids", "0 3 * * *", internal.grids.ensureTomorrowGrid, {});

// Hourly self-heal — idempotent et cheap quand les grilles existent déjà
// (early-return). Rattrape automatiquement tout échec ponctuel sans
// intervention, et sert de vérification continue en contexte planifié.
crons.cron(
  "self-heal grids",
  "0 * * * *",
  internal.grids.ensureTomorrowGrid,
  {},
);

// Every Sunday at 04:00 UTC — refill the pool if it falls below threshold.
crons.cron("auto refill pool", "0 4 * * 0", internal.grids.autoRefillPool, {});

export default crons;
