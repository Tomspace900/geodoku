import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEYS, safeGet, safeRemove, safeSet } from "../storage";

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
