import QueueEntry from "../models/queueEntry.model.js";
import Player from "../models/player.model.js";

const DEFAULT_TIME_BY_TYPE = {
  online: 5,
  rank: 10,
};

export class QueueService {
  static async enqueue(playerId, { type, timeLimit, metadata }) {
    if (!["online", "rank"].includes(type)) {
      throw new Error("Loại phòng chờ không hợp lệ");
    }

    const existing = await QueueEntry.findOne({
      playerId,
      status: "waiting",
    });

    if (existing) {
      return existing;
    }

    const player = await Player.findById(playerId);
    if (!player) {
      throw new Error("Không tìm thấy người chơi");
    }

    const totalMatches = player.win + player.loss;
    const winRate = totalMatches ? Math.round((player.win / totalMatches) * 100) : 0;

    return QueueEntry.create({
      playerId,
      type,
      timeLimit: timeLimit ?? DEFAULT_TIME_BY_TYPE[type],
      rankSnapshot: player.rating,
      winRateSnapshot: winRate,
      metadata: metadata || null,
    });
  }

  static async cancel(entryId, playerId) {
    const entry = await QueueEntry.findById(entryId);
    if (!entry) {
      throw new Error("Không tìm thấy vé trong hàng chờ");
    }
    if (entry.playerId.toString() !== playerId.toString()) {
      throw new Error("Bạn không có quyền huỷ vé này");
    }
    if (entry.status !== "waiting") {
      return entry;
    }
    entry.status = "cancelled";
    await entry.save();
    return entry;
  }

  static async getStatus(entryId, playerId) {
    const entry = await QueueEntry.findById(entryId);
    if (!entry) {
      throw new Error("Không tìm thấy vé trong hàng chờ");
    }
    if (entry.playerId.toString() !== playerId.toString()) {
      throw new Error("Bạn không thể xem vé của người khác");
    }
    return entry;
  }

  static async fetchWaiting(type) {
    return QueueEntry.find({ type, status: "waiting" }).sort({ createdAt: 1 });
  }

  static async markMatched(entryId, batchId) {
    return QueueEntry.findByIdAndUpdate(
      entryId,
      { status: "matched", matchedBatchId: batchId },
      { new: true }
    );
  }
}

export default QueueService;
