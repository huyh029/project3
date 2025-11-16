import express from "express";
import { QueueController } from "../controllers/queue.controller.js";
import authMiddleware from "../middlewares/auth.js";

const router = express.Router();

router.post("/", authMiddleware, QueueController.enqueue);
router.delete("/:entryId", authMiddleware, QueueController.cancel);
router.get("/:entryId", authMiddleware, QueueController.status);

export default router;
