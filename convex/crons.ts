import { cronJobs } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const RECEIPT_DELETE_BATCH_SIZE = 512;

/** Purge batchée ; se reprogramme jusqu'à avoir vidé tout le retard. */
export const deleteExpiredOperationReceipts = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx): Promise<number> => {
    const expired = await ctx.db
      .query("operationReceipts")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", Date.now()))
      .take(RECEIPT_DELETE_BATCH_SIZE);
    await Promise.all(expired.map((receipt) => ctx.db.delete(receipt._id)));
    if (expired.length === RECEIPT_DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        internal.crons.deleteExpiredOperationReceipts,
        {},
      );
    }
    return expired.length;
  },
});

const crons = cronJobs();

// Hourly — ensure today's and tomorrow's grids exist. Idempotent (early-return
// if already present), so this doubles as a self-heal with no extra cost.
crons.interval(
  "ensure grids",
  { hours: 1 },
  internal.scheduling.ensureDailyGrids,
  {},
);

// Daily at 03:00 UTC — replace the active pool if it falls below threshold,
// then immediately re-run today/tomorrow scheduling after activation.
crons.cron(
  "reconcile pool and schedule",
  "0 3 * * *",
  internal.grids.reconcilePoolAndSchedule,
  {},
);

// Daily at 03:30 UTC — operation receipts expire seven days after creation.
crons.cron(
  "delete expired operation receipts",
  "30 3 * * *",
  internal.crons.deleteExpiredOperationReceipts,
  {},
);

export default crons;
