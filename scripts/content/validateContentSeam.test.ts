import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  contentSeamViolations,
  validateContentSeam,
} from "./validateContentSeam";

const ROOT = resolve(import.meta.dirname, "..", "..");

describe("seam de content/", () => {
  it("laisse passer le relatif interne et les paquets", () => {
    expect(
      contentSeamViolations(
        "content/constraints/derivations.ts",
        [
          'import type { CountryCode } from "../countries/countryCodes";',
          'import type { ActiveConstraintId } from "./index";',
          'import { describe } from "vitest";',
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  it("refuse l'alias @/ — que ni tsx ni Vite ne feraient échouer", () => {
    expect(
      contentSeamViolations(
        "content/countries/catalog.ts",
        'import { solveGrid } from "@/features/game/logic/gridSolver";',
      ),
    ).toEqual([
      "content/countries/catalog.ts: import via l'alias « @/features/game/logic/gridSolver » — content/ est terminal, n'importer que du relatif interne",
    ]);
  });

  it("refuse une remontée relative hors du dossier", () => {
    expect(
      contentSeamViolations(
        "content/constraints/derivations.ts",
        'export { CONSTRAINTS } from "../../src/features/game/logic/constraints";',
      ),
    ).toEqual([
      "content/constraints/derivations.ts: import hors de content/ (« ../../src/features/game/logic/constraints ») — content/ est terminal",
    ]);
  });

  it("refuse aussi un import dynamique", () => {
    expect(
      contentSeamViolations(
        "content/countries/facts.ts",
        'const m = await import("../../convex/lib/gridConstants");',
      ),
    ).toHaveLength(1);
  });

  it("est vert sur le contenu committé", () => {
    expect(validateContentSeam(ROOT)).toEqual([]);
  });
});
