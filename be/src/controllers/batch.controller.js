import { BatchService } from "../services/batch.service.js";
import { getIO } from "../socket/index.js";

const toPositionObject = (value, fallbackRow, fallbackCol) => {
  if (value || value === 0) {
    return value;
  }
  if (
    typeof fallbackRow === "number" &&
    Number.isFinite(fallbackRow) &&
    typeof fallbackCol === "number" &&
    Number.isFinite(fallbackCol)
  ) {
    return { row: fallbackRow, col: fallbackCol };
  }
  return undefined;
};

export const addMoveController = async (req, res) => {
  try {
    const {
      batchId,
      from,
      to,
      fromRow,
      fromCol,
      toRow,
      toCol,
      piece,
      captured,
      moveNumber,
      color,
    } = req.body;

    if (!batchId || !piece || !color) {
      return res.status(400).json({
        success: false,
        message: "batchId, piece, color là bắt buộc",
      });
    }

    const playerId = req.user?.id;
    if (!playerId) {
      return res.status(401).json({
        success: false,
        message: "Không xác thực được người chơi",
      });
    }

    const movePayload = {
      moveNumber,
      color,
      piece,
      captured,
      from: toPositionObject(from, fromRow, fromCol),
      to: toPositionObject(to, toRow, toCol),
    };

    const batch = await BatchService.addMove(batchId, movePayload, playerId);

    try {
      const io = getIO();
      const latestMove = batch.moves[batch.moves.length - 1];
      io.to(batchId.toString()).emit("batch:move", {
        batchId,
        move: latestMove,
        moves: batch.moves,
        currentTurn: batch.currentTurn,
      });
    } catch (socketErr) {
      console.warn("Socket broadcast failed (addMove):", socketErr.message);
    }

    res.json({ success: true, batch });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getMoveController = async (req, res) => {
  try {
    const { batchId } = req.body;
    if (!batchId) {
      return res
        .status(400)
        .json({ success: false, message: "batchId là bắt buộc" });
    }

    const batch = await BatchService.getBatchById(batchId);
    if (!batch) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy batch" });
    }

    const length = batch.moves.length;
    if (length === 0) {
      return res.json({ success: true, move: null, message: "Chưa có nước đi" });
    }

    const move = batch.moves[length - 1];
    return res.json({ success: true, move });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const createBatchController = async (req, res) => {
  try {
    const { whitePlayerId, blackPlayerId, type, timeLimit, roomId } = req.body;
    if (!whitePlayerId || (!blackPlayerId && type !== "bot")) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin người chơi",
      });
    }

    const createdBatch = await BatchService.createBatch({
      whitePlayerId,
      blackPlayerId,
      type,
      timeLimit,
      roomId,
    });

    try {
      const io = getIO();
      io.emit("batch:created", { batch: createdBatch });
    } catch (socketErr) {
      console.warn("Socket broadcast failed (createBatch):", socketErr.message);
    }

    res.status(201).json({ success: true, batch: createdBatch });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
