import { todayUTC } from "@/lib/dates";
import { useEffect } from "react";

/**
 * Recharge la page quand le jour UTC a changé depuis le chargement, au retour
 * sur l'onglet. Sans ça, un onglet laissé ouvert la nuit reçoit la grille du
 * nouveau jour via la query réactive Convex tout en exécutant l'ancien bundle
 * JS (le reload récupère le code à jour, au moment naturel : on recommence une
 * partie). Best-effort de fraîcheur — la tolérance backend reste le plancher.
 */
export function useDailyReload() {
  useEffect(() => {
    const loadedDay = todayUTC();
    function checkRollover() {
      if (document.visibilityState === "visible" && todayUTC() !== loadedDay) {
        window.location.reload();
      }
    }
    document.addEventListener("visibilitychange", checkRollover);
    window.addEventListener("focus", checkRollover);
    return () => {
      document.removeEventListener("visibilitychange", checkRollover);
      window.removeEventListener("focus", checkRollover);
    };
  }, []);
}
