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
   * uniquement pour la purger (`clearPersistedGame`) et pour la migration des
   * clés historiques : plus rien n'y écrit ni n'y lit de partie.
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

/** Anciennes clés → nouvelles, pour la migration one-shot au boot (localStorage). */
const LEGACY_RENAMES: ReadonlyArray<[string, string]> = [
  ["geodoku.clientId", STORAGE_KEYS.clientId],
  ["geodoku.showHowToPlay", STORAGE_KEYS.howToPlay],
  ["geodoku.locale", STORAGE_KEYS.locale],
  ["geodoku:surveyDone", STORAGE_KEYS.surveyDone],
];

const LEGACY_GAME_KEY = "geodoku.currentGame";
const LEGACY_ENDED_PREFIX = "geodoku:ended:";
const LEGACY_RATED_PREFIX = "geodoku:rated:";
export const LEGACY_SURVEY_DISMISSED_DATE = "2026-07-03";
const LEGACY_SURVEY_DONE_VALUE = "1";
const LEGACY_SURVEY_DISMISSED_VALUE = JSON.stringify({
  kind: "dismissed",
  date: LEGACY_SURVEY_DISMISSED_DATE,
});

/**
 * Migre la partie persistée de l'ancien format (clé `geodoku.currentGame`,
 * `version: 1`) vers le nouveau (clé `geodoku:game`, `version: 2`) en repliant
 * les flags par-date `geodoku:ended:<date>` / `geodoku:rated:<date>` dans
 * l'objet. Sans ce repli, une partie terminée verrait `recordGameEnd`
 * ré-émis après déploiement (double comptage).
 */
function migrateGame(ls: Storage): void {
  const legacy = ls.getItem(LEGACY_GAME_KEY);
  if (legacy === null) return;
  try {
    const parsed = JSON.parse(legacy);
    if (parsed?.version === 1 && typeof parsed.date === "string") {
      parsed.endRecorded =
        ls.getItem(`${LEGACY_ENDED_PREFIX}${parsed.date}`) === "1";
      parsed.rated = ls.getItem(`${LEGACY_RATED_PREFIX}${parsed.date}`) === "1";
      parsed.version = 2;
      ls.setItem(STORAGE_KEYS.game, JSON.stringify(parsed));
    }
    // Autres versions : on déplace tel quel ; loadPersistedGame tranchera.
    else if (ls.getItem(STORAGE_KEYS.game) === null) {
      ls.setItem(STORAGE_KEYS.game, legacy);
    }
  } catch {
    // JSON corrompu → on abandonne la migration de cette partie (sera ignorée).
  }
  ls.removeItem(LEGACY_GAME_KEY);
}

function migrateSurveyDone(ls: Storage): void {
  if (ls.getItem(STORAGE_KEYS.surveyDone) === LEGACY_SURVEY_DONE_VALUE) {
    ls.setItem(STORAGE_KEYS.surveyDone, LEGACY_SURVEY_DISMISSED_VALUE);
  }
}

/**
 * Migration one-shot exécutée une fois au démarrage, avant tout rendu React :
 * renomme les clés historiques vers le namespace `geodoku:*` et purge les flags
 * par-date désormais repliés dans la partie persistée. Idempotente : ne fait
 * rien si les anciennes clés sont absentes.
 */
export function migrateLegacyStorage(): void {
  try {
    const ls = window.localStorage;

    LEGACY_RENAMES.forEach(([oldKey, newKey]) => {
      const val = ls.getItem(oldKey);
      if (val === null) return;
      if (ls.getItem(newKey) === null) ls.setItem(newKey, val);
      ls.removeItem(oldKey);
    });

    migrateSurveyDone(ls);
    migrateGame(ls);

    // Purge des flags par-date (repliés dans `geodoku:game`) — croissance non bornée.
    // Snapshot des clés avant suppression pour ne pas muter en cours d'itération.
    Object.keys(ls).forEach((k) => {
      if (
        k.startsWith(LEGACY_ENDED_PREFIX) ||
        k.startsWith(LEGACY_RATED_PREFIX)
      ) {
        ls.removeItem(k);
      }
    });
  } catch {
    // Storage indisponible → rien à migrer.
  }

  // Token admin (sessionStorage) : renommage séparé.
  try {
    const ss = window.sessionStorage;
    const legacyToken = ss.getItem("geodoku_admin_token");
    if (legacyToken !== null) {
      if (ss.getItem(STORAGE_KEYS.adminToken) === null) {
        ss.setItem(STORAGE_KEYS.adminToken, legacyToken);
      }
      ss.removeItem("geodoku_admin_token");
    }
  } catch {
    // idem
  }
}
