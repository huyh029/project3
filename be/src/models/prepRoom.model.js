import mongoose from "mongoose";

const { Schema, model } = mongoose;

const prepRoomSchema = new Schema(
  {
    roomId: { type: String, unique: true, required: true },
    hostPlayerId: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },
    guestPlayerId: { type: Schema.Types.ObjectId, ref: "Player" },
    matchType: {
      type: String,
      enum: ["online", "rank"],
      default: "online",
    },
    timeLimit: {
      type: Number,
      enum: [-1, 1, 3, 5, 10],
      default: 10,
    },
    status: {
      type: String,
      enum: ["waiting", "full", "cancelled", "queue"],
      default: "waiting",
    },
    autoQueueAt: { type: Date },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

prepRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model("PrepRoom", prepRoomSchema);
