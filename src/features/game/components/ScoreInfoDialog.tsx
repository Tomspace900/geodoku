import { usePostHog } from "@posthog/react";
import { Gem, Grid3x3, Heart, Info } from "lucide-react";
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
import { type IconRule, IconRuleList } from "./IconRuleList";
import { RarityLegend } from "./RarityLegend";

const GRID_PART: IconRule = {
  icon: Grid3x3,
  titleKey: "scoring.gridTitle",
  bodyKey: "scoring.gridBody",
};
const LIVES_PART: IconRule = {
  icon: Heart,
  titleKey: "scoring.livesTitle",
  bodyKey: "scoring.livesBody",
};
const RARITY_PART: IconRule = {
  icon: Gem,
  titleKey: "scoring.rarityTitle",
  bodyKey: "scoring.rarityBody",
  BodyComponent: (props) => <RarityLegend variant="points" {...props} />,
};

/**
 * Barème du jour : trois parts sur 1000. Entraînement : deux parts sur 900.
 * Repris par la page « À propos » (#142).
 */
export const SCORE_PARTS_BY_SCALE: Record<ScoreScale, readonly IconRule[]> = {
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

          <IconRuleList rules={SCORE_PARTS_BY_SCALE[scale]} />

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
