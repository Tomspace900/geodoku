import { useEffect } from "react";
import { STORAGE_KEYS, safeGet, safeSet } from "@/lib/storage";

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
// par l'un de ces <script>, donc ils sont déjà dans le DOM ici. Le pré-rendu
// importe ce module sous Node, sans `document` : l'empreinte y reste vide et le
// hook, qui ne tourne que dans un effet, n'est jamais exécuté.
const LOADED_FINGERPRINT =
  typeof document === "undefined" ? "" : moduleScriptFingerprint(document);

/**
 * Deux rechargements sur chunk périmé à moins d'une minute : ce n'est plus un
 * déploiement mais le réseau, et l'erreur doit remonter au lieu de boucler.
 */
const CHUNK_RELOAD_COOLDOWN_MS = 60_000;

/**
 * Filet du cas que la vérification au focus ne couvre pas : le joueur navigue
 * vers une page lazy (archive, admin) avant d'avoir quitté l'onglet, et l'ancien
 * bundle réclame un chunk qu'un déploiement a supprimé. Vite émet alors
 * `vite:preloadError` ; on recharge une fois, sur le nouveau bundle.
 */
function reloadOnStaleChunk(event: Event) {
  const lastReload = Number(safeGet(STORAGE_KEYS.chunkReload, "session"));
  if (Date.now() - lastReload < CHUNK_RELOAD_COOLDOWN_MS) return;
  // Sans stockage, impossible de borner les rechargements : on n'en tente aucun.
  if (!safeSet(STORAGE_KEYS.chunkReload, String(Date.now()), "session")) {
    return;
  }
  event.preventDefault();
  window.location.reload();
}

export function useFreshBundle() {
  useEffect(() => {
    window.addEventListener("vite:preloadError", reloadOnStaleChunk);
    return () => {
      window.removeEventListener("vite:preloadError", reloadOnStaleChunk);
    };
  }, []);

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
