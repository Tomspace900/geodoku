// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, it } from "vitest";
import { CONSTRAINTS } from "../src/features/game/logic/constraints";
import { api } from "./_generated/api";
import { daysAgoUTC } from "./lib/dates";
import schema from "./schema";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./**/__tests__/**",
]);

const VALID_ANSWERS = { "0,0": ["FRA"], "0,1": ["DEU"] };

async function seedGridForDate(
  backend: TestConvex<typeof schema>,
  date: string,
): Promise<void> {
  await backend.run(async (ctx) => {
    const candidateId = await ctx.db.insert("gridCandidates", {
      rows: ["row-0", "row-1", "row-2"],
      cols: ["col-0", "col-1", "col-2"],
      metadata: {
        seedConstraint: CONSTRAINTS[0].id,
        constraintIds: [CONSTRAINTS[0].id],
        categories: ["geography"],
        avgCellSize: 2,
        minCellSize: 1,
        countryPool: ["FRA"],
      },
      status: "used",
    });
    await ctx.db.insert("gridAnswers", {
      candidateId,
      validAnswers: VALID_ANSWERS,
    });
    await ctx.db.insert("grids", {
      date,
      rows: ["row-0", "row-1", "row-2"],
      cols: ["col-0", "col-1", "col-2"],
      countryPool: ["FRA"],
      candidateId,
    });
  });
}

/**
 * L'archive ne doit rien révéler : les réponses ne partent qu'à l'ouverture
 * d'une grille précise. Ce test verrouille la frontière côté liste — sans lui,
 * un `validAnswers` ajouté par mégarde au read model livrerait sept grilles de
 * réponses d'un coup, et aucun test unitaire ne le voyait.
 */
describe("getReplayableGrids", () => {
  it("ne livre jamais les réponses dans la liste de l'archive", async () => {
    const backend = convexTest(schema, modules);
    await seedGridForDate(backend, daysAgoUTC(1));
    await seedGridForDate(backend, daysAgoUTC(3));

    const grids = await backend.query(api.grids.getReplayableGrids, {});

    expect(grids).toHaveLength(2);
    grids.forEach((grid) => {
      expect(grid).not.toHaveProperty("validAnswers");
      expect(Object.keys(grid).sort()).toEqual(["cols", "date", "rows"]);
    });
  });

  it("livre les réponses seulement à l'ouverture d'une grille passée", async () => {
    const backend = convexTest(schema, modules);
    const date = daysAgoUTC(2);
    await seedGridForDate(backend, date);

    const grid = await backend.query(api.grids.getReplayGrid, { date });

    expect(grid?.validAnswers).toEqual(VALID_ANSWERS);
  });
});
