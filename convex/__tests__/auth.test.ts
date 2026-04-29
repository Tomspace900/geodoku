import { describe, expect, it } from "vitest";
import { safeEqual } from "../auth";

describe("safeEqual", () => {
  it("returns true for two identical strings", () => {
    expect(safeEqual("abc123", "abc123")).toBe(true);
  });

  it("returns false for strings of different lengths", () => {
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("returns false for two strings differing in one character", () => {
    expect(safeEqual("abc123", "abc124")).toBe(false);
  });

  it("returns true for empty strings", () => {
    expect(safeEqual("", "")).toBe(true);
  });

  it("returns false when one string is empty and the other is not", () => {
    expect(safeEqual("", "x")).toBe(false);
  });
});
