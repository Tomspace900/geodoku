/**
 * Point d'entrée unique du stockage navigateur.
 *
 * Tout accès à `localStorage`/`sessionStorage` passe par ici : un catalogue de
 * clés (namespace `geodoku:*` homogène) et des wrappers `safe*` qui absorbent
 * les exceptions (mode privé strict Safari, quota plein). Aucun call site ne
 * doit relire ces API directement — cela garantit un espace de noms cohérent et
 * une gestion d'erreur unique.
 */

/** Catalogue des clés persistées. Une seule source de vérité pour l'espace `geodoku:*`. */
export const STORAGE_KEYS = {
  /** Identifiant anonyme par navigateur (clé de rate-limit). localStorage. */
  clientId: "geodoku:client-id",
  /**
   * Ancienne clé v2, retirée du parcours à la sortie du rollout v3. Conservée
   * uniquement pour la purger (`clearPersistedGame`) : plus rien n'y écrit ni
   * n'y lit de partie.
   */
  game: "geodoku:game",
  /** Partie canonique minimale v3 : seul format écrit et lu. */
  gameV3: "geodoku:game-v3",
  /** Parties d'entraînement (grilles passées), une entrée par date. localStorage. */
  training: "geodoku:training-v1",
  /** Affichage du panneau « Comment jouer ». localStorage. */
  howToPlay: "geodoku:how-to-play",
  /** Langue choisie (`fr`/`en`). localStorage. */
  locale: "geodoku:locale",
  /** CTA sondage déjà cliqué/fermé. localStorage. */
  surveyDone: "geodoku:survey-done",
  /** Clés opaques des opérations Convex en attente d'acquittement. localStorage. */
  pendingOperations: "geodoku:pending-operations",
  /** Token admin — éphémère, sessionStorage. */
  adminToken: "geodoku:admin-token",
} as const;

export type StorageArea = "local" | "session";

function area(kind: StorageArea): Storage | null {
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    // Storage inaccessible (mode privé strict, sandbox) → pas de persistance.
    return null;
  }
}

export function safeGet(
  key: string,
  kind: StorageArea = "local",
): string | null {
  try {
    return area(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function safeSet(
  key: string,
  value: string,
  kind: StorageArea = "local",
): boolean {
  try {
    const storage = area(kind);
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    // Quota plein ou storage désactivé → no-op, l'app continue sans persistance.
    return false;
  }
}

export function safeRemove(key: string, kind: StorageArea = "local"): void {
  try {
    area(kind)?.removeItem(key);
  } catch {
    // Même politique que safeSet : storage indisponible → no-op.
  }
}

// La migration one-shot des clés historiques (namespace `geodoku.*` → `geodoku:*`,
// repli des flags par-date, renommage du token admin) a été retirée le
// 2026-08-11, cinq semaines après son déploiement. Un navigateur qui n'a pas
// rouvert le site depuis repart donc sur les valeurs par défaut : langue et
// « ne plus afficher » à re-choisir une fois, `clientId` régénéré (simple
// nouveau seau de rate-limit). La partie, elle, n'était de toute façon plus
// récupérable — la garde de date écarte tout ce qui n'est pas du jour.
//
// Seul reliquat assumé : `isSurveyDone` sait encore lire le flag brut « 1 »
// (cf. `survey.ts`), ce qui ne coûte qu'une ligne et évite d'afficher le CTA à
// un joueur qui l'avait déjà écarté.
