import { en } from "@/i18n/locales/en";
import { fr } from "@/i18n/locales/fr";
import { describe, expect, it } from "vitest";
import {
  BLOCKED_TITLE_KEYS,
  LIVES_DEFEAT_KEYS,
  WIN_TITLE_KEYS,
  resultTitleKeys,
  winTitleBand,
} from "../resultTitle";

describe("winTitleBand", () => {
  it("maps totals to bands at the thresholds", () => {
    expect(winTitleBand(1000)).toBe("legendary");
    expect(winTitleBand(850)).toBe("legendary");
    expect(winTitleBand(849)).toBe("great");
    expect(winTitleBand(700)).toBe("great");
    expect(winTitleBand(699)).toBe("good");
    expect(winTitleBand(550)).toBe("good");
    expect(winTitleBand(549)).toBe("solid");
    expect(winTitleBand(0)).toBe("solid");
  });
});

describe("resultTitleKeys", () => {
  it("picks the win band by score", () => {
    expect(resultTitleKeys({ status: "won", total: 900 })).toBe(
      WIN_TITLE_KEYS.legendary,
    );
    expect(resultTitleKeys({ status: "won", total: 500 })).toBe(
      WIN_TITLE_KEYS.solid,
    );
  });

  it("uses the consolation bank when out of lives", () => {
    expect(resultTitleKeys({ status: "lostByLives" })).toBe(LIVES_DEFEAT_KEYS);
    expect(LIVES_DEFEAT_KEYS.length).toBeGreaterThanOrEqual(2);
  });

  it("uses the single blocked title", () => {
    expect(resultTitleKeys({ status: "lostByBlock" })).toBe(BLOCKED_TITLE_KEYS);
    expect(BLOCKED_TITLE_KEYS).toHaveLength(1);
  });
});

describe("result title i18n keys", () => {
  const resolve = (bundle: Record<string, unknown>, key: string): unknown =>
    key.split(".").reduce<unknown>((acc, part) => {
      if (acc && typeof acc === "object" && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, bundle);

  const allKeys = [
    ...Object.values(WIN_TITLE_KEYS).flat(),
    ...LIVES_DEFEAT_KEYS,
    ...BLOCKED_TITLE_KEYS,
  ];

  it("all exist as strings in both locales", () => {
    allKeys.forEach((key) => {
      expect(typeof resolve(en, key)).toBe("string");
      expect(typeof resolve(fr, key)).toBe("string");
    });
  });
});
