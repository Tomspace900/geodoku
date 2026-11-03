import { describe, expect, it } from "vitest";
import {
  assertCanonicalDate,
  assertClientId,
  assertCountryCode,
  assertGameToken,
} from "../gameWriteValidation";

describe("game write validation", () => {
  it("accepts a UUID v4 game token", () => {
    expect(() =>
      assertGameToken("123e4567-e89b-42d3-a456-426614174000"),
    ).not.toThrow();
  });

  it("rejects a non-UUID game token", () => {
    expect(() => assertGameToken("guess-today-0,0")).toThrow(
      "Invalid game token",
    );
  });

  it("accepts browser and simulation client ids", () => {
    expect(() =>
      assertClientId("sim-123e4567-e89b-42d3-a456-426614174000"),
    ).not.toThrow();
  });

  it("rejects an unbounded client id", () => {
    expect(() => assertClientId("x".repeat(129))).toThrow("Invalid clientId");
  });

  it("accepts a playable ISO3 code", () => {
    expect(() => assertCountryCode("FRA")).not.toThrow();
  });

  it("rejects a code that is not three capital letters", () => {
    expect(() => assertCountryCode("fr")).toThrow("Invalid countryCode");
  });

  it("accepts a canonical leap-day date", () => {
    expect(() => assertCanonicalDate("2024-02-29")).not.toThrow();
  });

  it("rejects an impossible calendar date", () => {
    expect(() => assertCanonicalDate("2026-02-30")).toThrow("Invalid date");
  });
});
