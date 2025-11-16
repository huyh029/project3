import PrepRoom from "../models/prepRoom.model.js";
import { QueueService } from "./queue.service.js";
import MatchService from "./match.service.js";
import RoomService from "./room.service.js";

const LOOP_INTERVAL_MS = 4000;
const RANK_DIFF_BASE = 50;
const RANK_DIFF_GROWTH_PER_SECOND = 20;

let loopHandle = null;

const pairEntries = async (entries) => {
  const pairs = [];
  while (entries.length >= 2) {
    const first = entries.shift();
    const second = entries.shift();
    if (!first || !second) break;
    pairs.push([first, second]);
  }
  for (const [a, b] of pairs) {
    await MatchService.startMatchFromQueue(a, b);
  }
};

const pairRankEntries = async (entries) => {
  const usedIds = new Set();
  const now = Date.now();

  for (let i = 0; i < entries.length; i += 1) {
    const current = entries[i];
    if (!current || usedIds.has(current._id.toString())) continue;

    const waitSeconds = (now - new Date(current.createdAt).getTime()) / 1000;
    const dynamicThreshold = RANK_DIFF_BASE + waitSeconds * RANK_DIFF_GROWTH_PER_SECOND;

    let bestCandidate = null;
    let bestDiff = Infinity;

    for (let j = i + 1; j < entries.length; j += 1) {
      const candidate = entries[j];
      if (!candidate || usedIds.has(candidate._id.toString())) continue;
      const diff = Math.abs(current.rankSnapshot - candidate.rankSnapshot);
      if (diff <= dynamicThreshold && diff < bestDiff) {
        bestDiff = diff;
        bestCandidate = candidate;
      }
    }

    if (bestCandidate) {
      usedIds.add(current._id.toString());
      usedIds.add(bestCandidate._id.toString());
      await MatchService.startMatchFromQueue(current, bestCandidate);
    }
  }
};

const processQueueType = async (type) => {
  const entries = await QueueService.fetchWaiting(type);
  if (!entries.length) return;
  if (type === "rank") {
    await pairRankEntries(entries);
  } else {
    await pairEntries(entries);
  }
};

const processPrepRooms = async () => {
  const now = new Date();
  const candidates = await PrepRoom.find({
    status: "waiting",
    autoQueueAt: { $lte: now },
  });

  for (const room of candidates) {
    try {
      await QueueService.enqueue(room.hostPlayerId, {
        type: "online",
        timeLimit: room.timeLimit,
        metadata: { fromRoomId: room.roomId },
      });
      await RoomService.markQueued(room.roomId);
    } catch (err) {
      console.warn("Không thể đưa phòng vào hàng chờ:", err.message);
    }
  }
};

export const startMatchmakingLoop = () => {
  if (loopHandle) return;

  loopHandle = setInterval(async () => {
    try {
      await processPrepRooms();
      await processQueueType("online");
      await processQueueType("rank");
    } catch (err) {
      console.error("Matchmaking loop error:", err.message);
    }
  }, LOOP_INTERVAL_MS);
};

export const stopMatchmakingLoop = () => {
  if (loopHandle) {
    clearInterval(loopHandle);
    loopHandle = null;
  }
};

export default startMatchmakingLoop;
