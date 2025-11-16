import express from "express";
import { addMoveController, createBatchController,getMoveController } from "../controllers/batch.controller.js";
import  authMiddleware  from "../middlewares/auth.js";

const router = express.Router();

router.post("/create", authMiddleware, createBatchController); // Tạo trận đấu
router.post("/add-move", authMiddleware, addMoveController); // Thêm nước đi
router.post("/get-move", authMiddleware, getMoveController); // Lý dụng nước đit("/get-move", authMiddleware, getMoveController);

export default router;
