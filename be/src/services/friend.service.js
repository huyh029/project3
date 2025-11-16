import FriendRequest from "../models/friendRequest.model.js";
import Player from "../models/player.model.js";

export class FriendService {
  static async listFriends(playerId) {
    const player = await Player.findById(playerId)
      .populate("friends", "name email rank level rating win loss exp coin")
      .lean();
    if (!player) {
      throw new Error("Không tìm thấy người chơi");
    }
    return player.friends || [];
  }

  static async listRequests(playerId, box = "inbox") {
    const filter = box === "outbox" ? { sender: playerId } : { receiver: playerId };
    return FriendRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("sender", "name email rank level rating")
      .populate("receiver", "name email rank level rating");
  }

  static async sendRequest(senderId, { receiverId, receiverEmail, message }) {
    if (!receiverId && !receiverEmail) {
      throw new Error("Thiếu thông tin người nhận");
    }

    let resolvedReceiver = receiverId;
    if (!resolvedReceiver && receiverEmail) {
      const found = await Player.findOne({ email: receiverEmail });
      if (!found) {
        throw new Error("Không tìm thấy người nhận");
      }
      resolvedReceiver = found._id;
    }

    if (senderId === resolvedReceiver?.toString()) {
      throw new Error("Không thể kết bạn với chính mình");
    }

    const [sender, receiver] = await Promise.all([
      Player.findById(senderId),
      Player.findById(resolvedReceiver),
    ]);
    if (!receiver) {
      throw new Error("Không tìm thấy người nhận");
    }
    if (!sender) {
      throw new Error("Không tìm thấy người gửi");
    }

    const alreadyFriend = sender.friends?.some(
      (id) => id.toString() === receiver._id.toString()
    );
    if (alreadyFriend) {
      throw new Error("Hai người đã là bạn bè");
    }

    const existingPending = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiver._id, status: "pending" },
        { sender: receiver._id, receiver: senderId, status: "pending" },
      ],
    });
    if (existingPending) {
      throw new Error("Đã có lời mời đang chờ xử lý");
    }

    return FriendRequest.create({
      sender: senderId,
      receiver: receiver._id,
      message,
    });
  }

  static async respondRequest(playerId, requestId, action) {
    const request = await FriendRequest.findById(requestId);
    if (!request) {
      throw new Error("Không tìm thấy lời mời");
    }
    if (request.receiver.toString() !== playerId.toString()) {
      throw new Error("Bạn không có quyền xử lý lời mời này");
    }
    if (request.status !== "pending") {
      throw new Error("Lời mời đã được xử lý");
    }

    if (action === "accept") {
      request.status = "accepted";
      request.respondedAt = new Date();
      await request.save();

      await Player.updateOne(
        { _id: request.sender, friends: { $ne: request.receiver } },
        { $push: { friends: request.receiver } }
      );
      await Player.updateOne(
        { _id: request.receiver, friends: { $ne: request.sender } },
        { $push: { friends: request.sender } }
      );
    } else if (action === "decline") {
      request.status = "declined";
      request.respondedAt = new Date();
      await request.save();
    } else {
      throw new Error("Hành động không hợp lệ");
    }

    return request;
  }
}

export default FriendService;
