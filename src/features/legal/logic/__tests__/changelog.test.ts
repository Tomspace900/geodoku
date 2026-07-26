import { describe, expect, it } from "vitest";
import {
  LATEST_CHANGELOG_UPDATE_DATE,
  isChangelogNewBadgeVisible,
} from "../changelog";

// Dérivé de la constante plutôt qu'en dur : la fenêtre de 72 h est la règle
// testée, pas la date de la dernière release (qui bouge à chaque entrée ajoutée).
const RELEASE_MS = Date.parse(`${LATEST_CHANGELOG_UPDATE_DATE}T00:00:00.000Z`);
const HOUR_MS = 60 * 60 * 1000;
const at = (offsetMs: number) => new Date(RELEASE_MS + offsetMs);

describe("isChangelogNewBadgeVisible", () => {
  it("est visible dans les 72 h après la date de release (UTC)", () => {
    expect(isChangelogNewBadgeVisible(at(0))).toBe(true);
    expect(isChangelogNewBadgeVisible(at(12 * HOUR_MS))).toBe(true);
    expect(isChangelogNewBadgeVisible(at(72 * HOUR_MS - 1))).toBe(true);
  });

  it("disparaît après 72 h", () => {
    expect(isChangelogNewBadgeVisible(at(72 * HOUR_MS))).toBe(false);
  });

  it("reste masqué avant la release", () => {
    expect(isChangelogNewBadgeVisible(at(-1))).toBe(false);
  });
});
