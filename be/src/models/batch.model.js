import mongoose from "mongoose";

const { Schema, model } = mongoose;

const positionSchema = new Schema(
  {
    row: { type: Number, required: true },
    col: { type: Number, required: true },
  },
  { _id: false }
);

const moveSchema = new Schema(
  {
    moveNumber: { type: Number, required: true },
    color: { type: String, enum: ["white", "black"], required: true },
    piece: { type: String, required: true },
    captured: { type: String, default: null },
    from: { type: positionSchema, required: true },
    to: { type: positionSchema, required: true },
    notation: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const batchSchema = new Schema(
  {
    whitePlayerId: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },
    blackPlayerId: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: function requiredBlack() {
        return this.type !== "bot";
      },
    },
    roomId: { type: String },
    prepRoomId: { type: Schema.Types.ObjectId, ref: "PrepRoom" },
    type: {
      type: String,
      enum: ["rank", "online", "bot", "local"],
      default: "rank",
    },
    timeLimit: {
      type: Number,
      enum: [-1, 1, 3, 5, 10],
      default: 10,
    },
    remainingWhite: { type: Number, default: null },
    remainingBlack: { type: Number, default: null },
    status: {
      type: String,
      enum: ["playing", "finished"],
      default: "playing",
    },
    winnerId: { type: Schema.Types.ObjectId, ref: "Player" },
    finishedReason: { type: String },
    moves: [moveSchema],
    currentTurn: {
      type: String,
      enum: ["white", "black"],
      default: "white",
    },
    currentBoard: { type: Schema.Types.Mixed, default: null },
    appliedCosmetics: {
      board: { type: String, default: "classic" },
      piece: { type: String, default: "classic" },
      effect: { type: String, default: "none" },
    },
    lastMoveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default model("Batch", batchSchema);
