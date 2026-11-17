// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { daysAgoUTC, todayUTC, tomorrowUTC } from "./lib/dates";
import schema from "./schema";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./**/__tests__/**",
]);
const ADMIN = "valid-admin-token";
const DAY_MS = 24 * 60 * 60 * 1000;

function createBackend() {
  const backend = convexTest(schema, modules);
  rateLimiterTest.register(backend);
  return backend;
}

type Backend = ReturnType<typeof createBackend>;

function reportId(sequence: number): string {
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
}

async function seedGrid(backend: Backend, date = todayUTC()): Promise<void> {
  await backend.run(async (ctx) => {
    const candidateId = await ctx.db.insert("gridCandidates", {
      rows: ["continent_asia", "row-1", "row-2"],
      cols: ["water_landlocked", "col-1", "col-2"],
      metadata: {
        seedConstraint: "continent_asia",
        constraintIds: [],
        categories: [],
        avgCellSize: 2,
        minCellSize: 1,
        countryPool: [],
      },
      status: "used",
    });
    await ctx.db.insert("grids", {
      date,
      rows: ["continent_asia", "row-1", "row-2"],
      cols: ["water_landlocked", "col-1", "col-2"],
      countryPool: [],
      candidateId,
    });
  });
}

function cellReport(
  sequence: number,
  overrides: { clientId?: string; message?: string; date?: string } = {},
) {
  return {
    reportId: reportId(sequence),
    clientId: overrides.clientId ?? "client-12345678",
    category: "content" as const,
    target: {
      kind: "cell" as const,
      date: overrides.date ?? todayUTC(),
      mode: "daily" as const,
      cellKey: "0,0" as const,
    },
    message: overrides.message ?? "Le Bhoutan devrait compter ici.",
    locale: "fr" as const,
  };
}

async function allReports(backend: Backend) {
  return await backend.run(async (ctx) => ctx.db.query("reports").collect());
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("reports.submit", () => {
  it("enregistre le signalement sans aucun identifiant du joueur", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    await backend.mutation(api.reports.submit, cellReport(1));
    const [row] = await allReports(backend);
    expect(Object.keys(row).sort()).toEqual([
      "_creationTime",
      "_id",
      "category",
      "locale",
      "message",
      "reportId",
      "status",
      "target",
    ]);
  });

  it("rend duplicate sans rien écrire pour un même reportId", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    await backend.mutation(api.reports.submit, cellReport(1));
    const second = await backend.mutation(api.reports.submit, cellReport(1));
    expect([second, (await allReports(backend)).length]).toEqual([
      "duplicate",
      1,
    ]);
  });

  it("ne consomme pas la limite sur un renvoi", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    for (const sequence of [1, 2, 3]) {
      await backend.mutation(api.reports.submit, cellReport(sequence));
    }
    expect(await backend.mutation(api.reports.submit, cellReport(3))).toBe(
      "duplicate",
    );
  });

  it("retire les caractères de contrôle et les espaces autour", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    await backend.mutation(
      api.reports.submit,
      cellReport(1, { message: "  Ligne 1\u0007\nLigne 2  " }),
    );
    const [row] = await allReports(backend);
    expect(row.message).toBe("Ligne 1\nLigne 2");
  });

  it("refuse un texte vide après nettoyage", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    await expect(
      backend.mutation(
        api.reports.submit,
        cellReport(1, { message: " \u0000 " }),
      ),
    ).rejects.toThrow("Invalid message");
  });

  it("refuse un texte trop long", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    await expect(
      backend.mutation(
        api.reports.submit,
        cellReport(1, { message: "a".repeat(501) }),
      ),
    ).rejects.toThrow("Invalid message");
  });

  it("refuse une date future", async () => {
    const backend = createBackend();
    await seedGrid(backend, tomorrowUTC());
    await expect(
      backend.mutation(
        api.reports.submit,
        cellReport(1, { date: tomorrowUTC() }),
      ),
    ).rejects.toThrow("Date is in the future");
  });

  it("refuse une date sans grille", async () => {
    const backend = createBackend();
    await expect(
      backend.mutation(
        api.reports.submit,
        cellReport(1, { date: daysAgoUTC(3) }),
      ),
    ).rejects.toThrow("Grid unavailable");
  });

  it("accepte une grille passée (entraînement)", async () => {
    const backend = createBackend();
    await seedGrid(backend, daysAgoUTC(3));
    const result = await backend.mutation(api.reports.submit, {
      ...cellReport(1, { date: daysAgoUTC(3) }),
      target: {
        kind: "constraint",
        date: daysAgoUTC(3),
        mode: "training",
        constraintId: "water_landlocked",
      },
    });
    expect(result).toBe("sent");
  });

  it("refuse une contrainte absente de la grille", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    await expect(
      backend.mutation(api.reports.submit, {
        ...cellReport(1),
        target: {
          kind: "constraint",
          date: todayUTC(),
          mode: "daily",
          constraintId: "continent_europe",
        },
      }),
    ).rejects.toThrow("Unknown constraint");
  });

  it("refuse une page mal formée", async () => {
    const backend = createBackend();
    await expect(
      backend.mutation(api.reports.submit, {
        ...cellReport(1),
        category: "bug",
        target: { kind: "general", page: "https://example.com" },
      }),
    ).rejects.toThrow("Invalid page");
  });

  it("accepte un signalement général depuis une page", async () => {
    const backend = createBackend();
    const result = await backend.mutation(api.reports.submit, {
      ...cellReport(1),
      category: "bug",
      target: { kind: "general", page: "/archive/2026-11-14" },
    });
    expect(result).toBe("sent");
  });

  it("rend rate_limited au 4e signalement d'affilée et le compte", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    for (const sequence of [1, 2, 3]) {
      await backend.mutation(api.reports.submit, cellReport(sequence));
    }
    const fourth = await backend.mutation(api.reports.submit, cellReport(4));
    const counters = await backend.run(async (ctx) =>
      ctx.db.query("healthCounters").collect(),
    );
    expect([fourth, counters[0]?.rateLimited]).toEqual(["rate_limited", 1]);
  });

  it("plafonne à 50 signalements par jour, tous navigateurs confondus", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    for (let sequence = 1; sequence <= 50; sequence++) {
      await backend.mutation(
        api.reports.submit,
        cellReport(sequence, { clientId: `client-${sequence}-abcdef` }),
      );
    }
    const extra = await backend.mutation(
      api.reports.submit,
      cellReport(51, { clientId: "client-51-abcdef" }),
    );
    expect(extra).toBe("rate_limited");
  });
});

describe("admin des signalements", () => {
  it("refuse la liste sans jeton valide", async () => {
    vi.stubEnv("ADMIN_TOKEN", ADMIN);
    const backend = createBackend();
    await expect(
      backend.query(api.reports.listReports, {
        adminToken: "wrong",
        status: null,
        paginationOpts: { numItems: 10, cursor: null },
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("liste les plus récents d'abord", async () => {
    vi.stubEnv("ADMIN_TOKEN", ADMIN);
    const backend = createBackend();
    await seedGrid(backend);
    await backend.mutation(api.reports.submit, cellReport(1));
    await backend.mutation(api.reports.submit, cellReport(2));
    const result = await backend.query(api.reports.listReports, {
      adminToken: ADMIN,
      status: "new",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(result.page.map((report) => report.reportId)).toEqual([
      reportId(2),
      reportId(1),
    ]);
  });

  it("date le changement de statut", async () => {
    vi.stubEnv("ADMIN_TOKEN", ADMIN);
    const backend = createBackend();
    await seedGrid(backend);
    await backend.mutation(api.reports.submit, cellReport(1));
    const [row] = await allReports(backend);
    await backend.mutation(api.reports.setReportStatus, {
      adminToken: ADMIN,
      id: row._id,
      status: "resolved",
    });
    const [after] = await allReports(backend);
    expect([after.status, typeof after.statusChangedAt]).toEqual([
      "resolved",
      "number",
    ]);
  });

  it("compte les nouveaux", async () => {
    vi.stubEnv("ADMIN_TOKEN", ADMIN);
    const backend = createBackend();
    await seedGrid(backend);
    await backend.mutation(api.reports.submit, cellReport(1));
    expect(
      await backend.query(api.reports.countNewReports, { adminToken: ADMIN }),
    ).toEqual({ count: 1, capped: false });
  });
});

describe("reports.purgeReports", () => {
  async function insert(
    backend: Backend,
    status: "new" | "resolved",
    statusChangedAt?: number,
  ) {
    await backend.run(async (ctx) => {
      await ctx.db.insert("reports", {
        reportId: crypto.randomUUID(),
        category: "bug",
        target: { kind: "general", page: "/" },
        message: "x",
        locale: "fr",
        status,
        ...(statusChangedAt === undefined ? {} : { statusChangedAt }),
      });
    });
  }

  it("efface un signalement traité depuis plus d'un an", async () => {
    const backend = createBackend();
    await insert(backend, "resolved", Date.now() - 366 * DAY_MS);
    await insert(backend, "resolved", Date.now() - 10 * DAY_MS);
    await backend.mutation(internal.reports.purgeReports, {});
    expect((await allReports(backend)).length).toBe(1);
  });

  it("efface tout signalement de plus de trois ans", async () => {
    const backend = createBackend();
    await insert(backend, "new");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 3 * 366 * DAY_MS);
    await backend.mutation(internal.reports.purgeReports, {});
    expect((await allReports(backend)).length).toBe(0);
  });

  it("garde un nouveau signalement récent", async () => {
    const backend = createBackend();
    await insert(backend, "new");
    await backend.mutation(internal.reports.purgeReports, {});
    expect((await allReports(backend)).length).toBe(1);
  });
});

describe("alertes de grille manquante", () => {
  it("signale le jour et le lendemain sans grille", async () => {
    const backend = createBackend();
    const missing = await backend.query(internal.alerts.findMissingGrids, {});
    expect(missing.map((day) => day.which)).toEqual(["today", "tomorrow"]);
  });

  it("ne signale qu'une fois une même date", async () => {
    const backend = createBackend();
    await seedGrid(backend);
    await backend.mutation(internal.alerts.recordAlertSent, {
      key: `missing-grid:${tomorrowUTC()}`,
    });
    expect(await backend.query(internal.alerts.findMissingGrids, {})).toEqual(
      [],
    );
  });

  it("n'envoie rien sans destinataire", async () => {
    const backend = createBackend();
    await backend.action(internal.alerts.checkMissingGrids, {});
    const sent = await backend.run(async (ctx) =>
      ctx.db.query("sentAlerts").collect(),
    );
    expect(sent).toEqual([]);
  });
});
