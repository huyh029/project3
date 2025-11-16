import express from "express";
import { AuthController } from "../controllers/auth.controller.js";

const router = express.Router();

// Đăng ký
router.post("/register", AuthController.register);

// Đăng nhập
router.post("/login", AuthController.login);

// Kiểm tra token (tùy chọn)
router.get("/verify", AuthController.verifyToken);

export default router;
