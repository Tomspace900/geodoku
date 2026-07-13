import { useEffect, useRef, useState } from "react";
import {
  ANIMATION_TIMING,
  countAt,
  mechanicalEase,
} from "../logic/scoreAnimation";

// Pilote l'animation du score de fin (cf. `ScoreDisplay`). Le nombre central est
// un total cumulatif qui grimpe en 3 tranches successives — grille, puis rareté,
// puis vies — chaque tranche entraînant son arc. Façon « compteur mécanique »
// (cf. `mechanicalEase`). La rareté charge de façon asynchrone : on lance la
// grille tout de suite et, si la rareté n'est pas prête à la fin de la grille,
// on gèle sur le sous-total grille jusqu'à sa résolution. `done` bascule à vrai
// une fois la séquence terminée (déclenche le sursaut final côté composant).

type Input = {
  gridValue: number;
  /** `null` tant que la distribution (donc la rareté) charge. */
  rarityValue: number | null;
  livesValue: number;
  /** `breakdown.shares !== null` : la rareté est résolue. */
  ready: boolean;
};

type Frame = {
  displayTotal: number;
  gridProgress: number;
  rarityProgress: number;
  livesProgress: number;
};

type ScoreAnimation = Frame & {
  /** Total final figé (aria-label stable). `null` tant que la rareté charge. */
  finalTotal: number | null;
  /** Vrai une fois la séquence animée terminée (jamais sous reduced-motion). */
  done: boolean;
};

type Phase = "grid" | "hold" | "rarity" | "lives" | "done";

const ZERO_FRAME: Frame = {
  displayTotal: 0,
  gridProgress: 0,
  rarityProgress: 0,
  livesProgress: 0,
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useScoreAnimation(input: Input): ScoreAnimation {
  const { gridValue, rarityValue, livesValue, ready } = input;

  // Dernières valeurs lues par la boucle rAF (montée une seule fois).
  const inputRef = useRef(input);
  inputRef.current = input;

  const [reduced] = useState(prefersReducedMotion);
  const [frame, setFrame] = useState<Frame>(ZERO_FRAME);
  const [done, setDone] = useState(false);

  const phaseRef = useRef<Phase>("grid");
  const phaseStartRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: séquence jouée une seule fois au montage ; les valeurs async sont lues via inputRef.
  useEffect(() => {
    if (reduced) return;

    const startPhase = (phase: Phase, now: number) => {
      phaseRef.current = phase;
      phaseStartRef.current = now;
    };

    const tick = (now: number) => {
      const inp = inputRef.current;
      const rarity = inp.rarityValue ?? 0;
      const elapsed = now - phaseStartRef.current;

      switch (phaseRef.current) {
        case "grid": {
          const dur = ANIMATION_TIMING.grid;
          if (inp.gridValue <= 0) {
            // Grille à 0 : révélée (progress 1) même vide, pour que sa pastille
            // s'allume au lieu de rester grisée (l'arc, lui, reste nul).
            setFrame({
              displayTotal: 0,
              gridProgress: 1,
              rarityProgress: 0,
              livesProgress: 0,
            });
            startPhase(inp.ready ? "rarity" : "hold", now);
          } else if (elapsed < dur) {
            const p = mechanicalEase(elapsed / dur);
            setFrame({
              displayTotal: countAt(0, inp.gridValue, p),
              gridProgress: p,
              rarityProgress: 0,
              livesProgress: 0,
            });
          } else {
            setFrame({
              displayTotal: inp.gridValue,
              gridProgress: 1,
              rarityProgress: 0,
              livesProgress: 0,
            });
            if (elapsed >= dur + ANIMATION_TIMING.pause) {
              startPhase(inp.ready ? "rarity" : "hold", now);
            }
          }
          break;
        }
        case "hold": {
          // Grille terminée (révélée), rareté pas encore chargée : sous-total gelé.
          setFrame({
            displayTotal: inp.gridValue,
            gridProgress: 1,
            rarityProgress: 0,
            livesProgress: 0,
          });
          if (inp.ready) startPhase("rarity", now);
          break;
        }
        case "rarity": {
          const dur = ANIMATION_TIMING.rarity;
          if (rarity <= 0) {
            // Rareté à 0 (que du commun) : révélée quand même → pastille active
            // (l'arc reste nul, sa longueur est 0).
            setFrame({
              displayTotal: inp.gridValue,
              gridProgress: 1,
              rarityProgress: 1,
              livesProgress: 0,
            });
            startPhase("lives", now);
          } else if (elapsed < dur) {
            const p = mechanicalEase(elapsed / dur);
            setFrame({
              displayTotal: countAt(inp.gridValue, inp.gridValue + rarity, p),
              gridProgress: 1,
              rarityProgress: p,
              livesProgress: 0,
            });
          } else {
            setFrame({
              displayTotal: inp.gridValue + rarity,
              gridProgress: 1,
              rarityProgress: 1,
              livesProgress: 0,
            });
            if (elapsed >= dur + ANIMATION_TIMING.pause)
              startPhase("lives", now);
          }
          break;
        }
        case "lives": {
          const dur = ANIMATION_TIMING.lives;
          const base = inp.gridValue + rarity;
          if (inp.livesValue <= 0) {
            setFrame({
              displayTotal: base,
              gridProgress: 1,
              rarityProgress: 1,
              livesProgress: 1,
            });
            phaseRef.current = "done";
          } else if (elapsed < dur) {
            const p = mechanicalEase(elapsed / dur);
            setFrame({
              displayTotal: countAt(base, base + inp.livesValue, p),
              gridProgress: 1,
              rarityProgress: 1,
              livesProgress: p,
            });
          } else {
            setFrame({
              displayTotal: base + inp.livesValue,
              gridProgress: 1,
              rarityProgress: 1,
              livesProgress: 1,
            });
            phaseRef.current = "done";
          }
          break;
        }
        case "done":
          break;
      }

      if (phaseRef.current === "done") {
        setDone(true);
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame((now) => {
      phaseStartRef.current = now;
      tick(now);
    });

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const finalTotal = ready ? gridValue + (rarityValue ?? 0) + livesValue : null;

  // Reduced motion : pas d'animation. On snappe aux valeurs finales dès qu'elles
  // sont connues, en gelant sur le sous-total grille tant que la rareté charge.
  // `done` reste faux : aucune séquence animée n'a joué, donc pas de sursaut.
  if (reduced) {
    if (ready) {
      // Tout est révélé : pastilles actives même à 0 (arcs nuls si valeur nulle).
      return {
        displayTotal: finalTotal ?? 0,
        gridProgress: 1,
        rarityProgress: 1,
        livesProgress: 1,
        finalTotal,
        done: false,
      };
    }
    return {
      displayTotal: gridValue,
      gridProgress: 1,
      rarityProgress: 0,
      livesProgress: 0,
      finalTotal: null,
      done: false,
    };
  }

  return { ...frame, finalTotal, done };
}
