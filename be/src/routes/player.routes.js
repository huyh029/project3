import express from "express";
import authMiddleware from "../middlewares/auth.js";
import PlayerController from "../controllers/player.controller.js";

const router = express.Router();

router.get("/me", authMiddleware, PlayerController.getProfile);

export default router;
