import { usePostHog } from "@posthog/react";
import type { LucideIcon } from "lucide-react";
import { Gem, Grid3x3, Heart, Info } from "lucide-react";
import type { ComponentType } from "react";
import { useState } from "react";
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
import { RarityLegend } from "./RarityLegend";

type ScorePart = {
  icon: LucideIcon;
  titleKey: TKey;
  bodyKey: TKey;
  BodyComponent?: ComponentType<{ className?: string }>;
};

const GRID_PART: ScorePart = {
  icon: Grid3x3,
  titleKey: "scoring.gridTitle",
  bodyKey: "scoring.gridBody",
};
const LIVES_PART: ScorePart = {
  icon: Heart,
  titleKey: "scoring.livesTitle",
  bodyKey: "scoring.livesBody",
};
const RARITY_PART: ScorePart = {
  icon: Gem,
  titleKey: "scoring.rarityTitle",
  bodyKey: "scoring.rarityBody",
  BodyComponent: (props) => <RarityLegend variant="points" {...props} />,
};

/** Barème du jour : trois parts sur 1000. Entraînement : deux parts sur 900. */
const PARTS_BY_SCALE: Record<ScoreScale, ScorePart[]> = {
  daily: [GRID_PART, LIVES_PART, RARITY_PART],
  training: [GRID_PART, RARITY_PART],
};

export type ScoreScale = "daily" | "training";

type Props = {
  scale?: ScoreScale;
};

/**
 * Icône « Info » + popup expliquant le score et la légende de rareté. Rendue à
 * côté du score sur l'écran de résultat. Partage la structure du « Comment
 * jouer » (`HowToPlayLink`) : liste à pastilles d'icônes.
 */
export function ScoreInfoDialog({ scale = "daily" }: Props) {
  const t = useT();
  const posthog = usePostHog();
  const [open, setOpen] = useState(false);
  const isTraining = scale === "training";

  // Le max (« /1000 », ou « /900 » à l'entraînement) est mis en avant (gras +
  // couleur pleine on-surface, face au reste du texte atténué). On scinde la
  // phrase sur le repère `{max}` pour n'habiller que ce fragment.
  const [introBefore, introAfter = ""] = t(
    isTraining ? "scoring.trainingIntro" : "scoring.intro",
  ).split("{max}");

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      posthog?.capture("scoring_info_opened", {
        source: isTraining ? "training_result_screen" : "result_screen",
      });
    }
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

      <DialogContent closeLabel={t("ui.closeDialog")} className="max-w-sm">
        <DialogHeader className="items-start space-y-0 text-left sm:text-left">
          <DialogTitle className="font-serif text-2xl font-medium italic tracking-normal text-on-surface leading-none">
            {t("scoring.title")}
          </DialogTitle>
          <AccentBar className="mt-3" />
        </DialogHeader>

        <div className="space-y-4">
          <p className="font-sans text-sm text-on-surface-variant leading-relaxed">
            {introBefore}
            <span className="font-semibold text-on-surface">
              {t(isTraining ? "scoring.trainingIntroMax" : "scoring.introMax")}
            </span>
            {introAfter}
          </p>

          <ol className="space-y-4">
            {PARTS_BY_SCALE[scale].map(
              ({ icon: Icon, titleKey, bodyKey, BodyComponent }) => (
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
              ),
            )}
          </ol>

          {/* La rareté d'une grille passée est figée (cohorte complète) : le
              rappel « ça s'affinera » ne vaut que pour la grille du jour. */}
          <p className="font-sans text-xs italic text-on-surface-variant">
            {t(isTraining ? "scoring.trainingNoLives" : "ui.rarityEvolvesHint")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
