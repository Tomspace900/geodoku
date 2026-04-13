import { getCountryByCode } from "@/features/countries/lib/search";
import { computeScore } from "@/features/game/logic/rarity";
import type { FilledCell, GameState } from "@/features/game/types";
import { Award } from "lucide-react";

type Achievement = {
  id: string;
  emoji: string;
  title: string;
  description: string;
};

function getUnlockedAchievement(state: GameState): Achievement | null {
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
      id: "collectionneur_elite",
      emoji: "🏆",
      title: "Collectionneur Élite",
      description: country
        ? `Vous avez trouvé ${country.nameCanonical}, un pays ultra-rare.`
        : "Vous avez trouvé un pays ultra-rare.",
    };
  }

  // "Sans Faute" — victoire sans erreur
  if (state.status === "won" && state.remainingLives === 3) {
    return {
      id: "sans_faute",
      emoji: "💎",
      title: "Sans Faute",
      description: "Aucune erreur sur cette grille.",
    };
  }

  // "Globe-Trotter" — victoire avec 3+ continents différents
  if (state.status === "won") {
    const continents = new Set(
      filled
        .map((c) => getCountryByCode(c.countryCode)?.continent)
        .filter((c) => c !== undefined),
    );
    if (continents.size >= 3) {
      return {
        id: "globe_trotter",
        emoji: "🌍",
        title: "Globe-Trotter",
        description: `Vous avez parcouru ${continents.size} continents différents.`,
      };
    }
  }

  // Score exceptionnel (>= 80%)
  if (state.status === "won") {
    const score = computeScore(state);
    if (score.percent >= 80) {
      return {
        id: "score_elite",
        emoji: "⭐",
        title: "Score Exceptionnel",
        description: `${score.percent}% de score de rareté — dans le top des joueurs.`,
      };
    }
  }

  return null;
}

type Props = {
  state: GameState;
};

export function AchievementCard({ state }: Props) {
  const achievement = getUnlockedAchievement(state);
  if (!achievement) return null;

  return (
    <div className="flex items-center gap-4 bg-surface-low rounded-xl p-4">
      <div className="flex-1">
        <p className="font-semibold text-sm text-on-surface">
          {achievement.emoji} {achievement.title}
        </p>
        <p className="text-xs text-on-surface-variant mt-0.5">
          {achievement.description}
        </p>
      </div>
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#842cd3]/20 flex items-center justify-center">
        <Award size={20} className="text-rarity-rare" />
      </div>
    </div>
  );
}
