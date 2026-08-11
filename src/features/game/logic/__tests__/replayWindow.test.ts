import { describe, expect, it } from "vitest";
import {
  classifyReplayDate,
  isReplayableDate,
  REPLAY_WINDOW_DAYS,
} from "../replayWindow";

const TODAY = "2026-07-25";

describe("classifyReplayDate — refus des dates futures", () => {
  // Refus critique : servir une date future livrerait la grille de demain
  // avec ses réponses valides.
  it("refuse demain", () => {
    expect(classifyReplayDate("2026-07-26", TODAY)).toBe("future");
  });

  it("refuse une date lointaine dans le futur", () => {
    expect(classifyReplayDate("2027-01-01", TODAY)).toBe("future");
  });

  it("refuse aujourd'hui : la grille du jour se joue sur /", () => {
    expect(classifyReplayDate(TODAY, TODAY)).toBe("future");
  });
});

describe("classifyReplayDate — bornes de la fenêtre", () => {
  it("accepte hier", () => {
    expect(classifyReplayDate("2026-07-24", TODAY)).toBe("ok");
  });

  it("accepte la borne basse J-7", () => {
    expect(classifyReplayDate("2026-07-18", TODAY)).toBe("ok");
  });

  it("refuse J-8, juste hors fenêtre", () => {
    expect(classifyReplayDate("2026-07-17", TODAY)).toBe("too_old");
  });

  it("garde la fenêtre alignée sur la constante", () => {
    expect(REPLAY_WINDOW_DAYS).toBe(7);
  });

  it("traverse correctement un changement de mois", () => {
    expect(classifyReplayDate("2026-06-30", "2026-07-02")).toBe("ok");
    expect(classifyReplayDate("2026-06-24", "2026-07-02")).toBe("too_old");
  });
});

describe("classifyReplayDate — dates mal formées", () => {
  it.each(["2026-7-1", "nope", "", "2026-07-32", "20260701"])(
    "rejette %o",
    (input) => {
      expect(classifyReplayDate(input, TODAY)).toBe("malformed");
    },
  );

  it("rejette aussi un `today` non canonique", () => {
    expect(classifyReplayDate("2026-07-24", "not-a-date")).toBe("malformed");
  });
});

describe("isReplayableDate", () => {
  it("n'est vrai que pour le verdict ok", () => {
    expect(isReplayableDate("2026-07-24", TODAY)).toBe(true);
    expect(isReplayableDate("2026-07-26", TODAY)).toBe(false);
    expect(isReplayableDate("2026-07-17", TODAY)).toBe(false);
  });
});
