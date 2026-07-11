import { AccentBar } from "@/components/editorial/AccentBar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/i18n/LocaleContext";
import { usePostHog } from "@posthog/react";
import { Info } from "lucide-react";
import { useState } from "react";
import { RarityLegend } from "./RarityLegend";

/** Une part du score dans la popup : libellé + explication. */
function ScorePart({ label, body }: { label: string; body: string }) {
  return (
    <div className="space-y-0.5">
      <p className="font-sans text-sm font-semibold text-on-surface">{label}</p>
      <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
        {body}
      </p>
    </div>
  );
}

/**
 * Icône « Info » + popup expliquant le score (grille + rareté + vies) et la
 * légende de rareté. Rendue à côté du score sur l'écran de résultat.
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
          <ScorePart label={t("scoring.grid")} body={t("scoring.gridBody")} />
          <ScorePart
            label={t("scoring.rarity")}
            body={t("scoring.rarityBody")}
          />
          <ScorePart label={t("scoring.lives")} body={t("scoring.livesBody")} />
          <RarityLegend />
          <p className="font-sans text-xs italic text-on-surface-variant">
            {t("ui.rarityEvolvesHint")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
