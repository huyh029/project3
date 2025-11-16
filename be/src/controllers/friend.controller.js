import { FriendService } from "../services/friend.service.js";

export class FriendController {
  static async listFriends(req, res) {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      }
      const friends = await FriendService.listFriends(playerId);
      return res.json({ success: true, friends });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async listRequests(req, res) {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      }
      const box = req.query.box === "outbox" ? "outbox" : "inbox";
      const requests = await FriendService.listRequests(playerId, box);
      return res.json({ success: true, requests });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async sendRequest(req, res) {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      }
      const request = await FriendService.sendRequest(playerId, req.body || {});
      return res.status(201).json({ success: true, request });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async respondRequest(req, res) {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      }
      const { action } = req.body || {};
      if (!["accept", "decline"].includes(action)) {
        return res.status(400).json({ success: false, message: "Hành động không hợp lệ" });
      }
      const updated = await FriendService.respondRequest(playerId, req.params.requestId, action);
      return res.json({ success: true, request: updated });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
}

export default FriendController;
