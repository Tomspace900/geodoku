import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGuessModalAnalytics } from "../useGuessModalAnalytics";

const capture = vi.fn();
vi.mock("@posthog/react", () => ({ usePostHog: () => ({ capture }) }));

type Props = { query: string; resultCount: number };

function render(initial: Props) {
  return renderHook(
    ({ query, resultCount }: Props) =>
      useGuessModalAnalytics({
        gridDate: "2026-10-23",
        mode: "daily",
        cellKey: "0,0",
        query,
        searchable: query.length >= 3,
        resultCount,
      }),
    { initialProps: initial },
  );
}

function lastProps(): Record<string, unknown> {
  return capture.mock.calls.at(-1)?.[1];
}

describe("useGuessModalAnalytics", () => {
  beforeEach(() => {
    capture.mockClear();
  });

  it("compte chaque frappe du joueur", () => {
    const hook = render({ query: "", resultCount: 0 });
    hook.rerender({ query: "f", resultCount: 0 });
    hook.rerender({ query: "fr", resultCount: 0 });
    act(() => hook.result.current.recordClose("dismissed", 2));
    expect(lastProps().query_edits).toBe(2);
  });

  it("ne compte pas le vidage du champ après un essai raté", () => {
    const hook = render({ query: "", resultCount: 0 });
    hook.rerender({ query: "fra", resultCount: 3 });
    hook.rerender({ query: "", resultCount: 0 });
    act(() => hook.result.current.recordClose("dismissed", 0));
    expect(lastProps().query_edits).toBe(1);
  });

  it("retient une recherche restée sans résultat", () => {
    const hook = render({ query: "", resultCount: 0 });
    hook.rerender({ query: "zzq", resultCount: 0 });
    hook.rerender({ query: "fra", resultCount: 3 });
    act(() => hook.result.current.recordClose("found", 3));
    expect(lastProps().no_results_seen).toBe(true);
  });

  it("ne signale pas de recherche vide sous trois lettres", () => {
    const hook = render({ query: "", resultCount: 0 });
    hook.rerender({ query: "zz", resultCount: 0 });
    act(() => hook.result.current.recordClose("dismissed", 2));
    expect(lastProps().no_results_seen).toBe(false);
  });

  it("compte les essais ratés de l'ouverture", () => {
    const hook = render({ query: "", resultCount: 0 });
    act(() => hook.result.current.recordFailedAttempt());
    act(() => hook.result.current.recordFailedAttempt());
    act(() => hook.result.current.recordClose("game_over", 0));
    expect(lastProps()).toMatchObject({
      outcome: "game_over",
      failed_attempts: 2,
    });
  });

  it("n'émet qu'une fois par ouverture", () => {
    const hook = render({ query: "", resultCount: 0 });
    act(() => hook.result.current.recordClose("found", 0));
    act(() => hook.result.current.recordClose("dismissed", 0));
    expect(capture).toHaveBeenCalledTimes(1);
  });
});
