import { QueueService } from "../services/queue.service.js";

export class QueueController {
  static async enqueue(req, res) {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      }
      const entry = await QueueService.enqueue(playerId, req.body);
      return res.status(201).json({ success: true, entry });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async cancel(req, res) {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      }
      const { entryId } = req.params;
      const entry = await QueueService.cancel(entryId, playerId);
      return res.json({ success: true, entry });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async status(req, res) {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      }
      const { entryId } = req.params;
      const entry = await QueueService.getStatus(entryId, playerId);
      return res.json({ success: true, entry });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
}

export default QueueController;
