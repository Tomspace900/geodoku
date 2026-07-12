import { AccentBar } from "@/components/editorial/AccentBar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { usePostHog } from "@posthog/react";
import { Gem, Grid3x3, Heart, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import { useState } from "react";
import { RarityLegend } from "./RarityLegend";

// Trois parts du score, mêmes icônes que « Comment jouer » (même sémantique).
const PARTS: {
  icon: LucideIcon;
  titleKey: TKey;
  bodyKey: TKey;
  BodyComponent?: ComponentType<{ className?: string }>;
}[] = [
  { icon: Grid3x3, titleKey: "scoring.gridTitle", bodyKey: "scoring.gridBody" },
  { icon: Heart, titleKey: "scoring.livesTitle", bodyKey: "scoring.livesBody" },
  {
    icon: Gem,
    titleKey: "scoring.rarityTitle",
    bodyKey: "scoring.rarityBody",
    BodyComponent: (props) => <RarityLegend variant="points" {...props} />,
  },
];

/**
 * Icône « Info » + popup expliquant le score (grille + rareté + vies) et la
 * légende de rareté. Rendue à côté du score sur l'écran de résultat. Partage la
 * structure du « Comment jouer » (`HowToPlayLink`) : liste à pastilles d'icônes.
 */
export function ScoreInfoDialog() {
  const t = useT();
  const posthog = usePostHog();
  const [open, setOpen] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen)
      posthog?.capture("scoring_info_opened", { source: "result_screen" });
    setOpen(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => handleOpenChange(true)}
        aria-label={t("scoring.title")}
        className="h-7 w-7 shrink-0 text-on-surface-variant hover:text-on-surface"
      >
        <Info size={16} strokeWidth={1.75} />
      </Button>

      <DialogContent className="max-w-sm">
        <DialogHeader className="items-start space-y-0 text-left sm:text-left">
          <DialogTitle className="font-serif text-2xl font-medium italic tracking-normal text-on-surface leading-none">
            {t("scoring.title")}
          </DialogTitle>
          <AccentBar className="mt-3" />
        </DialogHeader>

        <div className="space-y-4">
          <p className="font-sans text-sm text-on-surface-variant leading-relaxed">
            {t("scoring.intro")}
          </p>

          <ol className="space-y-4">
            {PARTS.map(({ icon: Icon, titleKey, bodyKey, BodyComponent }) => (
              <li key={titleKey} className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                  <Icon size={17} strokeWidth={2} />
                </span>
                <div className="space-y-0.5 pt-0.5">
                  <p className="font-sans text-sm font-semibold text-on-surface leading-snug">
                    {t(titleKey)}
                  </p>
                  <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
                    {t(bodyKey)}
                  </p>
                  {BodyComponent && <BodyComponent className="pt-2" />}
                </div>
              </li>
            ))}
          </ol>

          <p className="font-sans text-xs italic text-on-surface-variant">
            {t("ui.rarityEvolvesHint")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
