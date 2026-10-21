import { STORAGE_KEYS, safeGet, safeRemove } from "@/lib/storage";
import {
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  localeFromCookie,
} from "./localePath";
import type { Locale } from "./types";

/**
 * Le choix de langue vit dans un cookie, et non en localStorage : le middleware
 * de `/` doit le lire avant tout affichage (#140). Cookie de préférence, posé
 * seulement quand le joueur choisit, exempté de consentement.
 */
export function storeLocale(locale: Locale): void {
  try {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    // biome-ignore lint/suspicious/noDocumentCookie: one-line preference cookie, no Cookie Store API on Safari < 18.4
    document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  } catch {
    // Cookies bloqués : le choix vaut pour la session en cours seulement.
  }
}

/**
 * Langue choisie par le joueur, `null` s'il n'a jamais choisi. Un choix fait
 * avant #140 dort encore en localStorage : il est recopié une fois dans le
 * cookie, puis effacé.
 */
export function readStoredLocale(): Locale | null {
  if (typeof document === "undefined") return null;
  const fromCookie = localeFromCookie(document.cookie);
  if (fromCookie !== null) return fromCookie;

  const legacy = safeGet(STORAGE_KEYS.locale);
  if (!isLocale(legacy)) return null;
  storeLocale(legacy);
  safeRemove(STORAGE_KEYS.locale);
  return legacy;
}
