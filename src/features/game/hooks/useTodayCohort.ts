import { useConvex } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Cohort } from "../logic/cohort";

/**
 * « Toi et les autres » du jour, lu à la demande et non en direct : une fois
 * la partie finie, de nouveau quand ses derniers coups sont arrivés au
 * serveur (`refreshKey`), puis à chaque retour sur l'onglet. Un abonnement réactif
 * recalculerait la cohorte à chaque partie finie par n'importe qui.
 * `undefined` tant que rien n'est arrivé, `null` sans grille du jour.
 */
export function useTodayCohort(
  enabled: boolean,
  refreshKey: unknown,
): Cohort | null | undefined {
  const convex = useConvex();
  const [cohort, setCohort] = useState<Cohort | null | undefined>(undefined);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey only triggers a reload
  useEffect(() => {
    if (!enabled) return;
    let active = true;

    function load() {
      convex
        .query(api.games.getTodayCohort, {})
        .then((next) => {
          if (active) setCohort(next);
        })
        // Hors ligne : on garde la dernière lecture, la suivante réessaiera.
        .catch(() => {});
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") load();
    }

    load();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, convex, refreshKey]);

  return cohort;
}
