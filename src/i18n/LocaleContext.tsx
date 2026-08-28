import posthog from "posthog-js";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { STORAGE_KEYS, safeGet, safeSet } from "@/lib/storage";
import { translate } from "./index";
import type { Locale, TKey } from "./types";

const SUPPORTED: Locale[] = ["fr", "en"];

function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = safeGet(STORAGE_KEYS.locale);
  if (stored && SUPPORTED.includes(stored as Locale)) return stored as Locale;
  const nav = window.navigator.language?.toLowerCase() ?? "";
  if (nav.startsWith("fr")) return "fr";
  return "en";
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    safeSet(STORAGE_KEYS.locale, l);
    document.documentElement.lang = l;
  }, []);

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
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
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
