import { beforeEach, describe, expect, it } from "vitest";
import {
  LEGACY_SURVEY_DISMISSED_DATE,
  migrateLegacyStorage,
  STORAGE_KEYS,
  safeGet,
  safeRemove,
  safeSet,
} from "../storage";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("safe wrappers", () => {
  it("round-trip get/set on localStorage", () => {
    safeSet(STORAGE_KEYS.locale, "fr");
    expect(safeGet(STORAGE_KEYS.locale)).toBe("fr");
  });

  it("returns null for a missing key", () => {
    expect(safeGet("geodoku:absent")).toBeNull();
  });

  it("remove clears the value", () => {
    safeSet(STORAGE_KEYS.locale, "en");
    safeRemove(STORAGE_KEYS.locale);
    expect(safeGet(STORAGE_KEYS.locale)).toBeNull();
  });

  it("targets sessionStorage when kind is session", () => {
    safeSet(STORAGE_KEYS.adminToken, "tok", "session");
    expect(sessionStorage.getItem(STORAGE_KEYS.adminToken)).toBe("tok");
    expect(localStorage.getItem(STORAGE_KEYS.adminToken)).toBeNull();
    expect(safeGet(STORAGE_KEYS.adminToken, "session")).toBe("tok");
  });
});

describe("migrateLegacyStorage — simple renames", () => {
  it("renames legacy keys to the geodoku:* namespace and drops the old ones", () => {
    localStorage.setItem("geodoku.clientId", "uuid-1");
    localStorage.setItem("geodoku.showHowToPlay", "false");
    localStorage.setItem("geodoku.locale", "fr");
    localStorage.setItem("geodoku:surveyDone", "1");

    migrateLegacyStorage();

    expect(safeGet(STORAGE_KEYS.clientId)).toBe("uuid-1");
    expect(safeGet(STORAGE_KEYS.howToPlay)).toBe("false");
    expect(safeGet(STORAGE_KEYS.locale)).toBe("fr");
    expect(safeGet(STORAGE_KEYS.surveyDone)).toBe(
      JSON.stringify({ kind: "dismissed", date: LEGACY_SURVEY_DISMISSED_DATE }),
    );

    expect(localStorage.getItem("geodoku.clientId")).toBeNull();
    expect(localStorage.getItem("geodoku.showHowToPlay")).toBeNull();
    expect(localStorage.getItem("geodoku.locale")).toBeNull();
    expect(localStorage.getItem("geodoku:surveyDone")).toBeNull();
  });

  it("does not overwrite an already-migrated key", () => {
    localStorage.setItem("geodoku.locale", "fr");
    localStorage.setItem(STORAGE_KEYS.locale, "en");

    migrateLegacyStorage();

    expect(safeGet(STORAGE_KEYS.locale)).toBe("en");
    expect(localStorage.getItem("geodoku.locale")).toBeNull();
  });

  it("rewrites the already-migrated survey flat flag as a dated dismiss", () => {
    localStorage.setItem(STORAGE_KEYS.surveyDone, "1");

    migrateLegacyStorage();

    expect(safeGet(STORAGE_KEYS.surveyDone)).toBe(
      JSON.stringify({ kind: "dismissed", date: LEGACY_SURVEY_DISMISSED_DATE }),
    );
  });

  it("is idempotent and a no-op when nothing to migrate", () => {
    migrateLegacyStorage();
    expect(localStorage.length).toBe(0);
  });

  it("migrates the admin token in sessionStorage", () => {
    sessionStorage.setItem("geodoku_admin_token", "secret");
    migrateLegacyStorage();
    expect(safeGet(STORAGE_KEYS.adminToken, "session")).toBe("secret");
    expect(sessionStorage.getItem("geodoku_admin_token")).toBeNull();
  });
});

describe("migrateLegacyStorage — game folding", () => {
  const legacyGame = (date: string) =>
    JSON.stringify({
      version: 1,
      date,
      cells: {},
      remainingLives: 5,
      usedCountries: [],
      status: "won",
      startedAt: 1,
      finishedAt: 2,
    });

  it("folds per-date ended/rated flags into the game and bumps to v2", () => {
    localStorage.setItem("geodoku.currentGame", legacyGame("2026-07-01"));
    localStorage.setItem("geodoku:ended:2026-07-01", "1");
    localStorage.setItem("geodoku:rated:2026-07-01", "1");

    migrateLegacyStorage();

    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.game)!);
    expect(raw.version).toBe(2);
    expect(raw.endRecorded).toBe(true);
    expect(raw.rated).toBe(true);
    expect(localStorage.getItem("geodoku.currentGame")).toBeNull();
  });

  it("defaults folded flags to false when the per-date keys are absent", () => {
    localStorage.setItem("geodoku.currentGame", legacyGame("2026-07-02"));

    migrateLegacyStorage();

    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.game)!);
    expect(raw.endRecorded).toBe(false);
    expect(raw.rated).toBe(false);
  });

  it("purges all per-date flags, including those of other days", () => {
    localStorage.setItem("geodoku:ended:2026-06-30", "1");
    localStorage.setItem("geodoku:rated:2026-06-29", "1");
    localStorage.setItem("geodoku:ended:2026-07-01", "1");

    migrateLegacyStorage();

    Object.keys(localStorage).forEach((k) => {
      expect(k.startsWith("geodoku:ended:")).toBe(false);
      expect(k.startsWith("geodoku:rated:")).toBe(false);
    });
  });

  it("drops a corrupt legacy game rather than throwing", () => {
    localStorage.setItem("geodoku.currentGame", "{not json");
    expect(() => migrateLegacyStorage()).not.toThrow();
    expect(localStorage.getItem("geodoku.currentGame")).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.game)).toBeNull();
  });
});
