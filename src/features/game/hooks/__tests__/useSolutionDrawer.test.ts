import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSolutionDrawer } from "../useSolutionDrawer";

const capture = vi.fn();
vi.mock("@posthog/react", () => ({ usePostHog: () => ({ capture }) }));

function render(visible: boolean) {
  return renderHook(
    ({ visible }: { visible: boolean }) =>
      useSolutionDrawer({ gridDate: "2026-10-23", mode: "daily", visible }),
    { initialProps: { visible } },
  );
}

function screenLeftCalls() {
  return capture.mock.calls.filter(([name]) => name === "solution_screen_left");
}

describe("useSolutionDrawer — visite de la grille solution", () => {
  beforeEach(() => {
    capture.mockClear();
  });

  it("émet la visite avec les ouvertures quand la grille quitte l'écran", () => {
    const hook = render(true);
    act(() => hook.result.current.openCell({ row: 0, col: 0 }, 3));
    act(() => hook.result.current.openConstraint("continent_asia"));
    hook.rerender({ visible: false });
    expect(screenLeftCalls()[0][1]).toMatchObject({
      leave_reason: "left",
      cells_opened: 1,
      constraints_opened: 1,
    });
  });

  it("n'émet rien tant que la grille n'a pas été affichée", () => {
    const hook = render(false);
    hook.unmount();
    expect(screenLeftCalls()).toHaveLength(0);
  });
});
