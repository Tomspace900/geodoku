import { describe, expect, it } from "vitest";
import {
  assertCanonicalDate,
  assertClientId,
  assertCountryCode,
  assertOperationId,
  assertValidGameEnd,
} from "../gameWriteValidation";
import { todayUTC } from "../lib/dates";

describe("game write validation", () => {
  it("accepts a UUID v4 operation id", () => {
    expect(() =>
      assertOperationId("123e4567-e89b-42d3-a456-426614174000"),
    ).not.toThrow();
  });

  it("rejects a non-UUID operation id", () => {
    expect(() => assertOperationId("guess-today-0,0")).toThrow(
      "Invalid operationId",
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

  it("rejects a syntactically valid but unknown ISO3 code", () => {
    expect(() => assertCountryCode("ZZZ")).toThrow("Invalid countryCode");
  });

  it("accepts a canonical leap-day date", () => {
    expect(() => assertCanonicalDate("2024-02-29")).not.toThrow();
  });

  it("rejects an impossible calendar date", () => {
    expect(() => assertCanonicalDate("2026-02-30")).toThrow("Invalid date");
  });

  it("accepts a consistent win", () => {
    expect(() =>
      assertValidGameEnd({
        endReason: "win",
        livesLeft: 3,
        filledCells: 9,
        guessesSubmitted: 11,
      }),
    ).not.toThrow();
  });

  it("accepts a loss caused by exhausted lives", () => {
    expect(() =>
      assertValidGameEnd({
        endReason: "lives",
        livesLeft: 0,
        filledCells: 4,
        guessesSubmitted: 9,
      }),
    ).not.toThrow();
  });

  it("accepts a blocked loss with lives left", () => {
    expect(() =>
      assertValidGameEnd({
        endReason: "blocked",
        livesLeft: 2,
        filledCells: 6,
        guessesSubmitted: 9,
      }),
    ).not.toThrow();
  });

  it("rejects a payload whose guess total is inconsistent", () => {
    expect(() =>
      assertValidGameEnd({
        endReason: "win",
        livesLeft: 3,
        filledCells: 9,
        guessesSubmitted: 9,
      }),
    ).toThrow("Invalid guessesSubmitted");
  });

  it("rejects nine filled cells with zero lives", () => {
    expect(() =>
      assertValidGameEnd({
        endReason: "lives",
        livesLeft: 0,
        filledCells: 9,
        guessesSubmitted: 14,
      }),
    ).toThrow("Invalid loss state");
  });
});
