import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// TODO: Les crons Convex sont en UTC. 23:00 UTC = ~01:00 en France l’été (ou minuit hiver),
// donc trop tard pour un “jour calendaire” côté EU — prévoir un offset ou un horaire
// ancré sur un fuseau (ex. 22:00 Europe/Paris) quand on voudra l’aligner sur les joueurs.

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
