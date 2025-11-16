import express from "express";
import { LeaderboardController } from "../controllers/leaderboard.controller.js";
import authMiddleware from "../middlewares/auth.js";

const router = express.Router();

router.get("/", authMiddleware, LeaderboardController.getLeaderboard);

export default router;
