import { useEffect } from "react";

/**
 * Recharge la page quand un nouveau bundle a été déployé, au retour sur
 * l'onglet. Un onglet laissé ouvert ne re-fetch jamais `index.html` : il tourne
 * indéfiniment sur l'ancien code même après un déploiement (la query réactive
 * Convex met à jour les données, pas le JS). On compare les scripts de module
 * hashés de l'`index.html` distant à ceux chargés au démarrage ; s'ils diffèrent,
 * un nouveau build est en ligne → reload (la partie en cours est restaurée
 * depuis localStorage). Pas de service worker, pas de version.json, pas de
 * dépendance.
 */

/** Empreinte des entry-points hashés (`/assets/index-XXXX.js`) d'un document. */
function moduleScriptFingerprint(doc: Document): string {
  return Array.from(doc.querySelectorAll('script[type="module"][src]'))
    .map((script) => script.getAttribute("src") ?? "")
    .filter(Boolean)
    .sort()
    .join(",");
}

// Capturée une fois, au chargement : le module courant a forcément été chargé
// par l'un de ces <script>, donc ils sont déjà dans le DOM ici.
const LOADED_FINGERPRINT = moduleScriptFingerprint(document);

export function useFreshBundle() {
  useEffect(() => {
    let checking = false;
    async function checkForNewBundle() {
      if (document.visibilityState !== "visible" || checking) return;
      checking = true;
      try {
        const res = await fetch("/", { cache: "no-store" });
        if (!res.ok) return;
        const remote = new DOMParser().parseFromString(
          await res.text(),
          "text/html",
        );
        const remoteFingerprint = moduleScriptFingerprint(remote);
        // Empreinte vide = page d'erreur / portail captif → on ne reload pas.
        if (remoteFingerprint && remoteFingerprint !== LOADED_FINGERPRINT) {
          window.location.reload();
        }
      } catch {
        // Hors-ligne ou fetch bloqué → on retentera au prochain focus.
      } finally {
        checking = false;
      }
    }
    document.addEventListener("visibilitychange", checkForNewBundle);
    window.addEventListener("focus", checkForNewBundle);
    return () => {
      document.removeEventListener("visibilitychange", checkForNewBundle);
      window.removeEventListener("focus", checkForNewBundle);
    };
  }, []);
}
