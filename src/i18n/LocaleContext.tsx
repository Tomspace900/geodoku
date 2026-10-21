import posthog from "posthog-js";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router";
import { translate } from "./index";
import { readStoredLocale, storeLocale } from "./localeCookie";
import { FALLBACK_LOCALE, localeFromPath, localizePath } from "./localePath";
import type { Locale, TKey, Translate } from "./types";

type LocaleContextValue = {
  locale: Locale;
  /** Langue déjà choisie par le joueur, `null` s'il n'a jamais choisi. */
  storedLocale: Locale | null;
  /** Mémorise la langue et rejoint la même page dans cette langue. */
  setLocale: (l: Locale) => void;
  /** Le chemin donné, dans la langue courante (`/privacy` → `/en/privacy`). */
  localizedPath: (path: string) => string;
  t: Translate;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * La langue vient de l'URL (#140) : `/fr/…`, `/en/…`. La racine `/` est
 * redirigée vers la langue du visiteur par le middleware Vercel, avant tout
 * affichage ; le navigateur ne sert plus ici qu'à suggérer une autre langue
 * (`LocaleSuggestionToast`). L'admin, non localisée, suit la langue choisie.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [storedLocale, setStoredLocale] = useState<Locale | null>(() =>
    readStoredLocale(),
  );
  const locale =
    localeFromPath(location.pathname) ?? storedLocale ?? FALLBACK_LOCALE;

  const setLocale = useCallback(
    (next: Locale) => {
      storeLocale(next);
      setStoredLocale(next);
      const target = localizePath(location.pathname, next);
      if (target !== location.pathname) {
        navigate({
          pathname: target,
          search: location.search,
          hash: location.hash,
        });
      }
    },
    [location.pathname, location.search, location.hash, navigate],
  );

  const localizedPath = useCallback(
    (path: string) => localizePath(path, locale),
    [locale],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    // Porte la langue active sur tous les events PostHog (super-property) :
    // permet de connaître la répartition FR/EN de l'audience, pas seulement
    // les bascules de langue (event locale_changed).
    posthog.register({ locale });
  }, [locale]);

  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale],
  );

  return (
    <LocaleContext.Provider
      value={{ locale, storedLocale, setLocale, localizedPath, t }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}

export function useT() {
  return useLocale().t;
}
