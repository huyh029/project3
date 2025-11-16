import LeaderboardService from "../services/leaderboard.service.js";

export class LeaderboardController {
  static async getLeaderboard(req, res) {
    try {
      const playerId = req.user?.id;
      const data = await LeaderboardService.getLeaderboard(playerId);
      return res.json({ success: true, ...data });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
}

export default LeaderboardController;
