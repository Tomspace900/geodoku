import { describe, expect, it } from "vitest";
import { countAt, mechanicalEase } from "../scoreAnimation";

describe("mechanicalEase", () => {
  it("pins the endpoints", () => {
    expect(mechanicalEase(0)).toBe(0);
    expect(mechanicalEase(1)).toBe(1);
  });

  it("clamps outside [0, 1]", () => {
    expect(mechanicalEase(-0.5)).toBe(0);
    expect(mechanicalEase(2)).toBe(1);
  });

  it("is monotonically increasing across the range", () => {
    let prev = -1;
    for (let i = 0; i <= 100; i++) {
      const v = mechanicalEase(i / 100);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it("is continuous at the linear/decelerating knee (t = 0.7)", () => {
    const before = mechanicalEase(0.7 - 1e-6);
    const at = mechanicalEase(0.7);
    const after = mechanicalEase(0.7 + 1e-6);
    expect(Math.abs(at - before)).toBeLessThan(1e-4);
    expect(Math.abs(after - at)).toBeLessThan(1e-4);
  });

  it("moves at constant speed before the knee (mechanical feel)", () => {
    // Sur le segment linéaire, l'incrément par pas de temps est constant.
    const step1 = mechanicalEase(0.2) - mechanicalEase(0.1);
    const step2 = mechanicalEase(0.5) - mechanicalEase(0.4);
    expect(Math.abs(step1 - step2)).toBeLessThan(1e-6);
  });

  it("decelerates after the knee (final slowdown)", () => {
    // Dernière fenêtre plus lente que le régime linéaire constant.
    const linearStep = mechanicalEase(0.4) - mechanicalEase(0.3);
    const finalStep = mechanicalEase(1) - mechanicalEase(0.9);
    expect(finalStep).toBeLessThan(linearStep);
  });
});

describe("countAt", () => {
  it("returns the bounds at the extremes", () => {
    expect(countAt(0, 450, 0)).toBe(0);
    expect(countAt(0, 450, 1)).toBe(450);
    expect(countAt(120, 330, 1)).toBe(330);
  });

  it("rounds the interpolated value to an integer", () => {
    expect(countAt(0, 100, 0.333)).toBe(33);
    expect(countAt(0, 3, 0.5)).toBe(2); // 1.5 → 2
  });
});
