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
  imageAlt: string;
  alternates: readonly PageAlternate[];
  /** Données structurées schema.org (JSON-LD), sur l'accueil seulement. */
  structuredData: Readonly<Record<string, unknown>> | null;
}>;

function isPrerenderedPage(path: string): path is PrerenderedPage {
  return (PRERENDERED_PAGES as readonly string[]).includes(path);
}

function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}

const OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

/**
 * Le site et le jeu décrits pour les moteurs (schema.org), dans la langue de
 * la page. Seul l'accueil les porte : les répéter sur chaque page ne dit rien
 * de plus, et l'`url` du jeu y est le canonical de l'accueil, pas la racine
 * qui redirige.
 */
function homeStructuredData(locale: Locale, canonical: string) {
  const t = (key: TKey) => translate(locale, key);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        name: "Geodoku",
        alternateName: ["geodoku.app"],
        url: `${SITE_ORIGIN}/`,
        inLanguage: [...LOCALES],
      },
      {
        "@type": "VideoGame",
        "@id": `${SITE_ORIGIN}/#game`,
        name: "Geodoku",
        url: canonical,
        description: t("seo.gameDescription"),
        image: OG_IMAGE,
        inLanguage: locale,
        genre: [
          "Puzzle",
          t("seo.gameGenreGeography"),
          t("seo.gameGenreEducational"),
        ],
        gamePlatform: t("seo.gamePlatform"),
        playMode: "SinglePlayer",
        applicationCategory: "GameApplication",
        operatingSystem: t("seo.gameOperatingSystem"),
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
        },
      },
    ],
  };
}

/** Chaque page pré-rendue, dans chaque langue : `/fr`, `/en`, `/fr/privacy`, `/en/privacy`… */
export function prerenderedPaths(): string[] {
  return PRERENDERED_PAGES.flatMap((page) =>
    LOCALES.map((locale) => localizePath(page, locale)),
  );
}

/**
 * Métadonnées d'une page (#140) : titre, description, canonical propre à la
 * page, versions linguistiques (`hreflang`) et, pour l'accueil, données
 * structurées. Le `x-default` est la racine,
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
    imageAlt: translate(locale, "seo.imageAlt"),
    alternates: [
      ...LOCALES.map((l) => ({ hreflang: l, href: urls[l] })),
      { hreflang: "x-default", href: absoluteUrl(page) },
    ],
    structuredData:
      page === "/" ? homeStructuredData(locale, urls[locale]) : null,
  };
}
