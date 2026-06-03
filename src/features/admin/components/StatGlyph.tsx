import { cn } from "@/lib/utils";
import {
  Check,
  DoorOpen,
  Flag,
  Hash,
  Heart,
  Lock,
  type LucideIcon,
  Trophy,
  Users,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

/**
 * Vocabulaire d'icônes partagé des métriques admin (style « KDA »). Une seule
 * source de vérité pour les cases de grille, le header de grille et la tendance
 * Santé de jeu — icône + couleur + libellé (pour les légendes).
 */
export type StatKind =
  | "engages"
  | "terminees"
  | "abandon"
  | "victoires"
  | "defaites"
  | "reussites"
  | "echecs"
  | "essais"
  | "vies"
  | "blocage";

const GLYPHS: Record<
  StatKind,
  { Icon: LucideIcon; cls: string; label: string }
> = {
  engages: { Icon: Users, cls: "text-on-surface-variant", label: "engagés" },
  terminees: { Icon: Flag, cls: "text-on-surface-variant", label: "terminées" },
  abandon: {
    Icon: DoorOpen,
    cls: "text-on-surface-variant",
    label: "abandon",
  },
  victoires: { Icon: Trophy, cls: "text-warning", label: "victoires" },
  defaites: { Icon: X, cls: "text-error", label: "défaites" },
  reussites: { Icon: Check, cls: "text-success", label: "réussites" },
  echecs: { Icon: X, cls: "text-error", label: "échecs" },
  essais: { Icon: Hash, cls: "text-on-surface-variant", label: "essais" },
  vies: { Icon: Heart, cls: "text-error", label: "vies" },
  blocage: { Icon: Lock, cls: "text-error", label: "blocage" },
};

type Size = "sm" | "md";

/**
 * Icône + valeur. `showLabel` ajoute le mot inline (header de grille, en-têtes
 * de tableau, là où il y a la place) ; sinon icône seule (cases de grille, où
 * le mot vient d'une légende sous la grille).
 */
export function StatGlyph({
  kind,
  value,
  size = "sm",
  showLabel = false,
}: {
  kind: StatKind;
  value?: ReactNode;
  size?: Size;
  showLabel?: boolean;
}) {
  const { Icon, cls, label } = GLYPHS[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        size === "md" ? "text-sm" : "text-[10px]",
        cls,
      )}
    >
      <Icon
        aria-hidden="true"
        className={size === "md" ? "h-4 w-4" : "h-3 w-3"}
      />
      {value !== undefined && value}
      {showLabel && <span>{label}</span>}
    </span>
  );
}

/** Légende : icône + libellé pour chaque métrique listée. */
export function StatLegend({
  kinds,
  className,
}: {
  kinds: StatKind[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-on-surface-variant/60",
        className,
      )}
    >
      {kinds.map((k) => {
        const { Icon, cls, label } = GLYPHS[k];
        return (
          <span key={k} className="flex items-center gap-1">
            <Icon aria-hidden="true" className={cn("h-3 w-3", cls)} />
            {label}
          </span>
        );
      })}
    </div>
  );
}
