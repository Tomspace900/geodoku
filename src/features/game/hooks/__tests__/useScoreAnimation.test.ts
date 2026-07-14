import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScoreAnimation } from "../useScoreAnimation";

// La séquence est pilotée par requestAnimationFrame : on le stub pour flusher les
// frames à la main, amener l'animation jusqu'à `done`, puis vérifier que le total
// central suit une mise à jour LIVE de la rareté (query Convex réactive) — le bug
// où la légende « +336 » se réactualisait mais le total central restait figé.
describe("useScoreAnimation — total live après la révélation", () => {
  let frames: FrameRequestCallback[] = [];
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    frames = [];
    // Pas de reduced-motion : on veut le chemin animé (celui qui gelait le total).
    window.matchMedia = (() =>
      ({
        matches: false,
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.unstubAllGlobals();
  });

  const flush = (now: number) => {
    const cb = frames.shift();
    if (cb) act(() => cb(now));
  };

  it("réactualise le total central quand la rareté change après la révélation", () => {
    const { result, rerender } = renderHook(
      (props) => useScoreAnimation(props),
      {
        initialProps: {
          gridValue: 450,
          rarityValue: 341,
          livesValue: 100,
          ready: true,
        },
      },
    );

    // Déroule les 4 tranches (grille → rareté → vies → done) : sauts de temps qui
    // dépassent chaque durée + pause.
    flush(0);
    flush(5000);
    flush(10000);
    flush(15000);

    expect(result.current.done).toBe(true);
    expect(result.current.displayTotal).toBe(891); // 450 + 341 + 100

    // 5 joueurs simulés pendant l'affichage → la rareté baisse (341 → 336).
    rerender({
      gridValue: 450,
      rarityValue: 336,
      livesValue: 100,
      ready: true,
    });

    // Le total central DOIT suivre, pas rester figé sur la dernière frame animée.
    expect(result.current.displayTotal).toBe(886); // 450 + 336 + 100
    expect(result.current.finalTotal).toBe(886);
  });
});
