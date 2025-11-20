import express from "express";
import authRoutes from "./auth.routes.js";
import batchRoutes from "./batch.routes.js";
import matchRoutes from "./match.routes.js";
import roomRoutes from "./room.routes.js";
import queueRoutes from "./queue.routes.js";
import leaderboardRoutes from "./leaderboard.routes.js";
import friendRoutes from "./friend.routes.js";
import playerRoutes from "./player.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/batch", batchRoutes);
router.use("/matches", matchRoutes);
router.use("/rooms", roomRoutes);
router.use("/queue", queueRoutes);
router.use("/leaderboard", leaderboardRoutes);
router.use("/friends", friendRoutes);
router.use("/players", playerRoutes);

export default router;
