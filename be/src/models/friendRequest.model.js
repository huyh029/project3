import mongoose from "mongoose";

const { Schema, model } = mongoose;

const friendRequestSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    receiver: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    message: { type: String, maxlength: 200 },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

friendRequestSchema.index({ sender: 1, receiver: 1, status: 1 });

export default model("FriendRequest", friendRequestSchema);
