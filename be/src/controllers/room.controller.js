import RoomService from "../services/room.service.js";
import MatchService from "../services/match.service.js";

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
      const batch = await MatchService.startMatchFromPrepRoom(room);
      return res.json({ success: true, room, batch });
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
}

export default RoomController;
