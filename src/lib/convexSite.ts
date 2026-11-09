/**
 * Adresse HTTP du déploiement Convex (`.convex.site`), où vivent les routes
 * de Better Auth (#155). Déduite de `VITE_CONVEX_URL` (`.convex.cloud`) : la
 * commande de build Vercel ne pose que celle-ci.
 */
export function convexSiteUrl(cloudUrl: string): string {
  return cloudUrl.replace(/\.convex\.cloud\/?$/, ".convex.site");
}

/**
 * Google renvoie le joueur sur le site (`<site>/api/auth/callback/google`,
 * `redirectURI` de `convex/auth.ts`), pas sur Convex : Google n'accepte que
 * des adresses de retour sur un domaine qu'on possède. La page relaie aussitôt
 * vers la même route chez Convex, avec la même requête (`state`, `code`).
 */
export const GOOGLE_CALLBACK_PATH = "/api/auth/callback/google";

export function oauthCallbackRelay(
  location: Pick<Location, "pathname" | "search">,
  cloudUrl: string,
): string | null {
  if (location.pathname !== GOOGLE_CALLBACK_PATH) return null;
  return `${convexSiteUrl(cloudUrl)}${location.pathname}${location.search}`;
}
