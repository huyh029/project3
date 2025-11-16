import mongoose from "mongoose";

const { Schema, model } = mongoose;

const queueEntrySchema = new Schema(
  {
    playerId: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    type: { type: String, enum: ["online", "rank"], required: true },
    timeLimit: {
      type: Number,
      enum: [-1, 1, 3, 5, 10],
      default: 10,
    },
    status: {
      type: String,
      enum: ["waiting", "matched", "cancelled"],
      default: "waiting",
    },
    matchedBatchId: { type: Schema.Types.ObjectId, ref: "Batch" },
    rankSnapshot: { type: Number, default: 1200 },
    winRateSnapshot: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export default model("QueueEntry", queueEntrySchema);
