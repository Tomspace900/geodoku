import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import {
  cleanReportMessage,
  REPORT_MESSAGE_MAX,
  REPORT_PAGE_PATTERN,
} from "../src/features/reports/logic/report";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { checkAdminToken } from "./adminToken";
import {
  assertCanonicalDate,
  assertClientId,
  assertReportId,
  requireGridForDate,
} from "./gameWriteValidation";
import { recordRateLimited } from "./health";
import { todayUTC } from "./lib/dates";
import { rateLimiter } from "./rateLimit";
import {
  type ReportTargetDoc,
  reportCategoryValidator,
  reportStatusValidator,
  reportTargetValidator,
} from "./reportValidators";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Effacé un an après « Traité » ou « Rejeté »… */
const HANDLED_RETENTION_MS = 365 * DAY_MS;
/** … et trois ans après l'envoi, quel que soit le statut. */
const MAX_RETENTION_MS = 3 * 365 * DAY_MS;
const PURGE_BATCH = 100;
/** Le compteur de l'admin s'arrête là (« 99+ »). */
const NEW_COUNT_CAP = 100;

const submitResult = v.union(
  v.literal("sent"),
  v.literal("duplicate"),
  v.literal("rate_limited"),
);

/**
 * La cible doit exister : une grille publiée à cette date (aujourd'hui ou
 * avant, jamais demain), une contrainte de cette grille, une page plausible.
 */
async function assertReportTarget(
  ctx: MutationCtx,
  target: ReportTargetDoc,
): Promise<void> {
  if (target.kind === "general") {
    if (!REPORT_PAGE_PATTERN.test(target.page)) {
      throw new ConvexError("Invalid page");
    }
    return;
  }
  assertCanonicalDate(target.date);
  if (target.date > todayUTC()) {
    throw new ConvexError("Date is in the future");
  }
  const grid = await requireGridForDate(ctx, target.date);
  if (
    target.kind === "constraint" &&
    ![...grid.rows, ...grid.cols].includes(target.constraintId)
  ) {
    throw new ConvexError("Unknown constraint");
  }
}

async function allowReport(
  ctx: MutationCtx,
  clientId: string,
): Promise<boolean> {
  const perClient = await rateLimiter.limit(ctx, "reportPerClient", {
    key: clientId,
  });
  const ok = perClient.ok && (await rateLimiter.limit(ctx, "reportGlobal")).ok;
  // Pas d'exception : elle annulerait aussi le compteur de surveillance.
  if (!ok) await recordRateLimited(ctx);
  return ok;
}

/**
 * Un signalement (#127), écrit tel quel et envoyé aussitôt par e-mail.
 * Idempotent par `reportId` : un renvoi rend `duplicate` sans rien écrire ni
 * consommer. Le `clientId` ne sert que de clé à la limite de débit et n'entre
 * jamais dans la ligne. Seule écriture permise en entraînement : elle ne
 * touche ni `games` ni `cellStats`.
 */
export const submit = mutation({
  args: {
    reportId: v.string(),
    clientId: v.string(),
    category: reportCategoryValidator,
    target: reportTargetValidator,
    message: v.string(),
    locale: v.union(v.literal("fr"), v.literal("en")),
  },
  returns: submitResult,
  handler: async (ctx, args) => {
    assertReportId(args.reportId);
    assertClientId(args.clientId);
    const message = cleanReportMessage(args.message);
    if (message.length === 0 || message.length > REPORT_MESSAGE_MAX) {
      throw new ConvexError("Invalid message");
    }
    await assertReportTarget(ctx, args.target);

    const existing = await ctx.db
      .query("reports")
      .withIndex("by_report_id", (q) => q.eq("reportId", args.reportId))
      .unique();
    if (existing) return "duplicate";
    if (!(await allowReport(ctx, args.clientId))) return "rate_limited";

    const id = await ctx.db.insert("reports", {
      reportId: args.reportId,
      category: args.category,
      target: args.target,
      message,
      locale: args.locale,
      status: "new",
    });
    await ctx.scheduler.runAfter(0, internal.alerts.sendReportEmail, { id });
    return "sent";
  },
});

const reportDoc = v.object({
  _id: v.id("reports"),
  _creationTime: v.number(),
  reportId: v.string(),
  category: reportCategoryValidator,
  target: reportTargetValidator,
  message: v.string(),
  locale: v.union(v.literal("fr"), v.literal("en")),
  status: reportStatusValidator,
  statusChangedAt: v.optional(v.number()),
});

/** Le signalement et, pour une cible de grille, ses contraintes. */
export const getForEmail = internalQuery({
  args: { id: v.id("reports") },
  returns: v.union(
    v.null(),
    v.object({
      report: reportDoc,
      rows: v.array(v.string()),
      cols: v.array(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const report = await ctx.db.get("reports", args.id);
    if (!report) return null;
    if (report.target.kind === "general") {
      return { report, rows: [], cols: [] };
    }
    const date = report.target.date;
    const grid = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.eq("date", date))
      .unique();
    return { report, rows: grid?.rows ?? [], cols: grid?.cols ?? [] };
  },
});

// ─── Admin ──────────────────────────────────────────────────────────────────

/** Les signalements, les plus récents d'abord, d'un statut ou de tous. */
export const listReports = query({
  args: {
    adminToken: v.string(),
    status: v.union(reportStatusValidator, v.null()),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(reportDoc),
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);
    const status = args.status;
    const ordered =
      status === null
        ? ctx.db.query("reports").order("desc")
        : ctx.db
            .query("reports")
            .withIndex("by_status", (q) => q.eq("status", status))
            .order("desc");
    return await ordered.paginate(args.paginationOpts);
  },
});

/** Nouveaux signalements, jusqu'à `NEW_COUNT_CAP`. */
export const countNewReports = query({
  args: { adminToken: v.string() },
  returns: v.object({ count: v.number(), capped: v.boolean() }),
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);
    const rows = await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "new"))
      .take(NEW_COUNT_CAP);
    return { count: rows.length, capped: rows.length === NEW_COUNT_CAP };
  },
});

/** « Traité », « Rejeté », ou de retour à « Nouveau ». */
export const setReportStatus = mutation({
  args: {
    adminToken: v.string(),
    id: v.id("reports"),
    status: reportStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);
    const report = await ctx.db.get("reports", args.id);
    if (!report) throw new ConvexError("Report not found");
    await ctx.db.patch("reports", args.id, {
      status: args.status,
      statusChangedAt: args.status === "new" ? undefined : Date.now(),
    });
    return null;
  },
});

// ─── Rétention ──────────────────────────────────────────────────────────────

async function deleteAll(
  ctx: MutationCtx,
  rows: Doc<"reports">[],
): Promise<number> {
  await Promise.all(rows.map((row) => ctx.db.delete("reports", row._id)));
  return rows.length;
}

/**
 * Le texte libre peut contenir n'importe quoi : un signalement traité ou
 * rejeté est effacé au bout d'un an, et tout signalement au bout de trois
 * ans. Par lots ; se relance tant qu'un lot est plein.
 */
export const purgeReports = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const handledBefore = now - HANDLED_RETENTION_MS;
    let deleted = 0;
    for (const status of ["resolved", "dismissed"] as const) {
      const rows = await ctx.db
        .query("reports")
        .withIndex("by_status_and_status_changed_at", (q) =>
          q.eq("status", status).lt("statusChangedAt", handledBefore),
        )
        .take(PURGE_BATCH);
      deleted += await deleteAll(ctx, rows);
    }
    const old = await ctx.db
      .query("reports")
      .withIndex("by_creation_time", (q) =>
        q.lt("_creationTime", now - MAX_RETENTION_MS),
      )
      .take(PURGE_BATCH);
    deleted += await deleteAll(ctx, old);
    if (deleted > 0) {
      await ctx.scheduler.runAfter(0, internal.reports.purgeReports, {});
    }
    return null;
  },
});
