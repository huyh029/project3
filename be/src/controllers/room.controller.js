import RoomService from "../services/room.service.js";
import MatchService from "../services/match.service.js";
import Player from "../models/player.model.js";
import { getIO } from "../socket/index.js";

export class RoomController {
  static async create(req, res) {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      }
      const room = await RoomService.createRoom(playerId, req.body || {});
      return res.status(201).json({ success: true, room });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async join(req, res) {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      }
      const { roomId } = req.params;
      const room = await RoomService.joinRoom(roomId, playerId);

      try {
        const guest = await Player.findById(playerId);
        const io = getIO();
        io.to(`player:${room.hostPlayerId.toString()}`).emit("room:guestPending", {
          roomId,
          guestId: playerId,
          guestName: guest?.name || guest?.email || "Người chơi",
          timeLimit: room.timeLimit,
          createdAt: new Date().toISOString(),
        });
      } catch (socketErr) {
        console.warn("Socket emit guestPending failed:", socketErr.message);
      }

      return res.json({ success: true, room });
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
      const { roomId } = req.params;
      const room = await RoomService.cancelRoom(roomId, playerId);
      return res.json({ success: true, room });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async detail(req, res) {
    try {
      const { roomId } = req.params;
      const room = await RoomService.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ success: false, message: "Không tìm thấy phòng" });
      }
      return res.json({ success: true, room });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async invite(req, res) {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      }
      const { roomId } = req.params;
      const { friendId } = req.body || {};
      if (!friendId) {
        return res.status(400).json({ success: false, message: "Thiếu bạn bè cần mời" });
      }
      const room = await RoomService.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ success: false, message: "Không tìm thấy phòng" });
      }
      if (room.hostPlayerId.toString() !== playerId.toString()) {
        return res.status(403).json({ success: false, message: "Chỉ chủ phòng mới được mời" });
      }
      if (!["waiting", "pending"].includes(room.status)) {
        return res.status(400).json({ success: false, message: "Phòng không ở trạng thái mời" });
      }
      const host = await Player.findById(playerId);
      const friend = await Player.findById(friendId);
      if (!friend) {
        return res.status(404).json({ success: false, message: "Không tìm thấy bạn bè" });
      }
      const isFriend =
        host?.friends?.some((id) => id.toString() === friendId.toString()) ?? false;
      if (!isFriend) {
        return res.status(400).json({ success: false, message: "Người này không nằm trong danh sách bạn bè" });
      }
      try {
        const io = getIO();
        io.to(`player:${friendId}`).emit("room:invite", {
          roomId,
          hostId: playerId,
          hostName: host?.name || "Bạn bè",
          timeLimit: room.timeLimit,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn("Socket broadcast failed (invite):", err.message);
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async kickGuest(req, res) {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      }
      const { roomId } = req.params;
      const room = await RoomService.kickGuest(roomId, playerId);
      return res.json({ success: true, room });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async leave(req, res) {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      }
      const { roomId } = req.params;
      const room = await RoomService.leaveRoom(roomId, playerId);
      return res.json({ success: true, room });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async confirm(req, res) {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      }
      const { roomId } = req.params;
      const room = await RoomService.confirmRoom(roomId, playerId);
      const batch = await MatchService.startMatchFromPrepRoom(room);
      return res.json({ success: true, room, batch });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
}

export default RoomController;
