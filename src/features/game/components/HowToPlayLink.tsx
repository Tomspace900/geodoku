import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HelpCircle } from "lucide-react";
import { useState } from "react";

export function HowToPlayLink() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="self-center gap-1.5 text-on-surface-variant text-xs tracking-wide"
      >
        <HelpCircle size={13} />
        Comment jouer ?
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              Comment jouer ?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-on-surface-variant leading-relaxed">
            <p>
              Chaque grille propose{" "}
              <strong className="text-on-surface">6 contraintes</strong>{" "}
              géographiques (3 lignes, 3 colonnes). Pour chaque case, trouvez un
              pays qui valide{" "}
              <strong className="text-on-surface">
                les deux contraintes croisées
              </strong>
              .
            </p>
            <p>
              Chaque pays ne peut être utilisé qu'une seule fois dans la grille.
            </p>
            <p>
              Vous avez <strong className="text-on-surface">3 vies</strong>.
              Chaque mauvaise réponse en consomme une.
            </p>
            <p>Les cellules sont colorées selon la rareté de votre réponse :</p>
            <ul className="space-y-1 pl-1">
              <li>🟩 Commun — plus de 50 % des joueurs</li>
              <li>🟨 Peu commun — plus de 25 %</li>
              <li>🟧 Rare — plus de 10 %</li>
              <li>🟥 Ultra-rare — 10 % ou moins</li>
            </ul>
            <p className="italic text-xs">
              Plus votre réponse est rare, meilleur est votre score. Bonne
              chance !
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
