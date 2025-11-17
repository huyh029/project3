import MatchService from "../services/match.service.js";
import { BatchService } from "../services/batch.service.js";

export class MatchController {
  static async createBotMatch(req, res) {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      }
      const { timeLimit, botLevel } = req.body || {};
      const batch = await MatchService.createBotMatch({ playerId, timeLimit, botLevel });
      return res.status(201).json({ success: true, batch });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async createLocalMatch(req, res) {
    try {
      const hostPlayerId = req.user?.id;
      if (!hostPlayerId) {
        return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      }
      const { secondPlayerId, timeLimit } = req.body || {};
      const batch = await MatchService.createLocalMatch({
        hostPlayerId,
        secondPlayerId: secondPlayerId || hostPlayerId,
        timeLimit,
      });
      return res.status(201).json({ success: true, batch });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async finishMatch(req, res) {
    try {
      const { batchId } = req.params;
      const { winnerId, reason } = req.body || {};
      const batch = await MatchService.finishMatch(batchId, { winnerId, reason });
      return res.json({ success: true, batch });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getMatch(req, res) {
    try {
      const { batchId } = req.params;
      const batch = await BatchService.getBatchById(batchId);
      if (!batch) {
        return res.status(404).json({ success: false, message: "Không tìm thấy trận đấu" });
      }
      return res.json({ success: true, batch });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getHistory(req, res) {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      }
      const { page = "1", limit = "10" } = req.query || {};
      const result = await MatchService.getHistory(playerId, { page, limit });
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getMatchDetail(req, res) {
    try {
      const { batchId } = req.params;
      const viewerId = req.user?.id || null;
      const match = await MatchService.getMatchDetail(batchId, viewerId);
      return res.json({ success: true, match });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
}

export default MatchController;
