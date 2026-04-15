import { getCountryByCode } from "@/features/countries/lib/search";
import { computeScore } from "@/features/game/logic/rarity";
import type { FilledCell, GameState } from "@/features/game/types";
import { useLocale, useT } from "@/i18n/LocaleContext";
import { Award } from "lucide-react";
import { STARTING_LIVES } from "../logic/constants";

type AchievementId =
  | "elite_collector"
  | "flawless"
  | "globe_trotter"
  | "elite_score";

type AchievementRaw = {
  id: AchievementId;
  emoji: string;
  countryName?: string;
  count?: number;
  percent?: number;
};

function getUnlockedAchievement(
  state: GameState,
  locale: "fr" | "en",
): AchievementRaw | null {
  const filled = Object.values(state.cells).filter(
    (c): c is FilledCell => c.status === "filled",
  );

  // "Collectionneur Élite" — au moins une cellule ultra-rare
  const hasUltra = filled.some((c) => c.rarityTier === "ultra");
  if (hasUltra) {
    const ultraCell = filled.find((c) => c.rarityTier === "ultra");
    const country = ultraCell
      ? getCountryByCode(ultraCell.countryCode)
      : undefined;
    return {
      id: "elite_collector",
      emoji: "🏆",
      countryName: country?.names[locale],
    };
  }

  // "Sans Faute" — victoire sans erreur
  if (state.status === "won" && state.remainingLives === STARTING_LIVES) {
    return { id: "flawless", emoji: "💎" };
  }

  // "Globe-Trotter" — victoire avec 3+ continents différents
  if (state.status === "won") {
    const continents = new Set(
      filled
        .map((c) => getCountryByCode(c.countryCode)?.continent)
        .filter((c) => c !== undefined),
    );
    if (continents.size >= 3) {
      return { id: "globe_trotter", emoji: "🌍", count: continents.size };
    }
  }

  // Score exceptionnel (>= 80%)
  if (state.status === "won") {
    const score = computeScore(state);
    if (score.percent >= 80) {
      return { id: "elite_score", emoji: "⭐", percent: score.percent };
    }
  }

  return null;
}

type Props = {
  state: GameState;
};

export function AchievementCard({ state }: Props) {
  const { locale } = useLocale();
  const t = useT();
  const raw = getUnlockedAchievement(state, locale);
  if (!raw) return null;

  let title: string;
  let description: string;

  switch (raw.id) {
    case "elite_collector":
      title = t("achievement.eliteCollector");
      description = raw.countryName
        ? t("achievement.eliteCollectorDesc", { country: raw.countryName })
        : t("achievement.eliteCollectorDescUnknown");
      break;
    case "flawless":
      title = t("achievement.flawless");
      description = t("achievement.flawlessDesc");
      break;
    case "globe_trotter":
      title = t("achievement.globeTrotter");
      description = t("achievement.globeTrotterDesc", {
        count: raw.count ?? 0,
      });
      break;
    case "elite_score":
      title = t("achievement.eliteScore");
      description = t("achievement.eliteScoreDesc", {
        percent: raw.percent ?? 0,
      });
      break;
  }

  return (
    <div className="flex items-center gap-4 bg-surface-low rounded-xl p-4">
      <div className="flex-1">
        <p className="font-semibold text-sm text-on-surface">
          {raw.emoji} {title}
        </p>
        <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>
      </div>
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand/20 flex items-center justify-center">
        <Award size={20} className="text-brand" />
      </div>
    </div>
  );
}
