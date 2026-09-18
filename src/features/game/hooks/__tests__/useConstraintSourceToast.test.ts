import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSTRAINT_SOURCE_TOAST_MS } from "@/features/game/logic/constants";
import type { CellPosition } from "@/features/game/types";
import { useConstraintSourceToast } from "../useConstraintSourceToast";

const PARAMS: {
  gridDate: string;
  mode: "daily" | "training";
  selectedCell: CellPosition | null;
} = { gridDate: "2026-09-16", mode: "daily", selectedCell: null };

// Régression : `pause()` (survol, ou focus interne) suivi d'une fermeture par la
// croix laissait `pausedRef` à `true` — aucun toast suivant ne se refermait plus
// jamais seul, puisque `scheduleClose` sortait immédiatement à chaque changement
// de cible. `onHeaderClick()`/`close()` doivent réarmer le minuteur.
describe("useConstraintSourceToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("un toast ouvert après pause + fermeture explicite se referme seul", () => {
    const { result } = renderHook(() => useConstraintSourceToast(PARAMS));

    act(() => result.current.onHeaderClick("continent_africa"));
    act(() => result.current.pause());
    act(() => result.current.close());
    act(() => result.current.onHeaderClick("continent_asia"));

    act(() => vi.advanceTimersByTime(CONSTRAINT_SOURCE_TOAST_MS));

    expect(result.current.active).toBeNull();
  });

  it("le minuteur suspendu par pause() ne ferme pas le toast", () => {
    const { result } = renderHook(() => useConstraintSourceToast(PARAMS));

    act(() => result.current.onHeaderClick("continent_africa"));
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(CONSTRAINT_SOURCE_TOAST_MS));

    expect(result.current.active).not.toBeNull();
  });

  it("resume() relance le minuteur jusqu'à la fermeture", () => {
    const { result } = renderHook(() => useConstraintSourceToast(PARAMS));

    act(() => result.current.onHeaderClick("continent_africa"));
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(CONSTRAINT_SOURCE_TOAST_MS));
    act(() => result.current.resume());

    expect(result.current.active).not.toBeNull();

    act(() => vi.advanceTimersByTime(CONSTRAINT_SOURCE_TOAST_MS));

    expect(result.current.active).toBeNull();
  });

  it("l'ouverture de la modale de saisie (selectedCell) ferme le toast", () => {
    const { result, rerender } = renderHook(
      (props) => useConstraintSourceToast(props),
      { initialProps: PARAMS },
    );

    act(() => result.current.onHeaderClick("continent_africa"));
    expect(result.current.active).not.toBeNull();

    rerender({ ...PARAMS, selectedCell: { row: 0, col: 0 } });

    expect(result.current.active).toBeNull();
  });
});
