/**
 * État de navigation vers « Mes stats » qui y ouvre la création de compte :
 * le bouton « Créer un compte » de l'annonce en jeu y mène. Passé en `state`
 * et non dans l'URL, pour qu'un rechargement ou un retour ne rouvre rien.
 */
export const OPEN_ACCOUNT_STATE = { openAccount: "spotlight" } as const;

export function wantsAccountDialog(state: unknown): boolean {
  return (
    typeof state === "object" &&
    state !== null &&
    "openAccount" in state &&
    state.openAccount === OPEN_ACCOUNT_STATE.openAccount
  );
}
