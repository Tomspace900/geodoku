import { usePostHog } from "@posthog/react";
import { useEffect, useRef } from "react";

export type StatsDetail = "day" | "themes";

type StatsVisit = {
  startedAt: number;
  daysOpened: number;
  themesOpened: number;
};

function startVisit(): StatsVisit {
  return { startedAt: performance.now(), daysOpened: 0, themesOpened: 0 };
}

/**
 * Mesure de « Mes stats » (#155) : `stats_page_viewed` une fois par arrivée,
 * dès que l'on sait si le joueur est connecté, et `stats_page_left` à chaque
 * fin de visite, avec sa durée et les tiroirs ouverts. Même modèle que
 * `solution_screen_left` : un onglet masqué clôt la visite, le retour en
 * ouvre une nouvelle (sur mobile, on passe à une autre app plus qu'on ne
 * ferme l'onglet). `signed_in` est l'état à la sortie : un joueur qui crée
 * son compte pendant la visite sort connecté.
 */
export function useStatsVisit(status: "loading" | "signedIn" | "anonymous") {
  const posthog = usePostHog();
  const visitRef = useRef<StatsVisit | null>(null);
  const viewedRef = useRef(false);
  const signedInRef = useRef(false);
  signedInRef.current = status === "signedIn";

  // biome-ignore lint/correctness/useExhaustiveDependencies: posthog is a stable ref
  useEffect(() => {
    if (status === "loading" || viewedRef.current) return;
    viewedRef.current = true;
    posthog?.capture("stats_page_viewed", {
      signed_in: status === "signedIn",
    });
  }, [status]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: posthog is a stable ref
  useEffect(() => {
    visitRef.current = startVisit();

    function leave(reason: "hidden" | "left") {
      const visit = visitRef.current;
      if (!visit) return;
      visitRef.current = null;
      posthog?.capture(
        "stats_page_left",
        {
          signed_in: signedInRef.current,
          leave_reason: reason,
          duration_ms: Math.round(performance.now() - visit.startedAt),
          days_opened: visit.daysOpened,
          themes_opened: visit.themesOpened,
        },
        // La page peut se fermer juste après : la balise survit au déchargement.
        { transport: "sendBeacon" },
      );
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") leave("hidden");
      else if (!visitRef.current) visitRef.current = startVisit();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      leave("left");
    };
  }, []);

  /** Un tiroir ouvert : `stats_detail_opened`, compté dans la visite. */
  function detailOpened(detail: StatsDetail): void {
    posthog?.capture("stats_detail_opened", { detail });
    const visit = visitRef.current;
    if (!visit) return;
    if (detail === "day") visit.daysOpened += 1;
    else visit.themesOpened += 1;
  }

  return { detailOpened };
}
