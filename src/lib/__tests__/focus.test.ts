import { afterEach, describe, expect, it } from "vitest";
import { focusWithoutVisibleRing } from "@/lib/focus";

describe("focusWithoutVisibleRing", () => {
  afterEach(() => document.body.replaceChildren());

  it("focuses a connected element with a silent marker", () => {
    const button = document.createElement("button");
    document.body.append(button);

    focusWithoutVisibleRing(button);

    expect([
      document.activeElement,
      button.getAttribute("data-silent-focus"),
    ]).toEqual([button, "true"]);
  });

  it("removes the marker when focus leaves", () => {
    const button = document.createElement("button");
    const next = document.createElement("button");
    document.body.append(button, next);
    focusWithoutVisibleRing(button);

    next.focus();

    expect(button.getAttribute("data-silent-focus")).toBeNull();
  });
});
