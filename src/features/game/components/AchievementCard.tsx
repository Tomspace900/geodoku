import { getCountryByIso3 } from "@/features/countries/lib/search";
import {
  computeGridScore,
  computeOriginalityScore,
} from "@/features/game/logic/rarity";
import type { FilledCell, GameState } from "@/features/game/types";
import { useLocale, useT } from "@/i18n/LocaleContext";
import { usePostHog } from "@posthog/react";
import { Award } from "lucide-react";
import { useEffect } from "react";
import { STARTING_LIVES } from "../logic/constants";

type AchievementId =
  | "elite_originality"
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
  score?: number;
};

function getUnlockedAchievement(
  state: GameState,
  locale: "fr" | "en",
): AchievementRaw | null {
  const filled = Object.values(state.cells).filter(
    (c): c is FilledCell => c.status === "filled",
  );

  // « Cartographe Émérite » — originalité grade S (≥ 70). On le teste avant
  // « Collectionneur Élite » : sinon il serait toujours masqué (le seuil S
  // implique plusieurs ultras → hasUltra serait toujours vrai en premier).
  if (state.status === "won") {
    const originality = computeOriginalityScore(state);
    if (originality.grade === "S") {
      return {
        id: "elite_originality",
        emoji: "🌟",
        score: originality.score,
      };
    }
  }

  // « Collectionneur Élite » — au moins une cellule ultra-rare
  const hasUltra = filled.some((c) => c.rarityTier === "ultra");
  if (hasUltra) {
    const ultraCell = filled.find((c) => c.rarityTier === "ultra");
    const country = ultraCell
      ? getCountryByIso3(ultraCell.countryCode)
      : undefined;
    return {
      id: "elite_collector",
      emoji: "🏆",
      countryName: country?.names[locale],
    };
  }

  // « Sans Faute » — victoire sans erreur
  if (state.status === "won" && state.remainingLives === STARTING_LIVES) {
    return { id: "flawless", emoji: "💎" };
  }

  // « Globe-Trotter » — victoire avec 3+ continents différents
  if (state.status === "won") {
    const continents = new Set(
      filled
        .map((c) => getCountryByIso3(c.countryCode)?.continent)
        .filter((c) => c !== undefined),
    );
    if (continents.size >= 3) {
      return { id: "globe_trotter", emoji: "🌍", count: continents.size };
    }
  }

  // Score de grille exceptionnel (≥ 80 %)
  if (state.status === "won") {
    const gridScore = computeGridScore(state);
    if (gridScore.percent >= 80) {
      return { id: "elite_score", emoji: "⭐", percent: gridScore.percent };
    }
  }

  return null;
}

type Props = {
  state: GameState;
};

export function AchievementCard({ state }: Props) {
  const posthog = usePostHog();
  const { locale } = useLocale();
  const t = useT();
  const raw = getUnlockedAchievement(state, locale);

  // biome-ignore lint/correctness/useExhaustiveDependencies: posthog is stable; raw?.id intentionally limits fire to one per distinct achievement; state.date stable within session
  useEffect(() => {
    if (!raw) return;
    posthog?.capture("achievement_unlocked", {
      achievement_id: raw.id,
      grid_date: state.date,
    });
  }, [raw?.id]);

  if (!raw) return null;

  let title: string;
  let description: string;

  switch (raw.id) {
    case "elite_originality":
      title = t("achievement.eliteOriginality");
      description = t("achievement.eliteOriginalityDesc", {
        score: raw.score ?? 0,
      });
      break;
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
