import { predictionDelta } from "@/features/admin/logic/analytics";
import { deltaSeverityTextClass } from "@/features/admin/logic/display";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  Check,
  DoorOpen,
  Flag,
  Gauge,
  Hash,
  Heart,
  Lock,
  type LucideIcon,
  Minus,
  Trophy,
  Users,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

/**
 * Vocabulaire d'icônes partagé des métriques admin (style « KDA »). Une seule
 * source de vérité pour l'engagement, la prédiction (facilité / réussite / écart),
 * les KDA de case, la légende et la tendance Santé de jeu. Le header
 * GridDayDetail utilise `GridHeaderStat`.
 */
export type StatKind =
  | "engages"
  | "terminees"
  | "abandon"
  | "victoires"
  | "defaites"
  | "essais"
  | "vies"
  | "blocage"
  | "faciliteEst"
  | "reussiteObs"
  | "ecartDown"
  | "ecartUp"
  | "ecartNeutre";

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
  victoires: { Icon: Trophy, cls: "text-warning", label: "victoires" },
  defaites: { Icon: X, cls: "text-error", label: "défaites" },
  essais: { Icon: Hash, cls: "text-on-surface-variant", label: "essais" },
  vies: { Icon: Heart, cls: "text-error", label: "vies" },
  blocage: { Icon: Lock, cls: "text-error", label: "blocage" },
  faciliteEst: {
    Icon: Gauge,
    cls: "text-on-surface-variant",
    label: "facilité est.",
    legendLabel: "facilité estimée",
  },
  reussiteObs: {
    Icon: Check,
    cls: "text-on-surface-variant",
    label: "réussite obs.",
    legendLabel: "réussite observée",
  },
  ecartDown: {
    Icon: ArrowDown,
    cls: "text-on-surface-variant",
    label: "écart",
    legendLabel: "écart prédit − observé",
  },
  ecartUp: {
    Icon: ArrowUp,
    cls: "text-on-surface-variant",
    label: "écart",
    legendLabel: "écart prédit − observé",
  },
  ecartNeutre: {
    Icon: Minus,
    cls: "text-on-surface-variant",
    label: "écart",
    legendLabel: "écart prédit − observé",
  },
};

export const STAT_DELTA_TITLE =
  "Écart facilité estimée − réussite observée moyenne par case";

export type DeltaStatKind = "ecartDown" | "ecartUp" | "ecartNeutre";

export function deltaStatKind(signedDelta: number): DeltaStatKind {
  if (signedDelta > 0) return "ecartDown";
  if (signedDelta < 0) return "ecartUp";
  return "ecartNeutre";
}

type Size = "sm" | "md";

export function getStatGlyph(kind: StatKind): (typeof GLYPHS)[StatKind] {
  return GLYPHS[kind];
}

/**
 * Icône + valeur. `showLabel` ajoute le mot inline (Santé de jeu, tableaux) ;
 * sinon icône seule (cases de grille + légende sous la preview).
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
  /** Remplace la couleur par défaut du glyph (ex. sévérité d'écart). */
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

/** Écart signé prédit − observé (flèche de sens + |écart|, teinté sévérité). */
export function StatGlyphDelta({
  predicted,
  observed,
  size = "sm",
  showLabel = false,
}: {
  predicted: number;
  observed: number;
  size?: Size;
  showLabel?: boolean;
}) {
  const { value, severity } = predictionDelta(predicted, observed);
  return (
    <StatGlyph
      kind={deltaStatKind(value)}
      value={Math.abs(value)}
      size={size}
      showLabel={showLabel}
      tone={deltaSeverityTextClass(severity)}
      title={STAT_DELTA_TITLE}
    />
  );
}

/** Pastille score + picto (facilité estimée ou réussite observée par case). */
export function StatScorePill({
  kind,
  score,
  pillClass,
}: {
  kind: "faciliteEst" | "reussiteObs";
  score: ReactNode;
  pillClass: string;
}) {
  const { Icon } = GLYPHS[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
        pillClass,
      )}
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
