import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStatsVisit } from "../useStatsVisit";

const capture = vi.fn();
vi.mock("@posthog/react", () => ({ usePostHog: () => ({ capture }) }));

type Status = "loading" | "signedIn" | "anonymous";

function render(status: Status) {
  return renderHook(({ status }: { status: Status }) => useStatsVisit(status), {
    initialProps: { status },
  });
}

function calls(name: string) {
  return capture.mock.calls.filter(([event]) => event === name);
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useStatsVisit — mesure de « Mes stats »", () => {
  beforeEach(() => {
    capture.mockClear();
    setVisibility("visible");
    capture.mockClear();
  });

  it("n'émet l'arrivée qu'une fois le compte connu", () => {
    const hook = render("loading");
    hook.rerender({ status: "signedIn" });
    expect(calls("stats_page_viewed")).toEqual([
      ["stats_page_viewed", { signed_in: true }],
    ]);
  });

  it("n'émet pas une seconde arrivée quand le joueur se connecte sur la page", () => {
    const hook = render("anonymous");
    hook.rerender({ status: "signedIn" });
    expect(calls("stats_page_viewed")).toHaveLength(1);
  });

  it("émet la visite avec les tiroirs ouverts quand le joueur quitte la page", () => {
    const hook = render("anonymous");
    act(() => hook.result.current.detailOpened("day"));
    act(() => hook.result.current.detailOpened("themes"));
    hook.unmount();
    expect(calls("stats_page_left")[0][1]).toMatchObject({
      signed_in: false,
      leave_reason: "left",
      days_opened: 1,
      themes_opened: 1,
    });
  });

  it("clôt la visite à l'onglet masqué et en ouvre une nouvelle au retour", () => {
    const hook = render("signedIn");
    act(() => setVisibility("hidden"));
    act(() => setVisibility("visible"));
    hook.unmount();
    expect(
      calls("stats_page_left").map(([, props]) => props.leave_reason),
    ).toEqual(["hidden", "left"]);
  });
});
