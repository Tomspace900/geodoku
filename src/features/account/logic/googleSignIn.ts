import { STORAGE_KEYS, safeGet, safeRemove, safeSet } from "@/lib/storage";

/**
 * Connexion Google en cours (#155). Le retour de Google recharge la page :
 * sans cette marque, rien ne distinguerait une connexion qui vient d'aboutir
 * d'une session déjà ouverte, et un compte existant connecté par Google
 * n'apparaîtrait dans aucun event. Sert seulement à la mesure.
 */
export function markGoogleSignIn(): void {
  safeSet(STORAGE_KEYS.googleSignIn, "1", "session");
}

export function forgetGoogleSignIn(): void {
  safeRemove(STORAGE_KEYS.googleSignIn, "session");
}

/** Vrai une seule fois, au retour de Google ; la marque est consommée. */
export function takeGoogleSignIn(): boolean {
  const marked = safeGet(STORAGE_KEYS.googleSignIn, "session") !== null;
  if (marked) forgetGoogleSignIn();
  return marked;
}
