import { describe, expect, it } from "vitest";
import {
  CODE_REUSE_MS,
  codeKey,
  reusableSentAt,
  withoutCode,
  withSentCode,
} from "../recentCodes";

const NOW = 1_800_000_000_000;
const KEY = codeKey("delete-account", "camille@example.com");

describe("codeKey", () => {
  it("ignore la casse et les espaces de l'adresse", () => {
    expect(codeKey("delete-account", "  Camille@Example.com ")).toBe(KEY);
  });

  it("sépare les objets pour une même adresse", () => {
    expect(codeKey("sign-in", "camille@example.com")).not.toBe(KEY);
  });
});

describe("reusableSentAt", () => {
  it("resert un code envoyé il y a une minute", () => {
    const sentAt = NOW - 60_000;
    expect(reusableSentAt({ [KEY]: sentAt }, KEY, NOW)).toBe(sentAt);
  });

  it("ne resert pas un code trop vieux pour tenir encore une minute", () => {
    expect(reusableSentAt({ [KEY]: NOW - CODE_REUSE_MS }, KEY, NOW)).toBeNull();
  });

  it("ne resert rien pour une autre adresse", () => {
    const other = codeKey("delete-account", "malo@example.com");
    expect(reusableSentAt({ [KEY]: NOW }, other, NOW)).toBeNull();
  });

  it("ignore une heure d'envoi dans le futur (horloge changée)", () => {
    expect(reusableSentAt({ [KEY]: NOW + 60_000 }, KEY, NOW)).toBeNull();
  });
});

describe("withSentCode", () => {
  it("garde les codes encore bons et oublie les vieux", () => {
    const fresh = codeKey("sign-in", "malo@example.com");
    const stale = codeKey("sign-in", "lea@example.com");
    const codes = withSentCode(
      { [fresh]: NOW - 60_000, [stale]: NOW - CODE_REUSE_MS - 1 },
      KEY,
      NOW,
    );
    expect(codes).toEqual({ [fresh]: NOW - 60_000, [KEY]: NOW });
  });
});

describe("withoutCode", () => {
  it("oublie un code utilisé", () => {
    expect(withoutCode({ [KEY]: NOW }, KEY)).toEqual({});
  });
});
