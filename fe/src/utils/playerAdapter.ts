import type { User } from "../context/GameContext";

export const mapPlayerToUser = (player: any): User => {
  const draws =
    player?.matchHistory?.filter(
      (match: { result?: string }) => match?.result === "draw"
    ).length ?? 0;

  return {
    id: player?._id || player?.id || "",
    username: player?.name || player?.username || "Người chơi",
    email: player?.email || "",
    avatar:
      player?.avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${player?.name || "player"}`,
    rank: player?.rank || "Bronze",
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
