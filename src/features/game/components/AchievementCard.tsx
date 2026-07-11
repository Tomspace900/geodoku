import { getCountryByIso3 } from "@/features/countries/lib/search";
import { playerCellTier } from "@/features/game/logic/rarity";
import {
  averageRarityTier,
  computeScoreBreakdown,
} from "@/features/game/logic/scoreVariant";
import type {
  Cell,
  CellGuessDistribution,
  CellKey,
  FilledCell,
  GameState,
} from "@/features/game/types";
import { useLocale, useT } from "@/i18n/LocaleContext";
import { usePostHog } from "@posthog/react";
import { Award } from "lucide-react";
import { useEffect } from "react";
import { STARTING_LIVES } from "../logic/constants";

type AchievementId =
  | "elite_originality"
  | "elite_collector"
  | "flawless"
  | "globe_trotter";

type AchievementRaw = {
  id: AchievementId;
  emoji: string;
  countryName?: string;
  count?: number;
};

function getUnlockedAchievement(
  state: GameState,
  locale: "fr" | "en",
  distribution: Record<string, CellGuessDistribution> | undefined,
): AchievementRaw | null {
  const filled = (Object.entries(state.cells) as [CellKey, Cell][]).filter(
    (entry): entry is [CellKey, FilledCell] => entry[1].status === "filled",
  );

  // « Cartographe Émérite » — rareté moyenne au tier ultra (leave-one-out). Testé
  // avant « Collectionneur Élite » : sinon toujours masqué (une moyenne ultra
  // implique plusieurs cases ultra → l'autre succès passerait en premier).
  if (state.status === "won") {
    const { shares } = computeScoreBreakdown(state, distribution);
    if (shares !== null && averageRarityTier(shares) === "ultra") {
      return { id: "elite_originality", emoji: "🌟" };
    }
  }

  // « Collectionneur Élite » — au moins une case au tier ultra (leave-one-out).
  const ultraEntry = filled.find(
    ([key, cell]) =>
      playerCellTier(cell.countryCode, distribution?.[key]) === "ultra",
  );
  if (ultraEntry) {
    const country = getCountryByIso3(ultraEntry[1].countryCode);
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
        .map(([, cell]) => getCountryByIso3(cell.countryCode)?.continent)
        .filter((c) => c !== undefined),
    );
    if (continents.size >= 3) {
      return { id: "globe_trotter", emoji: "🌍", count: continents.size };
    }
  }

  return null;
}

type Props = {
  state: GameState;
  distribution: Record<string, CellGuessDistribution> | undefined;
};

export function AchievementCard({ state, distribution }: Props) {
  const posthog = usePostHog();
  const { locale } = useLocale();
  const t = useT();
  const raw = getUnlockedAchievement(state, locale, distribution);

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
      description = t("achievement.eliteOriginalityDesc");
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
