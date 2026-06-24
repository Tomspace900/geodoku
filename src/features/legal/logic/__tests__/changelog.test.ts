import { describe, expect, it } from "vitest";
import { isChangelogNewBadgeVisible } from "../changelog";

describe("isChangelogNewBadgeVisible", () => {
  it("est visible dans les 72 h après la date de release (UTC)", () => {
    expect(
      isChangelogNewBadgeVisible(new Date("2026-06-24T12:00:00.000Z")),
    ).toBe(true);
    expect(
      isChangelogNewBadgeVisible(new Date("2026-06-26T23:59:59.999Z")),
    ).toBe(true);
  });

  it("disparaît après 72 h", () => {
    expect(
      isChangelogNewBadgeVisible(new Date("2026-06-27T00:00:00.000Z")),
    ).toBe(false);
  });

  it("reste masqué avant la release", () => {
    expect(
      isChangelogNewBadgeVisible(new Date("2026-06-23T23:59:59.999Z")),
    ).toBe(false);
  });
});
