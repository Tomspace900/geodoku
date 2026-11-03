import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { internalAction, internalMutation } from "./_generated/server";
import { CELL_KEYS } from "./cellKeys";
import { readCellCounts } from "./cellStats";
import { todayUTC } from "./lib/dates";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** Les fenêtres du rate limiter durent au plus un jour : 2 jours de marge. */
const RATE_LIMIT_RETENTION_MS = 2 * DAY_MS;
const HEALTH_COUNTER_RETENTION_MS = 2 * DAY_MS;
const MAX_GAMES_PER_HOUR = 10_000;
const COUNTER_PURGE_BATCH = 64;

/** Heure UTC « YYYY-MM-DDTHH » d'un instant. */
function hourKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 13);
}

/**
 * Compte un refus du rate limiter dans l'heure courante. Appelé dans la
 * mutation refusée, qui doit donc rendre un refus plutôt que lever : une
 * exception annulerait ce compteur avec le reste.
 */
export async function recordRateLimited(ctx: MutationCtx): Promise<void> {
  const hour = hourKey(Date.now());
  const counter = await ctx.db
    .query("healthCounters")
    .withIndex("by_hour", (q) => q.eq("hour", hour))
    .unique();
  if (counter) {
    await ctx.db.patch(counter._id, { rateLimited: counter.rateLimited + 1 });
  } else {
    await ctx.db.insert("healthCounters", { hour, rateLimited: 1 });
  }
}

const healthSampleValidator = v.object({
  hour: v.string(),
  gamesCreated: v.number(),
  rateLimited: v.number(),
  maxCountryIncrease: v.number(),
});

/**
 * Chiffres de l'heure UTC écoulée : parties créées, refus du rate limiter, et
 * plus forte hausse d'un pays dans une case depuis le passage précédent (un
 * script qui gonfle un pays se voit là). Aucun identifiant. Garde au passage
 * la répartition du jour pour la comparaison suivante.
 */
export const takeHealthSample = internalMutation({
  args: {},
  returns: healthSampleValidator,
  handler: async (ctx) => {
    const now = Date.now();
    const hourStart = Math.floor(now / HOUR_MS) * HOUR_MS - HOUR_MS;
    const hour = hourKey(hourStart);

    const created = await ctx.db
      .query("games")
      .withIndex("by_creation_time", (q) =>
        q
          .gte("_creationTime", hourStart)
          .lt("_creationTime", hourStart + HOUR_MS),
      )
      .take(MAX_GAMES_PER_HOUR);
    const counter = await ctx.db
      .query("healthCounters")
      .withIndex("by_hour", (q) => q.eq("hour", hour))
      .unique();

    const today = todayUTC();
    const snapshot = await ctx.db
      .query("healthSnapshots")
      .withIndex("by_key", (q) => q.eq("key", "singleton"))
      .unique();
    const dates = [...new Set([snapshot?.date ?? today, today])];
    let maxCountryIncrease = 0;
    let todayCounts: Record<string, Record<string, number>> = {};
    for (const date of dates) {
      const current = await readCellCounts(ctx, date);
      if (date === today) todayCounts = current;
      const previous = snapshot?.date === date ? snapshot.counts : {};
      CELL_KEYS.forEach((cellKey) => {
        Object.entries(current[cellKey] ?? {}).forEach(([iso, n]) => {
          const increase = n - (previous[cellKey]?.[iso] ?? 0);
          maxCountryIncrease = Math.max(maxCountryIncrease, increase);
        });
      });
    }

    if (snapshot) {
      await ctx.db.patch(snapshot._id, { date: today, counts: todayCounts });
    } else {
      await ctx.db.insert("healthSnapshots", {
        key: "singleton",
        date: today,
        counts: todayCounts,
      });
    }

    const stale = await ctx.db
      .query("healthCounters")
      .withIndex("by_hour", (q) =>
        q.lt("hour", hourKey(now - HEALTH_COUNTER_RETENTION_MS)),
      )
      .take(COUNTER_PURGE_BATCH);
    await Promise.all(stale.map((row) => ctx.db.delete(row._id)));

    return {
      hour,
      gamesCreated: created.length,
      rateLimited: counter?.rateLimited ?? 0,
      maxCountryIncrease,
    };
  },
});

/**
 * Event serveur `server_health_hourly`, sans personne associée. Les seuils et
 * alertes se règlent dans PostHog. Sans `POSTHOG_PROJECT_TOKEN` (dev, preview
 * sans jeton), l'échantillon est pris mais rien ne part.
 */
export const reportHourlyHealth = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const sample = await ctx.runMutation(internal.health.takeHealthSample, {});
    const token = process.env.POSTHOG_PROJECT_TOKEN;
    const host = process.env.POSTHOG_HOST ?? "https://eu.i.posthog.com";
    if (!token) {
      console.log(
        "[health] POSTHOG_PROJECT_TOKEN absent, event non envoyé",
        sample,
      );
      return null;
    }
    const response = await fetch(`${host.replace(/\/$/, "")}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: token,
        event: "server_health_hourly",
        distinct_id: "geodoku-server",
        properties: {
          $process_person_profile: false,
          hour: sample.hour,
          games_created: sample.gamesCreated,
          rate_limited: sample.rateLimited,
          max_country_increase: sample.maxCountryIncrease,
        },
      }),
    });
    if (!response.ok) {
      console.error(`[health] PostHog a répondu ${response.status}`);
    }
    return null;
  },
});

/**
 * Le composant rate limiter n'efface jamais ses lignes : une par navigateur et
 * une par partie. On retire celles créées il y a plus de deux jours ; une clé
 * encore active repart au plein, ce qui ne coûte au pire que quelques coups.
 */
export const purgeRateLimits = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runMutation(components.rateLimiter.lib.clearAll, {
      before: Date.now() - RATE_LIMIT_RETENTION_MS,
    });
    return null;
  },
});
