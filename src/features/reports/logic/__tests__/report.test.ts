import { describe, expect, it } from "vitest";
import {
  cleanReportMessage,
  defaultReportCategory,
  formatReportGridDate,
  reportPage,
} from "../report";

describe("cleanReportMessage", () => {
  it("retire les caractères de contrôle", () => {
    expect(cleanReportMessage("a\u0000b\u0007c\u007Fd")).toBe("abcd");
  });

  it("garde les sauts de ligne et les tabulations", () => {
    expect(cleanReportMessage("a\n\tb")).toBe("a\n\tb");
  });

  it("retire les espaces autour", () => {
    expect(cleanReportMessage("  bonjour  ")).toBe("bonjour");
  });
});

describe("reportPage", () => {
  it("garde une page de l'app", () => {
    expect(reportPage("/archive/2026-11-14")).toBe("/archive/2026-11-14");
  });

  it("retire la barre finale", () => {
    expect(reportPage("/stats/")).toBe("/stats");
  });

  it("se rabat sur l'accueil pour un chemin inattendu", () => {
    expect(reportPage("/archive/%C3%A9t%C3%A9")).toBe("/");
  });
});

describe("defaultReportCategory", () => {
  it("présélectionne « Bug ou autre » sans case ni contrainte", () => {
    expect(defaultReportCategory({ kind: "general", page: "/" })).toBe("bug");
  });

  it("présélectionne « Réponse ou contrainte » depuis une case", () => {
    expect(
      defaultReportCategory({
        kind: "cell",
        date: "2026-11-14",
        mode: "daily",
        cellKey: "0,0",
      }),
    ).toBe("content");
  });
});

describe("formatReportGridDate", () => {
  it("écrit le jour et le mois en français", () => {
    expect(formatReportGridDate("2026-11-14", "fr")).toBe("14 novembre");
  });

  it("écrit le mois et le jour en anglais", () => {
    expect(formatReportGridDate("2026-11-14", "en")).toBe("November 14");
  });
});
