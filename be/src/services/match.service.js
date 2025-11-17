import mongoose from "mongoose";
import Player from "../models/player.model.js";
import QueueEntry from "../models/queueEntry.model.js";
import Batch from "../models/batch.model.js";
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

const LIVE_MATCH_TYPES = ["online", "rank"];

const summarizePlayer = (playerDoc) => {
  if (!playerDoc) return null;
  if (typeof playerDoc === "string") {
    return { id: playerDoc };
  }
  if (typeof playerDoc.toObject === "function") {
    const plain = playerDoc.toObject();
    return {
      id:
        plain._id?.toString?.() ||
        plain.id?.toString?.() ||
        (typeof plain.toString === "function" ? plain.toString() : null),
      name: plain.name || null,
      rating: plain.rating ?? null,
      rank: plain.rank || null,
    };
  }
  const id =
    playerDoc._id?.toString?.() ||
    playerDoc.id?.toString?.() ||
    (typeof playerDoc.toString === "function" ? playerDoc.toString() : null);
  return {
    id,
    name: playerDoc.name || null,
    rating: playerDoc.rating ?? null,
    rank: playerDoc.rank || null,
  };
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

    await this.emitLiveMatchUpsert(batch);
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

    await this.emitLiveMatchUpsert(batch);
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

    try {
      const io = getIO();
      [batch.whitePlayerId, batch.blackPlayerId].forEach((playerId) => {
        if (!playerId) return;
        io.to(`player:${playerId.toString()}`).emit("match:finished", {
          batchId,
          winnerId,
          reason: reason || batch.finishedReason || null,
          status: batch.status,
        });
      });

      io.to(batchId.toString()).emit("match:finished", {
        batchId,
        winnerId,
        reason: reason || batch.finishedReason || null,
        status: batch.status,
      });
    } catch (err) {
      console.warn("match:finished socket emit failed:", err.message);
    }

    if (LIVE_MATCH_TYPES.includes(batch.type)) {
      this.emitLiveMatchRemove(batch._id);
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

  static toLiveMatchPayload(batch) {
    return {
      id: batch._id?.toString?.() || batch._id,
      type: batch.type,
      status: batch.status,
      timeLimit: batch.timeLimit,
      createdAt: batch.createdAt,
      lastMoveAt: batch.lastMoveAt,
      roomId: batch.roomId || null,
      whitePlayer: summarizePlayer(batch.whitePlayerId),
      blackPlayer: summarizePlayer(batch.blackPlayerId),
    };
  }

  static async emitLiveMatchUpsert(batch) {
    if (
      !batch ||
      batch.status !== "playing" ||
      !LIVE_MATCH_TYPES.includes(batch.type)
    ) {
      return;
    }
    const populated =
      typeof batch.populate === "function"
        ? await batch
            .populate("whitePlayerId", "name rating rank")
            .populate("blackPlayerId", "name rating rank")
        : batch;
    try {
      const io = getIO();
      io.emit("live:match-upsert", {
        match: this.toLiveMatchPayload(populated),
      });
    } catch (err) {
      console.warn("live match upsert emit failed:", err.message);
    }
  }

  static emitLiveMatchRemove(batchId) {
    if (!batchId) return;
    try {
      const io = getIO();
      io.emit("live:match-remove", {
        batchId: batchId.toString(),
      });
    } catch (err) {
      console.warn("live match remove emit failed:", err.message);
    }
  }

  static async getLiveMatches() {
    const liveMatches = await Batch.find({
      status: "playing",
      type: { $in: LIVE_MATCH_TYPES },
    })
      .populate("whitePlayerId", "name rating rank")
      .populate("blackPlayerId", "name rating rank")
      .sort({ createdAt: -1 })
      .limit(30);
    return liveMatches.map((match) => this.toLiveMatchPayload(match));
  }

  static async getHistory(playerId, { page = 1, limit = 10 } = {}) {
    if (!playerId) {
      throw new Error("Thiếu thông tin người chơi");
    }

    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

    const player = await Player.findById(playerId)
      .select("matchHistory")
      .populate({
        path: "matchHistory.opponentId",
        select: "name rating rank",
      })
      .populate({
        path: "matchHistory.batchId",
        select:
          "type timeLimit status createdAt updatedAt finishedReason winnerId whitePlayerId blackPlayerId",
      });

    if (!player) {
      throw new Error("Không tìm thấy người chơi");
    }

    const total = player.matchHistory?.length || 0;
    const start = (safePage - 1) * safeLimit;
    const paged = (player.matchHistory || []).slice(start, start + safeLimit);
    const playerIdStr = playerId.toString();

    const history = paged.map((entry) => {
      const batchDoc = entry.batchId;
      const opponentDoc = entry.opponentId;

      const opponent =
        opponentDoc && opponentDoc._id
          ? {
              id: opponentDoc._id.toString(),
              name: opponentDoc.name,
              rating: opponentDoc.rating,
              rank: opponentDoc.rank,
            }
          : opponentDoc
          ? { id: opponentDoc.toString() }
          : null;

      let color = null;
      if (batchDoc?.whitePlayerId) {
        if (batchDoc.whitePlayerId.toString() === playerIdStr) {
          color = "white";
        } else if (
          batchDoc.blackPlayerId &&
          batchDoc.blackPlayerId.toString() === playerIdStr
        ) {
          color = "black";
        }
      }

      return {
        batchId: batchDoc?._id?.toString() || batchDoc?.toString() || null,
        opponent,
        result: entry.result,
        mode: entry.mode,
        timeLimit: entry.timeLimit,
        reward: entry.reward,
        ratingChange: entry.ratingChange,
        finishedAt: entry.finishedAt,
        status: batchDoc?.status || null,
        finishedReason: batchDoc?.finishedReason || null,
        winnerId: batchDoc?.winnerId?.toString() || null,
        color,
      };
    });

    return {
      total,
      page: safePage,
      limit: safeLimit,
      history,
    };
  }

  static async getMatchDetail(batchId, viewerId) {
    if (!batchId) {
      throw new Error("Thiếu batchId");
    }

    const batch = await Batch.findById(batchId)
      .populate("whitePlayerId", "name rating rank email")
      .populate("blackPlayerId", "name rating rank email");

    if (!batch) {
      throw new Error("Không tìm thấy trận đấu");
    }

    const toPlayerSummary = (playerDoc) => {
      if (!playerDoc) return null;
      return {
        id: playerDoc._id?.toString?.() || playerDoc.toString(),
        name: playerDoc.name,
        rating: playerDoc.rating,
        rank: playerDoc.rank,
        email: playerDoc.email,
      };
    };

    const viewerRole = (() => {
      if (!viewerId) return null;
      if (batch.whitePlayerId && batch.whitePlayerId._id?.toString() === viewerId) {
        return "white";
      }
      if (batch.blackPlayerId && batch.blackPlayerId._id?.toString() === viewerId) {
        return "black";
      }
      return "spectator";
    })();

    return {
      id: batch._id.toString(),
      type: batch.type,
      status: batch.status,
      timeLimit: batch.timeLimit,
      roomId: batch.roomId,
      prepRoomId: batch.prepRoomId,
      currentTurn: batch.currentTurn,
      lastMoveAt: batch.lastMoveAt,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
      winnerId: batch.winnerId?.toString() || null,
      finishedReason: batch.finishedReason || null,
      remainingWhite: batch.remainingWhite,
      remainingBlack: batch.remainingBlack,
      whitePlayer: toPlayerSummary(batch.whitePlayerId),
      blackPlayer: toPlayerSummary(batch.blackPlayerId),
      currentBoard: batch.currentBoard,
      appliedCosmetics: batch.appliedCosmetics,
      moves: (batch.moves || []).map((move) => ({
        moveNumber: move.moveNumber,
        color: move.color,
        piece: move.piece,
        captured: move.captured,
        from: move.from,
        to: move.to,
        notation: move.notation,
        timestamp: move.timestamp,
      })),
      viewerRole,
    };
  }
}

export default MatchService;
