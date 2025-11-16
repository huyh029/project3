import express from "express";
import { RoomController } from "../controllers/room.controller.js";
import authMiddleware from "../middlewares/auth.js";

const router = express.Router();

router.post("/prep", authMiddleware, RoomController.create);
router.post("/prep/:roomId/join", authMiddleware, RoomController.join);
router.post("/prep/:roomId/cancel", authMiddleware, RoomController.cancel);
router.get("/prep/:roomId", authMiddleware, RoomController.detail);

export default router;
