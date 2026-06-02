import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { todayUTC, tomorrowUTC } from "./lib/dates";

const http = httpRouter();

/**
 * Health check public (sans auth, zéro PII) : renvoie l'existence des grilles
 * du jour et du lendemain. À brancher sur un monitor externe (UptimeRobot,
 * BetterStack) pour alerter si une grille manque.
 *
 * 200 si les deux existent, 503 sinon (déclenche l'alerte du monitor).
 * URL : https://<deployment>.convex.site/health
 */
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const [today, tomorrow] = await Promise.all([
      ctx.runQuery(internal.gridData.hasGridForDate, { date: todayUTC() }),
      ctx.runQuery(internal.gridData.hasGridForDate, { date: tomorrowUTC() }),
    ]);
    const ok = today && tomorrow;
    return new Response(JSON.stringify({ today, tomorrow, ok }), {
      status: ok ? 200 : 503,
      headers: { "content-type": "application/json" },
    });
  }),
});

export default http;
