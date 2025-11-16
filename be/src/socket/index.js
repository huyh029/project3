import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let ioInstance = null;
const batchStates = new Map();
const playerSocketMap = new Map();
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

const cloneState = (state = {}) => ({
  board: Array.isArray(state.board) ? state.board.map(row => [...row]) : [],
  turn: state.turn || "white",
  whiteKingMoved: Boolean(state.whiteKingMoved),
  blackKingMoved: Boolean(state.blackKingMoved),
  whiteRookAMoved: Boolean(state.whiteRookAMoved),
  whiteRookHMoved: Boolean(state.whiteRookHMoved),
  blackRookAMoved: Boolean(state.blackRookAMoved),
  blackRookHMoved: Boolean(state.blackRookHMoved),
});

const persistState = (batchId, state) => {
  if (!batchId || !state) return;
  batchStates.set(batchId, cloneState(state));
};

export const initSocket = httpServer => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  ioInstance.on("connection", socket => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("joinBatch", batchId => {
      if (!batchId) return;
      socket.join(batchId);
      const latestState = batchStates.get(batchId);
      if (latestState) {
        socket.emit("batch:state", latestState);
      }
    });

    socket.on("leaveBatch", batchId => {
      if (!batchId) return;
      socket.leave(batchId);
    });

    socket.on("registerPlayer", token => {
      try {
        if (!token) {
          throw new Error("missing token");
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        const playerRoom = `player:${decoded.id}`;
        socket.join(playerRoom);
        playerSocketMap.set(socket.id, playerRoom);
        socket.emit("player:registered", { playerId: decoded.id });
      } catch (authErr) {
        socket.emit("player:register_error", { message: authErr.message });
      }
    });

    socket.on("client:state", payload => {
      const { batchId, state, meta = {} } = payload || {};
      if (!batchId || !state) return;

      persistState(batchId, state);
      socket.to(batchId).emit("batch:state", cloneState(state));
      if (meta && meta.type) {
        socket.to(batchId).emit("batch:event", meta);
      }
    });

    socket.on("client:reset", payload => {
      const { batchId } = payload || {};
      if (!batchId) return;
      batchStates.delete(batchId);
      socket.to(batchId).emit("batch:reset");
    });

    socket.on("disconnect", reason => {
      console.log(`Socket ${socket.id} disconnected: ${reason}`);
      playerSocketMap.delete(socket.id);
    });
  });

  return ioInstance;
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.io is not initialized yet");
  }
  return ioInstance;
};
