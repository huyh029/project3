import type { User } from "../context/GameContext";

const rankLabelMap: Record<string, string> = {
  bronze: "Dong",
  silver: "Bac",
  gold: "Vang",
  diamond: "Kim Cuong",
  elite: "Tinh Anh",
  master: "Cao Thu",
};

const formatRankText = (
  tier: string,
  division: number,
  stars: number
): string => {
  const label = rankLabelMap[tier] || rankLabelMap.bronze;
  const safeStars = Math.max(0, Math.floor(stars));
  if (tier === "master") {
    return `${label} ${safeStars}*`;
  }
  const safeDivision = Math.min(Math.max(division || 1, 1), 5);
  return `${label} ${safeDivision} - ${safeStars}*`;
};

export const mapPlayerToUser = (player: any): User => {
  const draws =
    player?.matchHistory?.filter(
      (match: { result?: string }) => match?.result === "draw"
    ).length ?? 0;

  const rankTier = player?.rankTier || "bronze";
  const rankDivision =
    typeof player?.rankDivision === "number" ? player.rankDivision : 5;
  const rankStars =
    typeof player?.rankStars === "number" ? player.rankStars : 0;
  const rankEssence =
    typeof player?.rankEssence === "number" ? player.rankEssence : 0;

  return {
    id: player?._id || player?.id || "",
    username: player?.name || player?.username || "Nguoi choi",
    email: player?.email || "",
    avatar:
      player?.avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${player?.name || "player"}`,
    rank: player?.rank || formatRankText(rankTier, rankDivision, rankStars),
    rankTier,
    rankDivision,
    rankStars,
    rankEssence,
    level: player?.level || 1,
    exp: player?.exp || 0,
    gold: player?.coin || 0,
    wins: player?.win || 0,
    losses: player?.loss || 0,
    draws,
    elo: player?.rating || 1200,
  };
};

export const mapInventory = (player: any) => {
  if (!player?.inventory) {
    return ["classic"];
  }
  const { boards = [], pieces = [], effects = [] } = player.inventory;
  return Array.from(new Set([...(boards || []), ...(pieces || []), ...(effects || [])]));
};
