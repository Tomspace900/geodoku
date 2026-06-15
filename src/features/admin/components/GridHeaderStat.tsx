import { predictionDelta } from "@/features/admin/logic/analytics";
import { deltaSeverityTextClass } from "@/features/admin/logic/display";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  STAT_DELTA_TITLE,
  type StatKind,
  deltaStatKind,
  getStatGlyph,
} from "./StatGlyph";

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
      <span>{label}</span>
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
  const { Icon, label } = getStatGlyph(deltaStatKind(value));
  return (
    <GridHeaderStat
      icon={Icon}
      value={Math.abs(value)}
      label={label}
      tone={deltaSeverityTextClass(severity)}
      title={STAT_DELTA_TITLE}
    />
  );
}
