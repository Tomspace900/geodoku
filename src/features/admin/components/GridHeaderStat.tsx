import { predictionDelta } from "@/features/admin/logic/analytics";
import { deltaSeverityTextClass } from "@/features/admin/logic/display";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, type LucideIcon, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { type StatKind, getStatGlyph } from "./StatGlyph";

const DELTA_TITLE =
  "Écart facilité estimée − réussite observée moyenne par case";

type Props = {
  icon: LucideIcon;
  value: ReactNode;
  label: string;
  /** Couleur unique picto + chiffre + label. Défaut : neutre. */
  tone?: string;
  title?: string;
};

/** Picto + chiffre + label du header GridDayDetail (engagement et prédiction). */
export function GridHeaderStat({
  icon: Icon,
  value,
  label,
  tone,
  title,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm tabular-nums",
        tone ?? "text-on-surface-variant",
      )}
      title={title}
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      {value}
      {label}
    </span>
  );
}

export function GridHeaderStatKind({
  kind,
  value,
  tone,
  title,
}: {
  kind: StatKind;
  value: ReactNode;
  tone?: string;
  title?: string;
}) {
  const { Icon, label } = getStatGlyph(kind);
  return (
    <GridHeaderStat
      icon={Icon}
      value={value}
      label={label}
      tone={tone}
      title={title}
    />
  );
}

/** Écart prédit − observé (facilité vs réussite moyenne par case). */
export function GridHeaderStatDelta({
  predicted,
  observed,
}: {
  predicted: number;
  observed: number;
}) {
  const { value, severity } = predictionDelta(predicted, observed);
  const Arrow = value > 0 ? ArrowDown : value < 0 ? ArrowUp : Minus;
  return (
    <GridHeaderStat
      icon={Arrow}
      value={Math.abs(value)}
      label="écart"
      tone={deltaSeverityTextClass(severity)}
      title={DELTA_TITLE}
    />
  );
}
