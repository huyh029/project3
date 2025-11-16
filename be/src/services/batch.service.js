import Batch from "../models/batch.model.js";

const MATCH_TIME_TO_SECONDS = {
  "-1": null,
  1: 60,
  3: 180,
  5: 300,
  10: 600,
};

const normalizePosition = (position, label) => {
  if (!position && position !== 0) {
    throw new Error(`Missing ${label} position`);
  }

  const ensureNumber = (value) =>
    typeof value === "number" && Number.isFinite(value) ? value : undefined;

  if (typeof position === "string") {
    const algebraic = /^[a-h][1-8]$/i.exec(position.trim());
    if (!algebraic) {
      throw new Error(`Invalid ${label} algebraic notation`);
    }
    return {
      col: position.toLowerCase().charCodeAt(0) - "a".charCodeAt(0),
      row: 8 - parseInt(position[1], 10),
    };
  }

  if (typeof position === "object") {
    const row =
      ensureNumber(position.row) ??
      ensureNumber(position.r) ??
      ensureNumber(position.rowIndex);
    const col =
      ensureNumber(position.col) ??
      ensureNumber(position.c) ??
      ensureNumber(position.colIndex);
    if (row === undefined || col === undefined) {
      throw new Error(`Invalid ${label} position payload`);
    }
    return { row, col };
  }

  throw new Error(`Invalid ${label} position value`);
};

const resolveInitialClock = (timeLimit) => {
  if (timeLimit === undefined || timeLimit === null) {
    return MATCH_TIME_TO_SECONDS["10"];
  }
  const seconds = MATCH_TIME_TO_SECONDS[timeLimit];
  return seconds ?? null;
};

export const BatchService = {
  async createBatch({
    whitePlayerId,
    blackPlayerId,
    type = "rank",
    timeLimit = 10,
    roomId,
    prepRoomId,
    appliedCosmetics = {},
    currentBoard = null,
  }) {
    const clock = resolveInitialClock(timeLimit);
    return Batch.create({
      whitePlayerId,
      blackPlayerId,
      type,
      timeLimit,
      remainingWhite: clock,
      remainingBlack: clock,
      roomId,
      prepRoomId,
      currentBoard,
      appliedCosmetics: {
        board: appliedCosmetics.board || "classic",
        piece: appliedCosmetics.piece || "classic",
        effect: appliedCosmetics.effect || "none",
      },
    });
  },

  async getBatchById(batchId) {
    return Batch.findById(batchId);
  },

  async addMove(batchId, move, playerId) {
    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new Error("Batch not found");
    }

    if (batch.status !== "playing") {
      throw new Error("Trận đấu đã kết thúc");
    }

    if (!batch.blackPlayerId && batch.type !== "bot") {
      throw new Error("Thiếu người chơi thứ hai");
    }

    const singleController = ["bot", "local"].includes(batch.type);

    if (!singleController) {
      const expectedPlayerId =
        batch.currentTurn === "white"
          ? batch.whitePlayerId?.toString()
          : batch.blackPlayerId?.toString();

      if (playerId !== expectedPlayerId) {
        throw new Error("Chưa tới lượt của bạn");
      }
    }

    if (!move?.piece || !["white", "black"].includes(move.color)) {
      throw new Error("Nước đi phải có quân cờ và màu");
    }

    const from = normalizePosition(
      move.from ?? move.fromPosition ?? move.fromAlgebraic,
      "from"
    );
    const to = normalizePosition(
      move.to ?? move.toPosition ?? move.toAlgebraic,
      "to"
    );

    batch.moves.push({
      moveNumber:
        typeof move.moveNumber === "number"
          ? move.moveNumber
          : batch.moves.length + 1,
      color: move.color,
      piece: move.piece,
      captured: move.captured || null,
      notation: move.notation,
      from,
      to,
    });

    batch.lastMoveAt = new Date();
    batch.currentTurn = batch.currentTurn === "white" ? "black" : "white";

    await batch.save();
    return batch;
  },

  async updateBoardState(batchId, payload) {
    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new Error("Batch not found");
    }
    if (payload.currentBoard !== undefined) {
      batch.currentBoard = payload.currentBoard;
    }
    if (payload.currentTurn) {
      batch.currentTurn = payload.currentTurn;
    }
    if (typeof payload.remainingWhite === "number") {
      batch.remainingWhite = payload.remainingWhite;
    }
    if (typeof payload.remainingBlack === "number") {
      batch.remainingBlack = payload.remainingBlack;
    }
    batch.lastMoveAt = new Date();
    await batch.save();
    return batch;
  },

  async finishBatch(batchId, { winnerId, reason }) {
    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new Error("Batch not found");
    }
    if (batch.status === "finished") {
      return batch;
    }
    batch.status = "finished";
    batch.winnerId = winnerId || null;
    batch.finishedReason = reason || "finished";
    batch.lastMoveAt = new Date();
    await batch.save();
    return batch;
  },
};

export default BatchService;
