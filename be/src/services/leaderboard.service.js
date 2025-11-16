import Player from "../models/player.model.js";

export class LeaderboardService {
  static async getLeaderboard(playerId, limit = 100) {
    const topPlayers = await Player.find({})
      .sort({ rating: -1 })
      .limit(limit)
      .select("name rating rank level win loss coin");

    let me = null;
    if (playerId) {
      const current = await Player.findById(playerId);
      if (current) {
        const betterCount = await Player.countDocuments({
          rating: { $gt: current.rating },
        });
        me = {
          player: current,
          position: betterCount + 1,
        };
      }
    }

    return { topPlayers, me };
  }
}

export default LeaderboardService;
