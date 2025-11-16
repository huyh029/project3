import PrepRoom from "../models/prepRoom.model.js";

const ROOM_ID_LENGTH = 6;
const AUTO_QUEUE_TIMEOUT_MS = null; // vô hạn: không auto chuyển sang queue
const ROOM_TTL_MINUTES = 15;

const generateRoomId = () =>
  Math.floor(
    10 ** (ROOM_ID_LENGTH - 1) + Math.random() * 9 * 10 ** (ROOM_ID_LENGTH - 1)
  ).toString();

export class RoomService {
  static async createRoom(hostPlayerId, { timeLimit = 5, matchType = "online" }) {
    let roomId = generateRoomId();
    let exists = await PrepRoom.findOne({ roomId });
    while (exists) {
      roomId = generateRoomId();
      exists = await PrepRoom.findOne({ roomId });
    }

    const now = new Date();
    const autoQueueAt =
      typeof AUTO_QUEUE_TIMEOUT_MS === "number"
        ? new Date(now.getTime() + AUTO_QUEUE_TIMEOUT_MS)
        : null;
    const expiresAt = new Date(now.getTime() + ROOM_TTL_MINUTES * 60 * 1000);

    return PrepRoom.create({
      roomId,
      hostPlayerId,
      timeLimit,
      matchType,
      status: "waiting",
      autoQueueAt,
      expiresAt,
    });
  }

  static async getRoom(roomId) {
    return PrepRoom.findOne({ roomId });
  }

  static async joinRoom(roomId, guestPlayerId) {
    const room = await PrepRoom.findOne({ roomId });
    if (!room) {
      throw new Error("Không tìm thấy phòng");
    }
    if (room.status === "full") {
      throw new Error("Phòng đã đủ người");
    }
    if (room.status !== "waiting") {
      throw new Error("Phòng không thể tham gia");
    }
    if (room.hostPlayerId.toString() === guestPlayerId.toString()) {
      throw new Error("Bạn không thể tự tham gia phòng của mình");
    }

    room.guestPlayerId = guestPlayerId;
    room.status = "full";
    await room.save();
    return room;
  }

  static async cancelRoom(roomId, playerId) {
    const room = await PrepRoom.findOne({ roomId });
    if (!room) {
      throw new Error("Không tìm thấy phòng");
    }
    if (room.hostPlayerId.toString() !== playerId.toString()) {
      throw new Error("Chỉ chủ phòng mới có thể huỷ");
    }

    room.status = "cancelled";
    await room.save();
    return room;
  }

  static async markQueued(roomId) {
    return PrepRoom.findOneAndUpdate(
      { roomId },
      { status: "queue" },
      { new: true }
    );
  }
}

export default RoomService;
