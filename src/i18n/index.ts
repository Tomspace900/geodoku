import { en } from "./locales/en";
import { fr } from "./locales/fr";
import type { Locale, TKey } from "./types";

const LOCALES = { fr, en } as const;

type TranslationCatalogs = Record<Locale, Record<string, unknown>>;

export function createTranslator(catalogs: TranslationCatalogs) {
  function translateFromCatalogs(
    locale: Locale,
    key: string,
    vars?: Record<string, string | number>,
  ): string {
    const parts = key.split(".");
    let current: unknown = catalogs[locale];
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        if (locale !== "en") return translateFromCatalogs("en", key, vars);
        return key;
      }
    }
    if (typeof current !== "string") return key;
    if (!vars) return current;
    return current.replace(/\{(\w+)\}/g, (_, name) =>
      String(vars[name] ?? `{${name}}`),
    );
  }

  return translateFromCatalogs;
}

const translateFromCatalogs = createTranslator(LOCALES);

export function translate(
  locale: Locale,
  key: TKey,
  vars?: Record<string, string | number>,
): string {
  return translateFromCatalogs(locale, key, vars);
}

export type { Locale, TKey };
