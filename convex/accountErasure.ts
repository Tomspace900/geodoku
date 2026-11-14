import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";

/**
 * Ce qu'un compte laisse dans nos tables quand il disparaît (#155) : le
 * profil est effacé, les parties sont détachées par lots (`detachGames`).
 * Commun à la suppression en libre-service (déclencheur de Better Auth) et à
 * l'effacement après 3 ans sans partie.
 */
export async function forgetAccount(
  ctx: MutationCtx,
  userId: string,
): Promise<void> {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .unique();
  if (profile) await ctx.db.delete(profile._id);
  await ctx.scheduler.runAfter(0, internal.account.detachGames, { userId });
}
