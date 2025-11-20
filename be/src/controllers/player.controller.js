import Player from "../models/player.model.js";

export class PlayerController {
  static async getProfile(req, res) {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      }

      const player = await Player.findById(playerId).select("-password");

      if (!player) {
        return res.status(404).json({ success: false, message: "Không tìm thấy người chơi" });
      }

      return res.json({ success: true, player });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

export default PlayerController;
