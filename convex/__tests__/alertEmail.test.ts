import { describe, expect, it } from "vitest";
import { buildMissingGridEmail, buildReportEmail } from "../lib/alertEmail";

const CELL_REPORT = {
  category: "content" as const,
  target: {
    kind: "cell" as const,
    rowLabel: "Asie",
    colLabel: "Enclavé",
    dateLabel: "14 novembre",
    mode: "daily" as const,
  },
  locale: "fr" as const,
  message: "Le Bhoutan devrait compter ici.",
  adminUrl: "https://www.geodoku.app/admin",
};

describe("buildReportEmail", () => {
  it("dit la case et la date dans l'objet", () => {
    expect(buildReportEmail(CELL_REPORT).subject).toBe(
      "Signalement · Asie × Enclavé · 14 novembre",
    );
  });

  it("dit la nature et la page d'un signalement général", () => {
    expect(
      buildReportEmail({
        ...CELL_REPORT,
        category: "bug",
        target: { kind: "general", page: "/stats" },
      }).subject,
    ).toBe("Signalement · Bug ou autre · /stats");
  });

  it("échappe le texte du joueur", () => {
    expect(
      buildReportEmail({ ...CELL_REPORT, message: "<script>x</script>" }).html,
    ).toContain("&lt;script&gt;x&lt;/script&gt;");
  });

  it("garde le texte tel quel dans la version texte", () => {
    expect(
      buildReportEmail({ ...CELL_REPORT, message: "a <b>\nligne 2" }).text,
    ).toContain("a <b>\nligne 2");
  });

  it("rappelle qu'on ne peut pas répondre", () => {
    expect(buildReportEmail(CELL_REPORT).text).toContain(
      "impossible de répondre au joueur",
    );
  });
});

describe("buildMissingGridEmail", () => {
  it("nomme la grille de demain dans l'objet", () => {
    expect(
      buildMissingGridEmail({
        which: "tomorrow",
        dateLabel: "18 novembre",
        adminUrl: null,
      }).subject,
    ).toBe("Grille de demain absente (18 novembre)");
  });
});
