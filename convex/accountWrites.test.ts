// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import betterAuthTest from "@convex-dev/better-auth/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, components, internal } from "./_generated/api";
import { daysAgoUTC, todayUTC } from "./lib/dates";
import schema from "./schema";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./**/__tests__/**",
]);
const CLIENT_ID = "client-12345678";
const EMPTY_FAILED = [0, 0, 0, 0, 0, 0, 0, 0, 0];

function token(sequence: number): string {
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
}

function createBackend() {
  const backend = convexTest(schema, modules);
  rateLimiterTest.register(backend);
  betterAuthTest.register(backend);
  return backend;
}

type Backend = ReturnType<typeof createBackend>;

const ANSWERS: Record<string, string[]> = {
  "0,0": ["FRA", "DEU"],
  "0,1": ["ITA"],
  "0,2": ["ESP"],
  "1,0": ["PRT"],
  "1,1": ["BEL"],
  "1,2": ["NLD"],
  "2,0": ["AUT"],
  "2,1": ["CHE"],
  "2,2": ["POL"],
};

async function seedGrid(backend: Backend, date = todayUTC()): Promise<void> {
  await backend.run(async (ctx) => {
    const candidateId = await ctx.db.insert("gridCandidates", {
      rows: ["row-0", "row-1", "row-2"],
      cols: ["col-0", "col-1", "col-2"],
      metadata: {
        seedConstraint: "row-0",
        constraintIds: ["row-0"],
        categories: ["continent"],
        avgCellSize: 2,
        minCellSize: 1,
        countryPool: Object.values(ANSWERS).flat(),
      },
      status: "used",
    });
    await ctx.db.insert("gridAnswers", { candidateId, validAnswers: ANSWERS });
    await ctx.db.insert("grids", {
      date,
      rows: ["row-0", "row-1", "row-2"],
      cols: ["col-0", "col-1", "col-2"],
      countryPool: Object.values(ANSWERS).flat(),
      candidateId,
    });
  });
}

/** Un compte Better Auth et sa session, comme après une connexion par code. */
async function signIn(backend: Backend, email = "camille@exemple.fr") {
  const { userId, sessionId } = await backend.run(async (ctx) => {
    const now = Date.now();
    const user = (await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          name: "",
          email,
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        },
      },
    })) as { _id: string };
    const session = (await ctx.runMutation(
      components.betterAuth.adapter.create,
      {
        input: {
          model: "session",
          data: {
            token: `session-${email}`,
            userId: user._id,
            expiresAt: now + 86_400_000,
            createdAt: now,
            updatedAt: now,
          },
        },
      },
    )) as { _id: string };
    return { userId: user._id, sessionId: session._id };
  });
  return {
    userId,
    as: backend.withIdentity({ subject: userId, sessionId }),
  };
}

function entry(
  date: string,
  cells: (string | null)[],
  extra: { token?: string; failed?: number[] } = {},
) {
  return { date, cells, failed: extra.failed ?? EMPTY_FAILED, ...extra };
}

const NINE_NULLS = [null, null, null, null, null, null, null, null, null];

function cellsWith(index: number, code: string): (string | null)[] {
  const cells: (string | null)[] = [...NINE_NULLS];
  cells[index] = code;
  return cells;
}

async function gamesOf(backend: Backend) {
  return await backend.run(async (ctx) => await ctx.db.query("games").take(50));
}

describe("syncAccount", () => {
  it("crée le profil au premier passage et annonce un nouveau compte", async () => {
    const backend = createBackend();
    const { as } = await signIn(backend);
    const result = await as.mutation(api.account.syncAccount, {
      entries: [],
      locale: "fr",
    });
    const me = await as.query(api.account.me, {});
    expect([result.isNew, typeof me?.pseudo]).toEqual([true, "string"]);
  });

  it("ne rejoue pas la bienvenue d'un compte existant", async () => {
    const backend = createBackend();
    const { as } = await signIn(backend);
    await as.mutation(api.account.syncAccount, { entries: [], locale: "fr" });
    const again = await as.mutation(api.account.syncAccount, {
      entries: [],
      locale: "fr",
    });
    expect(again.isNew).toBe(false);
  });

  it("donne au nom de Better Auth le nom tiré, jamais celui de Google", async () => {
    const backend = createBackend();
    const { as, userId } = await signIn(backend);
    await as.mutation(api.account.syncAccount, { entries: [], locale: "en" });
    const me = await as.query(api.account.me, {});
    const user = (await backend.run(
      async (ctx) =>
        await ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [{ field: "_id", value: userId }],
        }),
    )) as { name: string };
    expect(user.name).toBe(me?.pseudo);
  });

  it("rattache une partie anonyme par son jeton", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    await backend.mutation(api.games.playMove, {
      date: todayUTC(),
      token: token(1),
      clientId: CLIENT_ID,
      moveIndex: 0,
      cellKey: "0,0",
      countryCode: "FRA",
    });
    const { as, userId } = await signIn(backend);
    const result = await as.mutation(api.account.syncAccount, {
      entries: [entry(todayUTC(), cellsWith(0, "FRA"), { token: token(1) })],
      locale: "fr",
    });
    const [game] = await gamesOf(backend);
    expect([result.attached, game.owner]).toEqual([
      1,
      { kind: "user", userId },
    ]);
  });

  it("laisse anonyme la partie d'un jour où le compte a déjà joué", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    const { as } = await signIn(backend);
    await as.mutation(api.games.playAccountMove, {
      date: todayUTC(),
      moveIndex: 0,
      cellKey: "0,1",
      countryCode: "ITA",
    });
    await backend.mutation(api.games.playMove, {
      date: todayUTC(),
      token: token(2),
      clientId: CLIENT_ID,
      moveIndex: 0,
      cellKey: "0,0",
      countryCode: "FRA",
    });
    await as.mutation(api.account.syncAccount, {
      entries: [entry(todayUTC(), cellsWith(0, "FRA"), { token: token(2) })],
      locale: "fr",
    });
    const kinds = (await gamesOf(backend)).map((game) => game.owner.kind);
    expect(kinds.sort()).toEqual(["anon", "user"]);
  });

  it("importe une entrée passée sans ligne serveur", async () => {
    const backend = createBackend();
    const date = daysAgoUTC(3);
    await seedGrid(backend, date);
    const { as } = await signIn(backend);
    const result = await as.mutation(api.account.syncAccount, {
      entries: [entry(date, cellsWith(0, "DEU"))],
      locale: "fr",
    });
    const [game] = await gamesOf(backend);
    expect([result.attached, game.origin]).toEqual([1, "import"]);
  });

  it("n'importe pas une entrée dont un pays ne vaut pas pour sa case", async () => {
    const backend = createBackend();
    const date = daysAgoUTC(3);
    await seedGrid(backend, date);
    const { as } = await signIn(backend);
    const result = await as.mutation(api.account.syncAccount, {
      entries: [entry(date, cellsWith(0, "ITA"))],
      locale: "fr",
    });
    expect(result.attached).toBe(0);
  });

  it("garde locale la partie du jour sans ligne serveur", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    const { as } = await signIn(backend);
    const result = await as.mutation(api.account.syncAccount, {
      entries: [entry(todayUTC(), cellsWith(0, "FRA"))],
      locale: "fr",
    });
    expect([result.attached, (await gamesOf(backend)).length]).toEqual([0, 0]);
  });

  it("refuse un appel sans session", async () => {
    const backend = createBackend();
    await expect(
      backend.mutation(api.account.syncAccount, { entries: [], locale: "fr" }),
    ).rejects.toThrow("Unauthenticated");
  });
});

describe("playAccountMove", () => {
  it("crée la partie du compte au premier coup", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    const { as } = await signIn(backend);
    await as.mutation(api.games.playAccountMove, {
      date: todayUTC(),
      moveIndex: 0,
      cellKey: "0,0",
      countryCode: "FRA",
    });
    const game = await as.query(api.account.myGameForDate, {
      date: todayUTC(),
    });
    expect(game?.cells).toEqual(cellsWith(0, "FRA"));
  });

  it("acquitte sans l'appliquer le coup d'un autre appareil déjà joué", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    const { as } = await signIn(backend);
    const first = {
      date: todayUTC(),
      moveIndex: 0,
      cellKey: "0,0" as const,
      countryCode: "FRA",
    };
    await as.mutation(api.games.playAccountMove, first);
    const second = await as.mutation(api.games.playAccountMove, {
      ...first,
      countryCode: "DEU",
    });
    expect(second).toEqual({ kind: "duplicate" });
  });

  it("refuse le coup d'une session absente sans arrêter la partie", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    const result = await backend.mutation(api.games.playAccountMove, {
      date: todayUTC(),
      moveIndex: 0,
      cellKey: "0,0",
      countryCode: "FRA",
    });
    expect(result).toEqual({ kind: "rejected", reason: "signed_out" });
  });
});

describe("profil", () => {
  it("refuse un nom du filtre sans dire le mot", async () => {
    const backend = createBackend();
    const { as } = await signIn(backend);
    await as.mutation(api.account.syncAccount, { entries: [], locale: "fr" });
    const result = await as.mutation(api.account.updateProfile, {
      pseudo: "Geodoku Officiel",
    });
    expect(result).toEqual({ ok: false, reason: "refused" });
  });

  it("enregistre et retire le pays", async () => {
    const backend = createBackend();
    const { as } = await signIn(backend);
    await as.mutation(api.account.syncAccount, { entries: [], locale: "fr" });
    await as.mutation(api.account.updateProfile, { country: "BRA" });
    const chosen = (await as.query(api.account.me, {}))?.country;
    await as.mutation(api.account.updateProfile, { country: null });
    const removed = (await as.query(api.account.me, {}))?.country;
    expect([chosen, removed]).toEqual(["BRA", null]);
  });

  it("refuse un pays inconnu", async () => {
    const backend = createBackend();
    const { as } = await signIn(backend);
    await as.mutation(api.account.syncAccount, { entries: [], locale: "fr" });
    await expect(
      as.mutation(api.account.updateProfile, { country: "XXX" }),
    ).rejects.toThrow("Unknown country");
  });

  it("ne lit aucune partie sans session", async () => {
    const backend = createBackend();
    expect(await backend.query(api.account.myGames, {})).toBeNull();
  });
});

describe("changer d'e-mail", () => {
  it("accepte une adresse libre", async () => {
    const backend = createBackend();
    const { as } = await signIn(backend);
    expect(
      await as.mutation(api.account.checkNewEmail, {
        email: "camille@nouveau.fr",
      }),
    ).toEqual({ ok: true });
  });

  it("refuse une adresse qui a déjà un compte, quelle que soit sa casse", async () => {
    const backend = createBackend();
    await signIn(backend, "dominique@exemple.fr");
    const { as } = await signIn(backend);
    expect(
      await as.mutation(api.account.checkNewEmail, {
        email: " Dominique@Exemple.fr ",
      }),
    ).toEqual({ ok: false, reason: "taken" });
  });

  it("refuse sa propre adresse", async () => {
    const backend = createBackend();
    const { as } = await signIn(backend);
    expect(
      await as.mutation(api.account.checkNewEmail, {
        email: "CAMILLE@exemple.fr",
      }),
    ).toEqual({ ok: false, reason: "same" });
  });

  it("refuse une adresse mal formée", async () => {
    const backend = createBackend();
    const { as } = await signIn(backend);
    expect(
      await as.mutation(api.account.checkNewEmail, { email: "camille@" }),
    ).toEqual({ ok: false, reason: "invalid" });
  });

  it("ne répond pas sans compte", async () => {
    const backend = createBackend();
    await expect(
      backend.mutation(api.account.checkNewEmail, {
        email: "camille@nouveau.fr",
      }),
    ).rejects.toThrow();
  });
});

describe("suppression du compte", () => {
  it("efface le profil et détache chaque partie avec sa propre empreinte", async () => {
    const backend = createBackend();
    const date = daysAgoUTC(3);
    await seedGrid(backend, date);
    await seedGrid(backend, daysAgoUTC(4));
    const { as, userId } = await signIn(backend);
    await as.mutation(api.account.syncAccount, {
      entries: [
        entry(date, cellsWith(0, "FRA")),
        entry(daysAgoUTC(4), cellsWith(0, "DEU")),
      ],
      locale: "fr",
    });
    await backend.mutation(internal.auth.onDelete, {
      model: "user",
      doc: { _id: userId },
    });
    await backend.finishAllScheduledFunctions(() => {});
    const games = await gamesOf(backend);
    const profiles = await backend.run(
      async (ctx) => await ctx.db.query("profiles").take(5),
    );
    const hashes = new Set(
      games.map((game) =>
        game.owner.kind === "anon" ? game.owner.tokenHash : null,
      ),
    );
    expect([profiles.length, hashes.size, hashes.has(null)]).toEqual([
      0,
      2,
      false,
    ]);
  });
});

describe("parties importées", () => {
  it("n'entrent pas dans la cohorte figée d'un jour passé", async () => {
    const backend = createBackend();
    const date = daysAgoUTC(2);
    await seedGrid(backend, date);
    const { as } = await signIn(backend);
    await as.mutation(api.account.syncAccount, {
      entries: [
        entry(date, cellsWith(0, "FRA"), {
          failed: [0, 5, 0, 0, 0, 0, 0, 0, 0],
        }),
      ],
      locale: "fr",
    });
    const stats = await backend.query(api.games.getReplayStats, { date });
    expect(stats?.finishedGames).toBe(0);
  });
});

describe("effacement après 3 ans sans partie", () => {
  it("efface un compte dont la dernière partie a plus de 3 ans", async () => {
    const backend = createBackend();
    const old = daysAgoUTC(1200);
    await seedGrid(backend, old);
    const { as } = await signIn(backend);
    await as.mutation(api.account.syncAccount, {
      entries: [entry(old, cellsWith(0, "FRA"))],
      locale: "fr",
    });
    await backend.mutation(internal.account.purgeInactiveAccounts, {
      cursor: null,
    });
    await backend.finishAllScheduledFunctions(() => {});
    const [game] = await gamesOf(backend);
    expect([await as.query(api.account.me, {}), game.owner.kind]).toEqual([
      null,
      "anon",
    ]);
  });

  it("garde un compte qui a joué récemment", async () => {
    const backend = createBackend();
    const recent = daysAgoUTC(10);
    await seedGrid(backend, recent);
    const { as } = await signIn(backend);
    await as.mutation(api.account.syncAccount, {
      entries: [entry(recent, cellsWith(0, "FRA"))],
      locale: "fr",
    });
    await backend.mutation(internal.account.purgeInactiveAccounts, {
      cursor: null,
    });
    expect((await as.query(api.account.me, {}))?.email).toBe(
      "camille@exemple.fr",
    );
  });
});
