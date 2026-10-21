import type { Locale } from "./types";

/**
 * La langue vient de l'URL (#140), et toutes les langues sont au même niveau :
 * `/fr/…`, `/en/…`. La racine `/` n'a pas de langue : c'est la page
 * `x-default`, que le middleware Vercel (`middleware.ts`) redirige vers la
 * langue du visiteur. Ajouter une langue = l'ajouter à `LOCALES` et traduire.
 *
 * Module pur, importé aussi par le middleware : rien du navigateur ici.
 */
export const LOCALES = ["fr", "en"] as const satisfies readonly Locale[];

/** Langue d'un visiteur dont le navigateur n'annonce aucune langue proposée. */
export const FALLBACK_LOCALE: Locale = "en";

/** Choix explicite du joueur, lu par le middleware avant tout affichage. */
export const LOCALE_COOKIE = "geodoku_locale";

/** Un an : le choix d'une langue ne se périme pas. */
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** L'admin n'a qu'une version : jamais préfixée, jamais redirigée. */
function isUnlocalized(barePath: string): boolean {
  return barePath === "/admin" || barePath.startsWith("/admin/");
}

export function isLocale(value: unknown): value is Locale {
  return (LOCALES as readonly unknown[]).includes(value);
}

/** Langue portée par un chemin (`/en/privacy` → `en`), `null` hors préfixe (`/`, `/admin`). */
export function localeFromPath(pathname: string): Locale | null {
  const segment = pathname.split("/")[1];
  return isLocale(segment) ? segment : null;
}

/** Chemin sans préfixe de langue : `/en/privacy` → `/privacy`, `/fr` → `/`. */
export function stripLocale(pathname: string): string {
  const locale = localeFromPath(pathname);
  if (locale === null) return pathname;
  return pathname.slice(locale.length + 1) || "/";
}

/** Le même chemin dans la langue demandée. Les routes non localisées restent telles quelles. */
export function localizePath(pathname: string, locale: Locale): string {
  const bare = stripLocale(pathname);
  if (isUnlocalized(bare)) return bare;
  return bare === "/" ? `/${locale}` : `/${locale}${bare}`;
}

/**
 * Langues d'un en-tête `Accept-Language`, de la plus à la moins préférée
 * (`fr-CH, fr;q=0.9, en;q=0.8` → `["fr-CH", "fr", "en"]`). Les langues à
 * `q=0` sont refusées par le navigateur : écartées.
 */
export function parseAcceptLanguage(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="));
      const weight = q === undefined ? 1 : Number(q.slice(2));
      return { tag: tag.trim(), weight, index };
    })
    .filter(({ tag, weight }) => tag !== "" && tag !== "*" && weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
    .map(({ tag }) => tag);
}

/** Première langue proposée parmi celles du navigateur (`en-GB` → `en`), `null` sinon. */
export function browserLocale(languages: readonly string[]): Locale | null {
  const match = languages
    .map((language) => language.toLowerCase().split("-")[0])
    .find(isLocale);
  return match ?? null;
}

/** Valeur du cookie de langue dans un en-tête `Cookie` (ou `document.cookie`). */
export function localeFromCookie(cookie: string | null): Locale | null {
  if (!cookie) return null;
  const value = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1);
  return isLocale(value) ? value : null;
}

type PreferenceContext = {
  storedLocale: Locale | null;
  languages: readonly string[];
};

/** Langue d'un visiteur : son choix, sinon celle de son navigateur, sinon l'anglais. */
export function preferredLocale({
  storedLocale,
  languages,
}: PreferenceContext): Locale {
  return storedLocale ?? browserLocale(languages) ?? FALLBACK_LOCALE;
}

type SuggestionContext = PreferenceContext & { pathname: string };

/**
 * Langue à suggérer sur une page localisée : celle du joueur (son choix, sinon
 * son navigateur) quand la page est dans une autre. Un lien direct affiche
 * toujours la page demandée : on suggère, on ne redirige pas. Sans langue
 * reconnue, rien à suggérer.
 */
export function suggestedLocale({
  pathname,
  storedLocale,
  languages,
}: SuggestionContext): Locale | null {
  const pageLocale = localeFromPath(pathname);
  const wanted = storedLocale ?? browserLocale(languages);
  if (pageLocale === null || wanted === null || wanted === pageLocale) {
    return null;
  }
  return wanted;
}
