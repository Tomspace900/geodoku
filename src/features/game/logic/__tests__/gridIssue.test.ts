import { describe, expect, it } from "vitest";
import {
  GRID_LAUNCH_DATE_ISO,
  getGridNumberForDate,
  getGridNumberForTodayUtc,
} from "../gridIssue";

describe("gridIssue", () => {
  it("exposes launch date as ISO day", () => {
    expect(GRID_LAUNCH_DATE_ISO).toBe("2026-06-01");
  });

  it("returns null before launch", () => {
    expect(getGridNumberForDate("2026-05-31")).toBeNull();
    expect(getGridNumberForDate("2020-01-01")).toBeNull();
  });

  it("returns 1 on launch day", () => {
    expect(getGridNumberForDate("2026-06-01")).toBe(1);
  });

  it("increments by calendar day (UTC)", () => {
    expect(getGridNumberForDate("2026-06-02")).toBe(2);
    expect(getGridNumberForDate("2026-07-01")).toBe(31);
  });

  it("maps invalid iso to null", () => {
    expect(getGridNumberForDate("")).toBeNull();
    expect(getGridNumberForDate("nope")).toBeNull();
  });

  it("getGridNumberForTodayUtc matches UTC calendar slice", () => {
    const noonUtcJune2 = Date.UTC(2026, 5, 2, 12, 0, 0);
    expect(getGridNumberForTodayUtc(noonUtcJune2)).toBe(2);
    const mayBeforeLaunch = Date.UTC(2026, 4, 15, 12, 0, 0);
    expect(getGridNumberForTodayUtc(mayBeforeLaunch)).toBeNull();
  });
});
