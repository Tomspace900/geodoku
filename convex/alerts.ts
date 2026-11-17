import { v } from "convex/values";
import { CONSTRAINT_BY_ID } from "../src/features/game/logic/constraints";
import { cellPosition } from "../src/features/game/logic/gridTopology";
import { formatReportGridDate } from "../src/features/reports/logic/report";
import { translate } from "../src/i18n";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import {
  ALERT_EMAIL_FROM,
  type AlertEmail,
  buildMissingGridEmail,
  buildReportEmail,
  type ReportEmailInput,
} from "./lib/alertEmail";
import { todayUTC, tomorrowUTC } from "./lib/dates";
import { hasMailjetKeys, sendMailjetEmail } from "./lib/mailjet";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Une alerte de grille ne sert plus après quelques jours. */
const SENT_ALERT_RETENTION_MS = 30 * DAY_MS;
const SENT_ALERT_PURGE_BATCH = 50;

/**
 * Alertes par e-mail (#127, #128), vers `ALERT_EMAIL_TO`, posée sur la prod
 * seulement : sans elle, rien ne part (develop, où les e2e signalent, et les
 * déploiements de dev restent muets). Convex ne peut pas annoncer sa propre
 * panne : c'est l'alerte PostHog sur `server_health_hourly` qui la couvre.
 */
function alertRecipient(): string | null {
  const to = process.env.ALERT_EMAIL_TO?.trim();
  if (!to) return null;
  if (!hasMailjetKeys()) {
    console.error("[alerts] ALERT_EMAIL_TO posé sans clés Mailjet");
    return null;
  }
  return to;
}

function adminUrl(): string | null {
  const site = process.env.SITE_URL?.trim();
  return site ? `${site.replace(/\/$/, "")}/admin` : null;
}

async function sendAlert(to: string, email: AlertEmail): Promise<void> {
  await sendMailjetEmail({ from: ALERT_EMAIL_FROM, to, ...email });
}

/** Libellé français d'une contrainte (active ou archivée), sinon son id. */
function constraintLabel(id: string | undefined): string {
  if (!id) return "?";
  const constraint = CONSTRAINT_BY_ID.get(id as never);
  return constraint ? translate("fr", constraint.labelKey) : id;
}

/** Un signalement vient d'arriver (`reports.submit`) : il part tel quel. */
export const sendReportEmail = internalAction({
  args: { id: v.id("reports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const to = alertRecipient();
    if (!to) {
      console.log("[alerts] ALERT_EMAIL_TO absent, signalement non envoyé");
      return null;
    }
    const data = await ctx.runQuery(internal.reports.getForEmail, {
      id: args.id,
    });
    if (!data) return null;
    const { report, rows, cols } = data;
    const target = report.target;
    let emailTarget: ReportEmailInput["target"];
    if (target.kind === "general") {
      emailTarget = target;
    } else {
      const dateLabel = formatReportGridDate(target.date, "fr");
      if (target.kind === "cell") {
        const { row, col } = cellPosition(target.cellKey);
        emailTarget = {
          kind: "cell",
          rowLabel: constraintLabel(rows[row]),
          colLabel: constraintLabel(cols[col]),
          dateLabel,
          mode: target.mode,
        };
      } else {
        emailTarget = {
          kind: "constraint",
          constraintLabel: constraintLabel(target.constraintId),
          dateLabel,
          mode: target.mode,
        };
      }
    }
    await sendAlert(
      to,
      buildReportEmail({
        category: report.category,
        target: emailTarget,
        locale: report.locale,
        message: report.message,
        adminUrl: adminUrl(),
      }),
    );
    return null;
  },
});

const missingGridValidator = v.object({
  which: v.union(v.literal("today"), v.literal("tomorrow")),
  date: v.string(),
});

function missingGridKey(date: string): string {
  return `missing-grid:${date}`;
}

/** Grilles du jour et du lendemain absentes, et pas encore signalées. */
export const findMissingGrids = internalQuery({
  args: {},
  returns: v.array(missingGridValidator),
  handler: async (ctx) => {
    const days = [
      { which: "today" as const, date: todayUTC() },
      { which: "tomorrow" as const, date: tomorrowUTC() },
    ];
    const missing: (typeof missingGridValidator.type)[] = [];
    for (const day of days) {
      const grid = await ctx.db
        .query("grids")
        .withIndex("by_date", (q) => q.eq("date", day.date))
        .first();
      if (grid) continue;
      const alerted = await ctx.db
        .query("sentAlerts")
        .withIndex("by_key", (q) => q.eq("key", missingGridKey(day.date)))
        .first();
      if (!alerted) missing.push(day);
    }
    return missing;
  },
});

/** Retient une alerte envoyée, et oublie celles d'il y a plus d'un mois. */
export const recordAlertSent = internalMutation({
  args: { key: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("sentAlerts", { key: args.key });
    const stale = await ctx.db
      .query("sentAlerts")
      .withIndex("by_creation_time", (q) =>
        q.lt("_creationTime", Date.now() - SENT_ALERT_RETENTION_MS),
      )
      .take(SENT_ALERT_PURGE_BATCH);
    await Promise.all(stale.map((row) => ctx.db.delete("sentAlerts", row._id)));
    return null;
  },
});

/**
 * Cron horaire : une grille du jour ou du lendemain manque. Un seul e-mail
 * par date, retenu une fois parti : un envoi raté sera retenté l'heure
 * suivante, un envoi réussi ne se répète pas.
 */
export const checkMissingGrids = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const missing = await ctx.runQuery(internal.alerts.findMissingGrids, {});
    if (missing.length === 0) return null;
    const to = alertRecipient();
    if (!to) {
      console.log("[alerts] grille absente, ALERT_EMAIL_TO absent", missing);
      return null;
    }
    for (const day of missing) {
      await sendAlert(
        to,
        buildMissingGridEmail({
          which: day.which,
          dateLabel: formatReportGridDate(day.date, "fr"),
          adminUrl: adminUrl(),
        }),
      );
      await ctx.runMutation(internal.alerts.recordAlertSent, {
        key: missingGridKey(day.date),
      });
    }
    return null;
  },
});
