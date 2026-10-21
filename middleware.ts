import {
  localeFromCookie,
  localizePath,
  parseAcceptLanguage,
  preferredLocale,
} from "./src/i18n/localePath";

/**
 * Middleware de routage Vercel (#140) : les adresses sans langue (`/`,
 * `/about`, `/archive/…`) mènent à la même page dans la langue du visiteur,
 * avant tout affichage. Le choix du joueur (cookie), sinon `Accept-Language`,
 * sinon l'anglais (`preferredLocale`).
 *
 * Redirection temporaire : la cible dépend du visiteur, elle ne doit être mise
 * en cache ni par le navigateur ni par un intermédiaire. Googlebot, qui
 * n'envoie pas de langue, part vers l'anglais et découvre les autres versions
 * par les `hreflang` : ces adresses sont les `x-default` de leurs pages.
 *
 * Le matcher doit rester un littéral (lu statiquement par Vercel) et ne lister
 * que des chemins sans langue : `/fr/…` et `/en/…` ne passent jamais ici.
 */
export const config = {
  matcher: ["/", "/about", "/privacy", "/changelog", "/archive/:path*"],
};

export default function middleware(
  request: Pick<Request, "url" | "headers">,
): Response {
  const url = new URL(request.url);
  const locale = preferredLocale({
    storedLocale: localeFromCookie(request.headers.get("cookie")),
    languages: parseAcceptLanguage(request.headers.get("accept-language")),
  });
  url.pathname = localizePath(url.pathname, locale);

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      "Cache-Control": "private, no-store",
      Vary: "Accept-Language, Cookie",
    },
  });
}
