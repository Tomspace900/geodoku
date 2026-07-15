import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "../storage";
import {
  isSurveyDone,
  markSurveyClicked,
  markSurveyDismissed,
  serializeSurveyDone,
  subscribeSurveyDone,
} from "../survey";

beforeEach(() => {
  localStorage.clear();
});

describe("isSurveyDone", () => {
  it("is not done when nothing is stored", () => {
    expect(isSurveyDone(null, "2026-07-03")).toBe(false);
  });

  it("is done forever after a click", () => {
    const raw = serializeSurveyDone({ kind: "clicked" });
    expect(isSurveyDone(raw, "2026-07-03")).toBe(true);
    expect(isSurveyDone(raw, "2026-07-04")).toBe(true);
  });

  it("is done only for the dismiss day", () => {
    const raw = serializeSurveyDone({ kind: "dismissed", date: "2026-07-03" });
    expect(isSurveyDone(raw, "2026-07-03")).toBe(true);
    expect(isSurveyDone(raw, "2026-07-04")).toBe(false);
  });

  it("treats the legacy flat flag as a dismiss for the migration day", () => {
    expect(isSurveyDone("1", "2026-07-03")).toBe(true);
    expect(isSurveyDone("1", "2026-07-04")).toBe(false);
  });

  it("is not done on corrupted JSON", () => {
    expect(isSurveyDone("{not json", "2026-07-03")).toBe(false);
  });
});

describe("survey interaction store", () => {
  it("notifies mounted consumers immediately after a click", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSurveyDone(listener);

    markSurveyClicked();

    expect(listener).toHaveBeenCalledOnce();
    expect(
      isSurveyDone(localStorage.getItem(STORAGE_KEYS.surveyDone), "2026-07-14"),
    ).toBe(true);
    unsubscribe();
  });

  it("notifies consumers when the banner is dismissed for today", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSurveyDone(listener);

    markSurveyDismissed("2026-07-14");

    expect(listener).toHaveBeenCalledOnce();
    expect(
      isSurveyDone(localStorage.getItem(STORAGE_KEYS.surveyDone), "2026-07-14"),
    ).toBe(true);
    expect(
      isSurveyDone(localStorage.getItem(STORAGE_KEYS.surveyDone), "2026-07-15"),
    ).toBe(false);
    unsubscribe();
  });
});
