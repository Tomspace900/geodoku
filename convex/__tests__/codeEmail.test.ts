import { describe, expect, it } from "vitest";
import { buildCodeEmail } from "../lib/codeEmail";

describe("buildCodeEmail", () => {
  it("met le code dans l'objet", () => {
    expect(
      buildCodeEmail({ otp: "481207", locale: "fr", purpose: "sign-in" })
        .subject,
    ).toBe("481207 est ton code Geodoku");
  });

  it("garde le même objet pour la suppression", () => {
    expect(
      buildCodeEmail({ otp: "481207", locale: "en", purpose: "delete-account" })
        .subject,
    ).toBe("481207 is your Geodoku code");
  });

  it("écrit le code d'un seul tenant dans la version texte", () => {
    expect(
      buildCodeEmail({ otp: "481207", locale: "fr", purpose: "sign-in" }).text,
    ).toContain("\n481207\n");
  });

  it("dit l'objet de la suppression dans le corps", () => {
    expect(
      buildCodeEmail({
        otp: "481207",
        locale: "fr",
        purpose: "delete-account",
      }).html,
    ).toContain("Ton code pour supprimer ton compte\u00A0:");
  });

  it("dit l'objet du changement d'adresse dans le corps", () => {
    expect(
      buildCodeEmail({ otp: "481207", locale: "en", purpose: "change-email" })
        .text,
    ).toContain("Your code to change your email address:");
  });

  it("ne coupe pas « e-mail » au trait d'union", () => {
    expect(
      buildCodeEmail({ otp: "481207", locale: "fr", purpose: "change-email" })
        .html,
    ).toContain('<span style="white-space:nowrap;">e-mail</span>\u00A0:');
  });

  it("garde le texte brut sans balise", () => {
    expect(
      buildCodeEmail({ otp: "481207", locale: "fr", purpose: "change-email" })
        .text,
    ).not.toContain("<span");
  });
});
