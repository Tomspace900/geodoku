import {
  type DifficultyTier,
  difficultyTierFromScore,
  difficultyTierSurfaceClass,
} from "@/features/admin/logic/display";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  value?: number;
  tier?: DifficultyTier;
  children?: ReactNode;
};

export function DifficultyPill({ value, tier, children }: Props) {
  const resolvedTier: DifficultyTier =
    tier ?? (value !== undefined ? difficultyTierFromScore(value) : "easy");
  const display: ReactNode = children ?? value ?? "";
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
        difficultyTierSurfaceClass(resolvedTier),
      )}
    >
      {display}
    </span>
  );
}
