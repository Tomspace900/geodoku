import { Flag } from "lucide-react";
import { useState } from "react";
import { AccentBar } from "@/components/editorial/AccentBar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/i18n/LocaleContext";

type Props = {
  onConfirm: () => void;
};

/**
 * Lien tertiaire « Abandonner » sous la grille d'entraînement, avec
 * confirmation : la partie se termine pour de bon (#148). Sans vies, c'était la
 * seule issue d'un joueur coincé hors forcer le blocage.
 */
export function GiveUpLink({ onConfirm }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    setOpen(false);
    onConfirm();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="link"
        onClick={() => setOpen(true)}
        className="mx-auto text-xs"
      >
        <Flag className="size-3 sm:size-3.5" aria-hidden="true" />
        {t("training.giveUp")}
      </Button>

      <DialogContent closeLabel={t("ui.closeDialog")} className="max-w-sm">
        <DialogHeader className="items-start space-y-0 text-left sm:text-left">
          <DialogTitle className="font-serif text-2xl font-medium italic tracking-normal text-on-surface leading-none">
            {t("training.giveUpTitle")}
          </DialogTitle>
          <AccentBar className="mt-3" />
        </DialogHeader>

        <DialogDescription className="font-sans leading-relaxed">
          {t("training.giveUpBody")}
        </DialogDescription>

        <div className="flex flex-col gap-2">
          <Button type="button" size="lg" onClick={handleConfirm}>
            {t("training.giveUpConfirm")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => setOpen(false)}
          >
            {t("training.giveUpCancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
