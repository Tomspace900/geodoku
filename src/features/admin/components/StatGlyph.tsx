import {
  CircleDashed,
  DoorOpen,
  Flag,
  Gauge,
  Heart,
  Hourglass,
  Lock,
  type LucideIcon,
  Trophy,
  Users,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Vocabulaire d'icônes partagé des métriques admin (style « KDA »). Une seule
 * source de vérité pour l'engagement, la facilité estimée, les taux observés
 * par case (trompés, laissées vides), la légende et la tendance Santé de jeu.
 * Le header GridDayDetail utilise `GridHeaderStat`.
 */
export type StatKind =
  | "engages"
  | "terminees"
  | "abandon"
  | "enCours"
  | "victoires"
  | "defaites"
  | "vies"
  | "blocage"
  | "faciliteEst"
  | "trompes"
  | "vides";

type GlyphDef = {
  Icon: LucideIcon;
  cls: string;
  label: string;
  legendLabel?: string;
};

const GLYPHS: Record<StatKind, GlyphDef> = {
  engages: { Icon: Users, cls: "text-on-surface-variant", label: "engagés" },
  terminees: { Icon: Flag, cls: "text-on-surface-variant", label: "terminées" },
  abandon: {
    Icon: DoorOpen,
    cls: "text-on-surface-variant",
    label: "abandon",
  },
  enCours: {
    Icon: Hourglass,
    cls: "text-on-surface-variant",
    label: "en cours",
  },
  victoires: { Icon: Trophy, cls: "text-warning", label: "victoires" },
  defaites: { Icon: X, cls: "text-error", label: "défaites" },
  vies: { Icon: Heart, cls: "text-error", label: "vies" },
  blocage: { Icon: Lock, cls: "text-error", label: "blocage" },
  faciliteEst: {
    Icon: Gauge,
    cls: "text-on-surface-variant",
    label: "facilité est.",
    legendLabel: "facilité estimée",
  },
  trompes: {
    Icon: X,
    cls: "text-error",
    label: "trompés",
    legendLabel: "parties finies où le joueur s'est trompé sur la case",
  },
  vides: {
    Icon: CircleDashed,
    cls: "text-error",
    label: "vides",
    legendLabel: "parties finies où la case est restée vide",
  },
};

type Size = "sm" | "md";

export function getStatGlyph(kind: StatKind): (typeof GLYPHS)[StatKind] {
  return GLYPHS[kind];
}

/**
 * Icône + valeur. `showLabel` ajoute le mot inline (Santé de jeu, tableaux) ;
 * sinon icône seule (légende sous la preview).
 */
export function StatGlyph({
  kind,
  value,
  size = "sm",
  showLabel = false,
  tone,
  title,
}: {
  kind: StatKind;
  value?: ReactNode;
  size?: Size;
  showLabel?: boolean;
  /** Remplace la couleur par défaut du glyph. */
  tone?: string;
  title?: string;
}) {
  const { Icon, cls, label } = GLYPHS[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        size === "md" ? "text-sm" : "text-[10px]",
        tone ?? cls,
      )}
      title={title}
    >
      <Icon
        aria-hidden="true"
        className={size === "md" ? "h-4 w-4 shrink-0" : "h-3 w-3 shrink-0"}
      />
      {value !== undefined && value}
      {showLabel && <span>{label}</span>}
    </span>
  );
}

/** Pastille score + picto (facilité estimée, taux observés par case). */
export function StatScorePill({
  kind,
  score,
  pillClass,
  title,
}: {
  kind: "faciliteEst" | "trompes" | "vides";
  score: ReactNode;
  pillClass: string;
  title?: string;
}) {
  const { Icon } = GLYPHS[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
        pillClass,
      )}
      title={title}
    >
      <Icon aria-hidden="true" className="size-3 shrink-0" />
      {score}
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
        const { Icon, cls, label, legendLabel } = GLYPHS[k];
        return (
          <span key={k} className="flex items-center gap-1">
            <Icon aria-hidden="true" className={cn("h-3 w-3 shrink-0", cls)} />
            {legendLabel ?? label}
          </span>
        );
      })}
    </div>
  );
}
