import Batch from "../models/batch.model.js";
import MatchService from "./match.service.js";

const WATCH_INTERVAL_MS = 15000;
const SAFETY_BUFFER_MS = 5000;

let watcherHandle = null;

const getReferenceTime = (batch) => {
  if (batch.lastMoveAt) return new Date(batch.lastMoveAt);
  if (batch.createdAt) return new Date(batch.createdAt);
  return null;
};

const evaluateBatchTimeout = async (batch) => {
  if (!batch || !batch.timeLimit || batch.timeLimit < 0) return;
  const reference = getReferenceTime(batch);
  if (!reference) return;
  const limitMs = batch.timeLimit * 60 * 1000;
  const elapsed = Date.now() - reference.getTime();
  if (elapsed + SAFETY_BUFFER_MS < limitMs) return;

  let winnerId = null;
  if (batch.currentTurn === "white" && batch.blackPlayerId) {
    winnerId = batch.blackPlayerId.toString();
  } else if (batch.currentTurn === "black" && batch.whitePlayerId) {
    winnerId = batch.whitePlayerId.toString();
  }

  await MatchService.finishMatch(batch._id, {
    winnerId,
    reason: "timeout_auto",
  });
};

const scanForTimeouts = async () => {
  const activeMatches = await Batch.find({
    status: "playing",
    timeLimit: { $gt: 0 },
  }).select(
    "_id timeLimit currentTurn lastMoveAt createdAt whitePlayerId blackPlayerId"
  );

  for (const match of activeMatches) {
    try {
      await evaluateBatchTimeout(match);
    } catch (err) {
      console.warn("Auto-timeout evaluation failed:", err.message);
    }
  }
};

export const startMatchTimeoutWatcher = () => {
  if (watcherHandle) return;
  watcherHandle = setInterval(() => {
    scanForTimeouts().catch((err) => {
      console.error("Match timeout watcher error:", err.message);
    });
  }, WATCH_INTERVAL_MS);
};

export const stopMatchTimeoutWatcher = () => {
  if (watcherHandle) {
    clearInterval(watcherHandle);
    watcherHandle = null;
  }
};

export default startMatchTimeoutWatcher;
