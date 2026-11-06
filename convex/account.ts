import { ConvexError, v } from "convex/values";
import { COUNTRY_CODES } from "../content/countries/countryCodes";
import {
  type AccountEntry,
  sanitizeAccountEntry,
} from "../src/features/account/logic/accountEntry";
import {
  checkPseudo,
  drawPseudo,
  type PseudoLocale,
} from "../src/features/account/logic/pseudo";
import { components, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { CELL_KEYS } from "./cellKeys";
import { findAccountGame, hashToken } from "./games";
import { getGridAnswers } from "./gridData";
import { recordRateLimited } from "./health";
import { todayUTC } from "./lib/dates";
import { rateLimiter } from "./rateLimit";

/**
 * Le compte facultatif (#155). Ces fonctions lisent l'identité : elles sont
 * propres à un joueur, jamais partagées en cache. Les queries publiques du
 * jeu, elles, ne la lisent jamais (AGENTS.md §6).
 */

/** Plafond de lecture des parties d'un compte : une par jour, 13 ans. */
const MAX_ACCOUNT_GAMES = 5000;
/** Entrées du journal par appel de rattachement ; le client découpe. */
export const MAX_SYNC_ENTRIES = 60;
/** Tirages tentés pour trouver un nom que personne n'a. */
const PSEUDO_DRAW_ATTEMPTS = 12;
/** Parties détachées par transaction à la suppression d'un compte. */
const DETACH_BATCH_SIZE = 200;

const COUNTRY_SET = new Set<string>(COUNTRY_CODES);

const localeValidator = v.union(v.literal("fr"), v.literal("en"));

const accountGameValidator = v.object({
  date: v.string(),
  cells: v.array(v.union(v.string(), v.null())),
  failed: v.array(v.number()),
});

type AuthUser = NonNullable<
  Awaited<ReturnType<typeof authComponent.safeGetAuthUser>>
>;

async function requireUser(ctx: QueryCtx | MutationCtx): Promise<AuthUser> {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new ConvexError("Unauthenticated");
  return user;
}

async function requireWriteBudget(
  ctx: MutationCtx,
  userId: string,
): Promise<void> {
  const { ok } = await rateLimiter.limit(ctx, "accountWrite", { key: userId });
  if (!ok) {
    await recordRateLimited(ctx);
    throw new ConvexError("rate_limited");
  }
}

async function findProfile(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<Doc<"profiles"> | null> {
  return await ctx.db
    .query("profiles")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .unique();
}

async function isPseudoTaken(
  ctx: QueryCtx | MutationCtx,
  pseudo: string,
): Promise<boolean> {
  const holder = await ctx.db
    .query("profiles")
    .withIndex("by_pseudo", (q) => q.eq("pseudo", pseudo))
    .first();
  return holder !== null;
}

/**
 * Le dé ne tire que des noms que personne n'a ; un nom écrit à la main, lui,
 * n'est pas unique. Si tous les tirages sont pris (2 500 noms par langue),
 * le dernier sert quand même.
 */
async function drawFreePseudo(
  ctx: MutationCtx,
  locale: PseudoLocale,
  avoid?: string,
): Promise<string> {
  let candidate = drawPseudo(locale);
  for (let attempt = 0; attempt < PSEUDO_DRAW_ATTEMPTS; attempt++) {
    if (candidate !== avoid && !(await isPseudoTaken(ctx, candidate))) {
      return candidate;
    }
    candidate = drawPseudo(locale);
  }
  return candidate;
}

// ─── Lectures ────────────────────────────────────────────────────────────────

/** Le compte connecté : e-mail, nom et pays. `null` sans session. */
export const me = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      email: v.string(),
      pseudo: v.union(v.string(), v.null()),
      country: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    const profile = await findProfile(ctx, user._id);
    return {
      email: user.email,
      pseudo: profile?.pseudo ?? null,
      country: profile?.country ?? null,
    };
  },
});

/** Les parties du compte, pour « Mes stats ». `null` sans session. */
export const myGames = query({
  args: {},
  returns: v.union(v.null(), v.array(accountGameValidator)),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    const games = await ctx.db
      .query("games")
      .withIndex("by_owner_user_id_and_date", (q) =>
        q.eq("owner.userId", user._id),
      )
      .take(MAX_ACCOUNT_GAMES);
    return games.map(({ date, cells, failed }) => ({ date, cells, failed }));
  },
});

/**
 * La partie du compte pour une date : le serveur fait foi pour la partie du
 * jour, partagée par tous les appareils du joueur. `null` sans partie.
 */
export const myGameForDate = query({
  args: { date: v.string() },
  returns: v.union(v.null(), accountGameValidator),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    const game = await findAccountGame(ctx, user._id, args.date);
    return game
      ? { date: game.date, cells: game.cells, failed: game.failed }
      : null;
  },
});

// ─── Rattachement à la connexion ─────────────────────────────────────────────

async function ensureProfile(
  ctx: MutationCtx,
  user: AuthUser,
  locale: PseudoLocale,
): Promise<boolean> {
  if (await findProfile(ctx, user._id)) return false;
  const pseudo = await drawFreePseudo(ctx, locale);
  await ctx.db.insert("profiles", { userId: user._id, pseudo });
  // Le `name` de Better Auth reçoit le nom tiré, jamais celui de Google ; il
  // n'est plus jamais lu ensuite.
  await ctx.runMutation(components.betterAuth.adapter.updateOne, {
    input: {
      model: "user",
      where: [{ field: "_id", value: user._id }],
      update: { name: pseudo },
    },
  });
  return true;
}

/** Une entrée importée n'est gardée que si ses pays valent pour leurs cases. */
async function matchesGrid(
  ctx: MutationCtx,
  entry: AccountEntry,
): Promise<boolean> {
  const grid = await ctx.db
    .query("grids")
    .withIndex("by_date", (q) => q.eq("date", entry.date))
    .unique();
  if (!grid) return false;
  const answers = await getGridAnswers(ctx, grid);
  if (!answers) return false;
  return entry.cells.every(
    (code, index) =>
      code === null || (answers[CELL_KEYS[index]] ?? []).includes(code),
  );
}

/**
 * À la connexion, le serveur l'emporte (#155) :
 * - une partie anonyme dont le jeton est dans le journal passe au compte, si
 *   le compte n'a rien ce jour-là ; sinon elle reste anonyme ;
 * - une entrée passée sans ligne serveur est importée (`origin: import`) ;
 * - la partie locale du jour sans ligne serveur reste locale.
 * Crée le profil au premier passage : `isNew` ouvre la bienvenue.
 */
export const syncAccount = mutation({
  args: {
    entries: v.array(
      v.object({
        date: v.string(),
        cells: v.array(v.union(v.string(), v.null())),
        failed: v.array(v.number()),
        token: v.optional(v.string()),
      }),
    ),
    locale: localeValidator,
  },
  returns: v.object({ isNew: v.boolean(), attached: v.number() }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.entries.length > MAX_SYNC_ENTRIES) {
      throw new ConvexError("Too many entries");
    }
    await requireWriteBudget(ctx, user._id);
    const isNew = await ensureProfile(ctx, user, args.locale);
    const owner = { kind: "user" as const, userId: user._id };
    const today = todayUTC();
    let attached = 0;

    for (const raw of args.entries) {
      const entry = sanitizeAccountEntry(raw, today);
      if (!entry) continue;
      if (await findAccountGame(ctx, user._id, entry.date)) continue;
      if (entry.token) {
        const tokenHash = await hashToken(entry.token);
        const anonymous = await ctx.db
          .query("games")
          .withIndex("by_owner_token_hash", (q) =>
            q.eq("owner.tokenHash", tokenHash),
          )
          .unique();
        if (anonymous) {
          if (
            anonymous.owner.kind === "anon" &&
            anonymous.date === entry.date
          ) {
            await ctx.db.patch(anonymous._id, { owner });
            attached++;
          }
          continue;
        }
      }
      // La partie du jour sans ligne serveur reste locale : elle n'a jamais
      // compté dans la répartition, on ne l'y ferait pas entrer à moitié.
      if (entry.date >= today) continue;
      if (!(await matchesGrid(ctx, entry))) continue;
      await ctx.db.insert("games", {
        date: entry.date,
        owner,
        cells: entry.cells,
        failed: entry.failed,
        origin: "import",
      });
      attached++;
    }
    return { isNew, attached };
  },
});

// ─── Profil ──────────────────────────────────────────────────────────────────

/** Le dé : un nom que personne n'a, différent de celui affiché. */
export const drawPseudoFor = mutation({
  args: { locale: localeValidator, current: v.optional(v.string()) },
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireWriteBudget(ctx, user._id);
    return await drawFreePseudo(ctx, args.locale, args.current);
  },
});

const pseudoRefusal = v.union(
  v.literal("too_short"),
  v.literal("too_long"),
  v.literal("invalid"),
  v.literal("refused"),
);

/** « Mon nom », « Mon pays » et la bienvenue : rien n'est écrit avant. */
export const updateProfile = mutation({
  args: {
    pseudo: v.optional(v.string()),
    country: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.union(
    v.object({ ok: v.literal(true) }),
    v.object({ ok: v.literal(false), reason: pseudoRefusal }),
  ),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireWriteBudget(ctx, user._id);
    const profile = await findProfile(ctx, user._id);
    if (!profile) throw new ConvexError("Profile not found");
    const patch: { pseudo?: string; country?: string | undefined } = {};
    if (args.pseudo !== undefined) {
      const verdict = checkPseudo(args.pseudo);
      if (!verdict.ok) return { ok: false as const, reason: verdict.reason };
      patch.pseudo = verdict.pseudo;
    }
    if (args.country !== undefined) {
      if (args.country !== null && !COUNTRY_SET.has(args.country)) {
        throw new ConvexError("Unknown country");
      }
      patch.country = args.country ?? undefined;
    }
    await ctx.db.patch(profile._id, patch);
    return { ok: true as const };
  },
});

// ─── Suppression ─────────────────────────────────────────────────────────────

function randomTokenHash(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * Supprimer un compte détache ses parties (#155) : chacune reçoit une
 * empreinte tirée au hasard, que personne ne détient, comme un anonyme qui a
 * perdu son jeton. Les chiffres passés restent stables. Par lots, appelée par
 * le déclencheur de suppression de Better Auth (`auth.ts`).
 */
export const detachGames = internalMutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const games = await ctx.db
      .query("games")
      .withIndex("by_owner_user_id_and_date", (q) =>
        q.eq("owner.userId", args.userId),
      )
      .take(DETACH_BATCH_SIZE);
    for (const game of games) {
      await ctx.db.patch(game._id, {
        owner: { kind: "anon", tokenHash: randomTokenHash() },
      });
    }
    if (games.length === DETACH_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.account.detachGames, args);
    }
    return null;
  },
});
