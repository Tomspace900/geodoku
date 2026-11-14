import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  looksLikeEmail,
  sendOutcome,
  verifyOutcome,
} from "../codeOutcome";

describe("sendOutcome", () => {
  it("dit trop de codes sur un refus de la limite", () => {
    expect(sendOutcome({ status: 429 })).toBe("too_many");
  });

  it("dit l'adresse invalide", () => {
    expect(sendOutcome({ status: 400, code: "INVALID_EMAIL" })).toBe(
      "invalid_email",
    );
  });

  it("prend une autre erreur pour un envoi raté", () => {
    expect(sendOutcome({ status: 500 })).toBe("offline");
  });
});

describe("verifyOutcome", () => {
  it("distingue un code épuisé", () => {
    expect(verifyOutcome({ status: 403, code: "TOO_MANY_ATTEMPTS" })).toBe(
      "too_many_attempts",
    );
  });

  it("distingue un code expiré", () => {
    expect(verifyOutcome({ status: 400, code: "OTP_EXPIRED" })).toBe("expired");
  });

  it("lit un mauvais code", () => {
    expect(verifyOutcome({ status: 400, code: "INVALID_OTP" })).toBe("wrong");
  });

  it("accepte l'absence d'erreur", () => {
    expect(verifyOutcome(null)).toBe("ok");
  });
});

describe("looksLikeEmail", () => {
  it("refuse une adresse sans domaine complet", () => {
    expect(looksLikeEmail("camille@exemple")).toBe(false);
  });

  it("accepte une adresse ordinaire", () => {
    expect(looksLikeEmail(" camille@exemple.fr ")).toBe(true);
  });
});

describe("formatCountdown", () => {
  it("écrit minutes et secondes", () => {
    expect(formatCountdown(41.2)).toBe("0:42");
  });
});
