import express from "express";
import { MatchController } from "../controllers/match.controller.js";
import authMiddleware from "../middlewares/auth.js";

const router = express.Router();

router.post("/bot", authMiddleware, MatchController.createBotMatch);
router.post("/local", authMiddleware, MatchController.createLocalMatch);
router.post("/:batchId/finish", authMiddleware, MatchController.finishMatch);
router.get("/:batchId", authMiddleware, MatchController.getMatch);

export default router;
