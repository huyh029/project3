import mongoose from "mongoose";
import Player from "../models/player.model.js";
import QueueEntry from "../models/queueEntry.model.js";
import { BatchService } from "./batch.service.js";
import { QueueService } from "./queue.service.js";
import PrepRoom from "../models/prepRoom.model.js";
import { getIO } from "../socket/index.js";

const DEFAULT_BOT_PLAYER_ID = new mongoose.Types.ObjectId("000000000000000000000000");
const RATING_K = 24;

const rewardTable = {
  win: { coin: 50, exp: 30 },
  loss: { coin: 20, exp: 10 },
  draw: { coin: 30, exp: 20 },
};

const resolveRankName = (rating) => {
  if (rating >= 2400) return "Grandmaster";
  if (rating >= 2000) return "Master";
  if (rating >= 1600) return "Platinum";
  if (rating >= 1300) return "Gold";
  if (rating >= 1000) return "Silver";
  return "Bronze";
};

const pushHistory = (player, historyItem) => {
  if (!Array.isArray(player.matchHistory)) {
    player.matchHistory = [];
  }
  player.matchHistory.unshift(historyItem);
  if (player.matchHistory.length > 20) {
    player.matchHistory.pop();
  }
};

const applyResultToPlayer = async ({
  player,
  opponentId,
  batchId,
  result,
  ratingChange,
  mode,
  timeLimit,
}) => {
  if (result === "win") player.win += 1;
  else if (result === "loss") player.loss += 1;

  const reward = rewardTable[result] || rewardTable.draw;
  player.coin += reward.coin;
  player.exp += reward.exp;
  player.reward += reward.coin;

  if (ratingChange) {
    player.rating += ratingChange;
    if (player.rating < 0) player.rating = 0;
    player.rank = resolveRankName(player.rating);
  }

  pushHistory(player, {
    batchId,
    opponentId,
    mode,
    timeLimit,
    result,
    reward: reward.coin,
    ratingChange: ratingChange || 0,
    finishedAt: new Date(),
  });

  await player.save();
};

const computeRatingDelta = (playerRating, opponentRating, result) => {
  const score = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
  const expected =
    1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
  return Math.round(RATING_K * (score - expected));
};

export class MatchService {
  static async createBotMatch({ playerId, timeLimit = 5, botLevel = "normal" }) {
    const batch = await BatchService.createBatch({
      whitePlayerId: playerId,
      blackPlayerId: null,
      type: "bot",
      timeLimit,
      appliedCosmetics: {},
      currentBoard: null,
    });
    return { ...batch.toObject(), botLevel };
  }

  static async createLocalMatch({
    hostPlayerId,
    secondPlayerId = hostPlayerId,
    timeLimit = -1,
  }) {
    return BatchService.createBatch({
      whitePlayerId: hostPlayerId,
      blackPlayerId: secondPlayerId,
      type: "local",
      timeLimit,
    });
  }

  static async startMatchFromPrepRoom(room) {
    if (!room.hostPlayerId || !room.guestPlayerId) {
      throw new Error("Phòng chưa đủ người");
    }

    const whiteFirst = Math.random() >= 0.5;
    const batch = await BatchService.createBatch({
      whitePlayerId: whiteFirst ? room.hostPlayerId : room.guestPlayerId,
      blackPlayerId: whiteFirst ? room.guestPlayerId : room.hostPlayerId,
      type: room.matchType === "rank" ? "rank" : "online",
      timeLimit: room.timeLimit,
      roomId: room.roomId,
      prepRoomId: room._id,
    });

    await PrepRoom.updateOne({ _id: room._id }, { status: "full" });
    this.notifyPlayers([room.hostPlayerId, room.guestPlayerId], "match:created", {
      batchId: batch._id,
      roomId: room.roomId,
      type: batch.type,
    });

    return batch;
  }

  static async startMatchFromQueue(entryA, entryB) {
    const whiteFirst = Math.random() >= 0.5;
    const [whiteEntry, blackEntry] = whiteFirst ? [entryA, entryB] : [entryB, entryA];
    const batch = await BatchService.createBatch({
      whitePlayerId: whiteEntry.playerId,
      blackPlayerId: blackEntry.playerId,
      type: entryA.type,
      timeLimit: entryA.timeLimit || entryB.timeLimit || 10,
    });

    await QueueService.markMatched(entryA._id, batch._id);
    await QueueService.markMatched(entryB._id, batch._id);

    this.notifyPlayers(
      [entryA.playerId, entryB.playerId],
      "match:found",
      { batchId: batch._id, type: batch.type }
    );

    return batch;
  }

  static async finishMatch(batchId, { winnerId, reason }) {
    const batch = await BatchService.finishBatch(batchId, { winnerId, reason });
    const players = await Player.find({
      _id: { $in: [batch.whitePlayerId, batch.blackPlayerId].filter(Boolean) },
    });

    const whitePlayer = players.find(
      (p) => p._id.toString() === batch.whitePlayerId?.toString()
    );
    const blackPlayer = players.find(
      (p) => p._id.toString() === batch.blackPlayerId?.toString()
    );

    const mode = batch.type;

    if (whitePlayer) {
      const winnerMatches =
        winnerId && winnerId.toString() === whitePlayer._id.toString();
      const result = !winnerId ? "draw" : winnerMatches ? "win" : "loss";
      const ratingChange =
        mode === "rank" && blackPlayer
          ? computeRatingDelta(
              whitePlayer.rating,
              blackPlayer.rating,
              result
            )
          : 0;
      await applyResultToPlayer({
        player: whitePlayer,
        opponentId: blackPlayer?._id || DEFAULT_BOT_PLAYER_ID,
        batchId,
        result,
        ratingChange,
        mode,
        timeLimit: batch.timeLimit,
      });
    }

    const samePlayer =
      whitePlayer &&
      blackPlayer &&
      whitePlayer._id.toString() === blackPlayer._id.toString();

    if (blackPlayer && !samePlayer) {
      const winnerMatches =
        winnerId && winnerId.toString() === blackPlayer._id.toString();
      const result = !winnerId ? "draw" : winnerMatches ? "win" : "loss";
      const ratingChange =
        mode === "rank" && whitePlayer
          ? computeRatingDelta(
              blackPlayer.rating,
              whitePlayer.rating,
              result
            )
          : 0;
      await applyResultToPlayer({
        player: blackPlayer,
        opponentId: whitePlayer?._id || DEFAULT_BOT_PLAYER_ID,
        batchId,
        result,
        ratingChange,
        mode,
        timeLimit: batch.timeLimit,
      });
    }

    return batch;
  }

  static notifyPlayers(playerIds, event, payload) {
    try {
      const io = getIO();
      playerIds.forEach((playerId) => {
        if (!playerId) return;
        io.to(`player:${playerId.toString()}`).emit(event, payload);
      });
    } catch (err) {
      console.warn("Socket notify error:", err.message);
    }
  }
}

export default MatchService;
