import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "../storage";
import {
  isSurveyDone,
  MAX_SURVEY_DISMISSALS,
  markSurveyClicked,
  markSurveyDismissed,
  SURVEY_ID,
  serializeSurveyDone,
  subscribeSurveyDone,
} from "../survey";

beforeEach(() => {
  localStorage.clear();
});

function storedDone(today: string): boolean {
  return isSurveyDone(localStorage.getItem(STORAGE_KEYS.surveyDone), today);
}

describe("isSurveyDone", () => {
  it("is not done when nothing is stored", () => {
    expect(isSurveyDone(null, "2026-10-10")).toBe(false);
  });

  it("is done forever after a click", () => {
    const raw = serializeSurveyDone({ surveyId: SURVEY_ID, kind: "clicked" });
    expect(isSurveyDone(raw, "2026-10-10")).toBe(true);
    expect(isSurveyDone(raw, "2027-01-01")).toBe(true);
  });

  it("is done only for the dismiss day below the dismissal cap", () => {
    const raw = serializeSurveyDone({
      surveyId: SURVEY_ID,
      kind: "dismissed",
      date: "2026-10-10",
      count: 1,
    });
    expect(isSurveyDone(raw, "2026-10-10")).toBe(true);
    expect(isSurveyDone(raw, "2026-10-11")).toBe(false);
  });

  it("is done for good once the dismissal cap is reached", () => {
    const raw = serializeSurveyDone({
      surveyId: SURVEY_ID,
      kind: "dismissed",
      date: "2026-10-10",
      count: MAX_SURVEY_DISMISSALS,
    });
    expect(isSurveyDone(raw, "2026-10-11")).toBe(true);
  });

  it("ignores a click on a previous survey", () => {
    const raw = serializeSurveyDone({ surveyId: "previous", kind: "clicked" });
    expect(isSurveyDone(raw, "2026-10-10")).toBe(false);
  });

  it("ignores the formats written before survey ids existed", () => {
    expect(isSurveyDone('{"kind":"clicked"}', "2026-10-10")).toBe(false);
    expect(isSurveyDone("1", "2026-10-10")).toBe(false);
  });

  it("is not done on corrupted JSON", () => {
    expect(isSurveyDone("{not json", "2026-10-10")).toBe(false);
  });
});

describe("survey interaction store", () => {
  it("notifies mounted consumers immediately after a click", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSurveyDone(listener);

    markSurveyClicked();

    expect(listener).toHaveBeenCalledOnce();
    expect(storedDone("2026-10-10")).toBe(true);
    unsubscribe();
  });

  it("notifies consumers when the banner is dismissed for today", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSurveyDone(listener);

    markSurveyDismissed("2026-10-10");

    expect(listener).toHaveBeenCalledOnce();
    expect(storedDone("2026-10-10")).toBe(true);
    expect(storedDone("2026-10-11")).toBe(false);
    unsubscribe();
  });

  it("stops the banner after the last allowed dismissal", () => {
    ["2026-10-10", "2026-10-11", "2026-10-12"].forEach(markSurveyDismissed);

    expect(storedDone("2026-10-13")).toBe(true);
  });

  it("counts two dismissals on the same day once", () => {
    ["2026-10-10", "2026-10-10", "2026-10-11"].forEach(markSurveyDismissed);

    expect(storedDone("2026-10-12")).toBe(false);
  });

  it("restarts the dismissal count for a new survey", () => {
    localStorage.setItem(
      STORAGE_KEYS.surveyDone,
      serializeSurveyDone({
        surveyId: "previous",
        kind: "dismissed",
        date: "2026-07-14",
        count: 2,
      }),
    );

    markSurveyDismissed("2026-10-10");

    expect(storedDone("2026-10-11")).toBe(false);
  });
});
