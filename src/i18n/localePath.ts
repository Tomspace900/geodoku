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

/**
 * Langue du pays d'où le visiteur se connecte, posée par le middleware pour la
 * session. Ne contient que la langue (`fr`), jamais le pays ni l'adresse IP.
 */
export const COUNTRY_LOCALE_COOKIE = "geodoku_country_locale";

/**
 * Pays à langue dominante claire, parmi les langues proposées (codes ISO
 * 3166-1 alpha-2, tels que `x-vercel-ip-country`). Un pays plurilingue
 * (Belgique, Suisse, Canada, Luxembourg) ne suggère rien : on se tromperait
 * pour une bonne partie de ses habitants.
 */
const COUNTRY_LOCALES: Readonly<Record<string, Locale>> = {
  // France, ses outre-mer à code propre, Monaco.
  FR: "fr",
  GP: "fr",
  MQ: "fr",
  GF: "fr",
  RE: "fr",
  YT: "fr",
  PM: "fr",
  BL: "fr",
  MF: "fr",
  WF: "fr",
  PF: "fr",
  NC: "fr",
  MC: "fr",
  US: "en",
  GB: "en",
  IE: "en",
  AU: "en",
  NZ: "en",
};

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

/** Langue choisie par le joueur, lue dans un en-tête `Cookie` (ou `document.cookie`). */
export function localeFromCookie(cookie: string | null): Locale | null {
  const value = cookieValue(cookie, LOCALE_COOKIE);
  return isLocale(value) ? value : null;
}

/** Langue du pays de connexion, posée par le middleware pour la session. */
export function countryLocaleFromCookie(cookie: string | null): Locale | null {
  const value = cookieValue(cookie, COUNTRY_LOCALE_COOKIE);
  return isLocale(value) ? value : null;
}

/** Langue dominante d'un pays (`FR` → `fr`), `null` hors de la liste. */
export function countryLocale(country: string | null): Locale | null {
  return country ? (COUNTRY_LOCALES[country.toUpperCase()] ?? null) : null;
}

/** Valeur d'un cookie dans un en-tête `Cookie` (ou `document.cookie`). */
function cookieValue(cookie: string | null, name: string): string | undefined {
  return cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
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

type SuggestionContext = PreferenceContext & {
  pathname: string;
  countryLocale: Locale | null;
};

export type LocaleSuggestion = Readonly<{
  locale: Locale;
  /** Ce qui motive la suggestion : le choix du joueur, son pays ou son navigateur. */
  basis: "choice" | "country" | "browser";
}>;

/**
 * Langue à suggérer sur une page localisée, quand la page est dans une autre :
 * le choix du joueur, sinon la langue de son pays, sinon celle de son
 * navigateur. Le pays passe avant le navigateur : un téléphone réglé en
 * anglais à Bordeaux arrive sur `/en` (la redirection suit le navigateur) et
 * se voit proposer le français ; un Français sur un lien `/fr` n'a rien à
 * corriger. Un lien direct affiche toujours la page demandée : on suggère, on
 * ne redirige pas.
 */
export function suggestedLocale({
  pathname,
  storedLocale,
  countryLocale,
  languages,
}: SuggestionContext): LocaleSuggestion | null {
  const pageLocale = localeFromPath(pathname);
  if (pageLocale === null) return null;
  const browser = browserLocale(languages);
  const suggestion: LocaleSuggestion | null =
    storedLocale !== null
      ? { locale: storedLocale, basis: "choice" }
      : countryLocale !== null
        ? { locale: countryLocale, basis: "country" }
        : browser !== null
          ? { locale: browser, basis: "browser" }
          : null;
  return suggestion?.locale === pageLocale ? null : suggestion;
}
