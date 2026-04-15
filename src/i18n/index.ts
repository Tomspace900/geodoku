import { en } from "./locales/en";
import { fr } from "./locales/fr";
import type { Locale, TKey } from "./types";

const LOCALES = { fr, en } as const;

export function translate(
  locale: Locale,
  key: TKey,
  vars?: Record<string, string | number>,
): string {
  const parts = key.split(".");
  let current: unknown = LOCALES[locale];
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      // Fallback: if the key is missing in the requested locale, try EN
      if (locale !== "en") return translate("en", key, vars);
      return key; // Last resort: display the raw key
    }
  }
  if (typeof current !== "string") return key;
  if (!vars) return current;
  return current.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export type { Locale, TKey };
