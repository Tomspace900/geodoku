import { describe, expect, it } from "vitest";
import { isSurveyDone, serializeSurveyDone } from "../survey";

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
