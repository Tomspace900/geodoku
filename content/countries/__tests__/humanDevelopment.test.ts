import { describe, expect, it } from "vitest";
import { humanDevelopmentCategory } from "../humanDevelopment";

describe("humanDevelopmentCategory", () => {
  it.each([
    [0.972, "very_high"],
    [0.8, "very_high"],
    [0.799, "high"],
    [0.7, "high"],
    [0.699, "medium"],
    [0.55, "medium"],
    [0.549, "low"],
    [0.388, "low"],
  ] as const)("range %s dans %s (seuils du HDR 2025)", (value, expected) => {
    expect(humanDevelopmentCategory(value)).toBe(expected);
  });
});
