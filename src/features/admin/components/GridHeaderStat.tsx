import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getStatGlyph, type StatKind } from "./StatGlyph";

type Props = {
  icon: LucideIcon;
  value: ReactNode;
  label: string;
  /** Couleur unique picto + chiffre + label. Défaut : neutre. */
  tone?: string;
  title?: string;
};

/** Picto + chiffre + label du header GridDayDetail (engagement et taux observés). */
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
