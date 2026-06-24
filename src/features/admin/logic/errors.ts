/** True si l'erreur Convex correspond à un token admin invalide (déconnexion). */
export function isUnauthorizedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("Unauthorized");
}
