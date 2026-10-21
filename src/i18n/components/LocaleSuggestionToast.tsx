import { usePostHog } from "@posthog/react";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { translate } from "@/i18n";
import { useLocale } from "@/i18n/LocaleContext";
import { suggestedLocale } from "@/i18n/localePath";
import type { Locale, TKey } from "@/i18n/types";

/**
 * Suggestion d'une autre langue (#140), sur le modèle du toast de source des
 * contraintes. Affichée sur une page localisée quand la langue du joueur (son
 * choix, sinon son navigateur) en diffère (`suggestedLocale`) — typiquement en
 * arrivant par un lien direct. Rédigée dans la langue qu'elle propose : elle
 * s'adresse à quelqu'un qui ne lit peut-être pas celle de la page.
 *
 * Elle reste jusqu'à un choix, mémorisé dans les deux cas : accepter rejoint la
 * même page dans la langue proposée, la croix garde celle de la page. Au
 * premier passage, la modale « Comment jouer ? » est ouverte : le toast passe
 * au-dessus (`z-[60]`) et arrête la propagation de `pointerdown`, pour qu'un
 * clic ne ferme pas la modale.
 */
export function LocaleSuggestionToast() {
  const posthog = usePostHog();
  const { pathname } = useLocation();
  const { locale, storedLocale, setLocale } = useLocale();
  const [suggestion, setSuggestion] = useState<Locale | null>(null);
  const reportedRef = useRef(false);

  // Évalué après le montage : le pré-rendu ne connaît ni le navigateur ni la
  // langue mémorisée.
  useEffect(() => {
    setSuggestion(
      suggestedLocale({
        pathname,
        storedLocale,
        languages: navigator.languages ?? [],
      }),
    );
  }, [pathname, storedLocale]);

  useEffect(() => {
    if (suggestion === null || reportedRef.current) return;
    reportedRef.current = true;
    posthog?.capture("locale_suggestion_shown", {
      from: locale,
      to: suggestion,
    });
  }, [suggestion, locale, posthog]);

  if (suggestion === null) return null;
  const target = suggestion;
  const text = (key: TKey) => translate(target, key);

  function accept() {
    posthog?.capture("locale_changed", {
      from: locale,
      to: target,
      source: "suggestion",
    });
    setLocale(target);
  }

  function dismiss() {
    posthog?.capture("locale_suggestion_dismissed", {
      from: locale,
      to: target,
    });
    setLocale(locale);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        role="status"
        aria-live="polite"
        lang={target}
        onPointerDown={(event) => event.stopPropagation()}
        className="pointer-events-auto w-full max-w-sm rounded-xl bg-surface-lowest p-3 shadow-editorial"
      >
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="font-sans text-xs font-semibold text-on-surface">
              {text("localeSuggestion.title")}
            </p>
            <p className="font-sans text-xs text-on-surface-variant">
              {text("localeSuggestion.body")}
            </p>
          </div>
          <Button
            type="button"
            size="auto"
            onClick={accept}
            className="shrink-0 px-2.5 py-1.5 text-xs"
          >
            {text("localeSuggestion.accept")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={dismiss}
            aria-label={text("localeSuggestion.dismiss")}
            className="shrink-0 p-1 text-on-surface-variant hover:text-on-surface"
          >
            <X size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
