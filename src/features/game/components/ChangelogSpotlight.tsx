import { ArrowRight, X } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { Link } from "react-router";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { Button } from "@/components/ui/button";
import type { AnnouncementCloseAction } from "@/features/game/hooks/useChangelogAnnouncement";
import type {
  ChangelogEntry,
  ChangelogSpotlightTarget,
} from "@/features/legal/logic/changelog";
import { useLocale, useT } from "@/i18n/LocaleContext";

export type ChangelogSpotlightState = {
  entry: ChangelogEntry;
  onDismiss: (action: AnnouncementCloseAction) => void;
};

type Props = {
  target: ChangelogSpotlightTarget;
  spotlight: ChangelogSpotlightState | null;
  /** Le bouton mis en avant. À lui de se signaler et d'appeler `onDismiss("target")` au clic. */
  children: ReactNode;
};

/**
 * Annonce d'une nouveauté majeure en jeu : voile sur la page, bouton cible
 * au-dessus, bulle ancrée sous lui. N'affiche que `children` quand l'annonce en
 * cours vise une autre cible ou qu'il n'y en a pas.
 */
export function ChangelogSpotlight({ target, spotlight, children }: Props) {
  const { localizedPath } = useLocale();
  const t = useT();
  const announcement =
    spotlight?.entry.announcement?.target === target
      ? spotlight.entry.announcement
      : null;
  const onDismiss = spotlight?.onDismiss;

  useEffect(() => {
    if (!announcement || !onDismiss) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss?.("dismiss");
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [announcement, onDismiss]);

  if (!announcement || !spotlight) {
    return <div className="relative">{children}</div>;
  }

  return (
    <>
      <div
        aria-hidden="true"
        onClick={() => spotlight.onDismiss("dismiss")}
        className="fixed inset-0 z-40 bg-on-surface/40 backdrop-blur-[2px]"
      />
      <div className="relative z-50">
        {children}
        <div
          role="dialog"
          aria-label={t(spotlight.entry.title)}
          className="absolute right-0 top-12 z-50 w-72 rounded-xl bg-surface-lowest p-4 shadow-editorial sm:w-80"
        >
          <span
            aria-hidden="true"
            className="absolute -top-1.5 right-3 size-3 rotate-45 bg-surface-lowest"
          />
          <div className="relative flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <Eyebrow
                  as="p"
                  className="font-semibold tabular-nums text-brand"
                >
                  {t("changelog.spotlight.badge", {
                    version: spotlight.entry.version,
                  })}
                </Eyebrow>
                <p className="font-sans text-xs leading-relaxed text-on-surface">
                  {t(announcement.text)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={() => spotlight.onDismiss("dismiss")}
                aria-label={t("ui.closeDialog")}
                className="shrink-0 p-1 text-on-surface-variant hover:text-on-surface"
              >
                <X className="size-3.5" aria-hidden="true" />
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <Button
                type="button"
                variant="link"
                size="auto"
                onClick={() => spotlight.onDismiss("dismiss")}
                className="text-xs text-on-surface-variant"
              >
                {t("changelog.spotlight.later")}
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link
                  to={localizedPath(announcement.ctaPath)}
                  onClick={() => spotlight.onDismiss("cta")}
                >
                  {t(announcement.ctaLabel)}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
