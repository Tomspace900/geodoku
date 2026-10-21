import { translate } from "@/i18n";
import {
  FALLBACK_LOCALE,
  LOCALES,
  localeFromPath,
  localizePath,
  stripLocale,
} from "@/i18n/localePath";
import type { Locale, TKey } from "@/i18n/types";

export const SITE_ORIGIN = "https://www.geodoku.app";

/** Pages publiques pré-rendues au build (#139), chemin sans langue. */
export const PRERENDERED_PAGES = [
  "/",
  "/about",
  "/privacy",
  "/changelog",
] as const;

type PrerenderedPage = (typeof PRERENDERED_PAGES)[number];

const PAGE_TEXT: Record<
  PrerenderedPage,
  { titleKey: TKey; descriptionKey: TKey }
> = {
  "/": { titleKey: "seo.homeTitle", descriptionKey: "seo.homeDescription" },
  "/about": {
    titleKey: "seo.aboutTitle",
    descriptionKey: "seo.aboutDescription",
  },
  "/privacy": {
    titleKey: "seo.privacyTitle",
    descriptionKey: "seo.privacyDescription",
  },
  "/changelog": {
    titleKey: "seo.changelogTitle",
    descriptionKey: "seo.changelogDescription",
  },
};

const OG_LOCALE: Record<Locale, string> = { fr: "fr_FR", en: "en_US" };

export type PageAlternate = Readonly<{ hreflang: string; href: string }>;

export type PageMeta = Readonly<{
  locale: Locale;
  title: string;
  description: string;
  canonical: string;
  ogLocale: string;
  ogLocaleAlternate: string;
  alternates: readonly PageAlternate[];
}>;

function isPrerenderedPage(path: string): path is PrerenderedPage {
  return (PRERENDERED_PAGES as readonly string[]).includes(path);
}

function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}

/** Chaque page pré-rendue, dans chaque langue : `/fr`, `/en`, `/fr/privacy`, `/en/privacy`… */
export function prerenderedPaths(): string[] {
  return PRERENDERED_PAGES.flatMap((page) =>
    LOCALES.map((locale) => localizePath(page, locale)),
  );
}

/**
 * Métadonnées d'une page (#140) : titre, description, canonical propre à la
 * page et versions linguistiques (`hreflang`). Le `x-default` est la racine,
 * que le middleware redirige vers la langue du visiteur : aucune langue n'est
 * la version « par défaut ». Un chemin hors des pages pré-rendues reprend les
 * métadonnées de l'accueil.
 */
export function pageMeta(pathname: string): PageMeta {
  const locale = localeFromPath(pathname) ?? FALLBACK_LOCALE;
  const bare = stripLocale(pathname);
  const page = isPrerenderedPage(bare) ? bare : "/";
  const text = PAGE_TEXT[page];
  const urls = Object.fromEntries(
    LOCALES.map((l) => [l, absoluteUrl(localizePath(page, l))]),
  ) as Record<Locale, string>;
  const otherLocale = LOCALES.find((l) => l !== locale) ?? FALLBACK_LOCALE;

  return {
    locale,
    title: translate(locale, text.titleKey),
    description: translate(locale, text.descriptionKey),
    canonical: urls[locale],
    ogLocale: OG_LOCALE[locale],
    ogLocaleAlternate: OG_LOCALE[otherLocale],
    alternates: [
      ...LOCALES.map((l) => ({ hreflang: l, href: urls[l] })),
      { hreflang: "x-default", href: absoluteUrl(page) },
    ],
  };
}
